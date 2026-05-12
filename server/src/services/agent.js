const Groq = require('groq-sdk');
const { groqApiKey, baseUrl } = require('../config');
const User = require('../db/models/User');
const Order = require('../db/models/Order');
const Item = require('../db/models/Item');
const { sendMessage } = require('./whatsapp');

const groq = new Groq({ apiKey: groqApiKey });

const SYSTEM_PROMPT = `You are a friendly WhatsApp shopping assistant. Keep all replies short and conversational — like a helpful friend, not a form.

At the start of each message you will see the user's current order. Each line shows: name, quantity, and [id: <itemId>].
Some messages may be the start of a new conversation and won't have an order listed.

TOOL RULES — follow these exactly:
1. User mentions a new item → call search_items.
2. User wants to remove, delete, or replace an item → you MUST call remove_item with the itemId from the current order. Do not skip this.
3. User is correcting a wrong item (e.g. "not carrots, oats") → call remove_item for the wrong item, then call search_items for the correct one.

search_items results:
- 1 result: add silently (no message).
- Multiple: short clarifying question e.g. "White or brown bread?"
- None: natural reply e.g. "Couldn't find that — try a different name?"

For greetings or off-topic messages reply briefly e.g. "Hey! What are we shopping for today?"

When done respond ONLY with valid JSON (no text outside it):
{
  "items": [
    { "id": "<_id>", "name": "", "store": "", "price": 0, "variant": { "brand": "", "size": "", "unit": "" }, "quantity": 1 }
  ],
  "message": ""
}

Leave message as "" when items were found without ambiguity.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_items',
      description: 'Search the product catalog for items by name, brand, size, or tags.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Item name, brand, or description to search for' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_item',
      description: 'Remove an item from the current order by its id.',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The id of the item to remove' },
        },
        required: ['itemId'],
      },
    },
  },
];

async function searchItems(query) {
  // Primary: MongoDB text index (tokenised, no substring matches)
  const textResults = await Item.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } }).limit(5).lean();

  if (textResults.length) return textResults;

  // Fallback: whole-word regex so "ots" won't match "carrots"
  const re = new RegExp(`\\b${query}\\b`, 'i');
  return Item.find({
    $or: [
      { name: re },
      { 'variant.brand': re },
      { tags: { $in: [re] } },
    ],
  }).limit(5).lean();
}

async function runAgentLoop(messages) {
  const removedIds = [];

  for (let i = 0; i < 10; i++) {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: TOOLS,
      tool_choice: 'auto'
    });
    console.log('LLM response:', JSON.stringify(completion, null, 2));
    const choice = completion.choices[0];

    if (choice.finish_reason === 'tool_calls') {
      messages.push({
        role: 'assistant',
        content: choice.message.content ?? null,
        tool_calls: choice.message.tool_calls,
      });
      for (const call of choice.message.tool_calls) {
        let result;
        if (call.function.name === 'search_items') {
          const { query } = JSON.parse(call.function.arguments);
          result = await searchItems(query);
        } else if (call.function.name === 'remove_item') {
          const { itemId } = JSON.parse(call.function.arguments);
          removedIds.push(itemId);
          result = { removed: itemId };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
    } else {
      messages.push({ role: 'assistant', content: choice.message.content });
      try {
        return { ...JSON.parse(choice.message.content), removedIds };
      } catch {
        return { items: [], message: choice.message.content, removedIds };
      }
    }
  }
  throw new Error('Agent loop exceeded max iterations');
}

function formatOrder(orderItems) {
  if (!orderItems.length) return null;

  let total = 0;
  const lines = orderItems.map(({ item, quantity }) => {
    const variantParts = [item.variant?.brand, item.variant?.size, item.variant?.unit].filter(Boolean);
    const variant = variantParts.length ? ` (${variantParts.join(', ')})` : '';
    const store = item.store ? ` @ ${item.store}` : '';
    const lineTotal = (item.price ?? 0) * quantity;
    total += lineTotal;
    const priceStr = item.price != null
      ? (quantity > 1 ? `KES ${item.price} x${quantity} = KES ${lineTotal}` : `KES ${item.price}`)
      : 'Price TBD';
    return `- ${item.name}${variant}${store}: ${priceStr}`;
  });

  return `Your order:\n${lines.join('\n')}\n\nTotal: KES ${total}`;
}

async function processMessage(to, phoneNumber, text) {
  const user = await User.findOneAndUpdate(
    { waId: to },
    { waId: to, ...(phoneNumber && { phoneNumber }) },
    { upsert: true, new: true }
  );

  let order = await Order.findOne({ user: user._id, status: 'active' });
  if (!order) order = await Order.create({ user: user._id });

  // Populate current order so the LLM can reference item ids for removal
  const populated = await Order.findById(order._id).populate('items.item');
  const currentOrder = populated.items
    .filter(i => i.item)
    .map(i => `- [id: ${i.item._id}] ${i.item.name}${i.item.variant?.brand ? ` (${i.item.variant.brand})` : ''} x${i.quantity}`);

  const userContent = currentOrder.length
    ? `Current order:\n${currentOrder.join('\n')}\n\nMessage: ${text}`
    : text;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...order.history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userContent },
  ];

  const { items: resolvedItems, removedIds, message: reply } = await runAgentLoop(messages);

  if (removedIds?.length) {
    order.items = order.items.filter(i => !removedIds.includes(i.item.toString()));
  }

  for (const resolved of resolvedItems ?? []) {
    const existing = order.items.find(i => i.item.toString() === resolved.id);
    if (existing) {
      existing.quantity = resolved.quantity ?? 1;
    } else {
      order.items.push({ item: resolved.id, quantity: resolved.quantity ?? 1 });
    }
  }

  // Store only the bare user text in history (not the injected order context)
  order.history.push({ role: 'user', content: text });
  order.history.push({ role: 'assistant', content: JSON.stringify({ items: resolvedItems, removedIds, message: reply }) });
  await order.save();

  const refreshed = await Order.findById(order._id).populate('items.item');
  const orderText = formatOrder(refreshed.items.filter(i => i.item));
  const clearUrl = `${baseUrl}/clear/${order._id}`;
  const links = `Finish Shopping: https://leta.app/finish\nClear Order: ${clearUrl}`;

  return [orderText, reply, links].filter(Boolean).join('\n\n');
}

async function handleMessage(to, phoneNumber, text) {
  const reply = await processMessage(to, phoneNumber, text);
  await sendMessage(to, reply);
}

module.exports = { handleMessage, processMessage };

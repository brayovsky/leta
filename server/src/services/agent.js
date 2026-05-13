const crypto = require('crypto');
const OpenAI = require('openai');
const { Types } = require('mongoose');
const { openaiApiKey, baseUrl, usePreferences, logLlm } = require('../config');
const LlmLogger = require('../utils/llmLogger');
const User = require('../db/models/User');
const Order = require('../db/models/Order');
const Item = require('../db/models/Item');
const Preference = require('../db/models/Preference');
const { sendMessage } = require('./whatsapp');

const openai = new OpenAI({ apiKey: openaiApiKey });

const SYSTEM_PROMPT = `You are a friendly WhatsApp shopping assistant. Your job is to understand exactly what the customer wants and build their shopping list.

Keep replies short and conversational — like a helpful friend, not a form.

When the customer has an active order, the top of their message will show:

Current order:
- [id: <itemId>] Name (Brand) x<quantity>

Message: <their text>

Only add an item once you are certain it is what the customer wants. If a search returns multiple options, ask a short clarifying question and wait for their answer before adding anything. Keep clarifying until you can pick the right one with confidence.
${usePreferences ? '\nWhen a customer picks a specific variant after a clarifying question, save their preference so it is automatic next time.\n' : ''}
For greetings, ask what they would like to shop for.
For anything unrelated to shopping, reply only: "I can only help with your shopping list."

Respond ONLY with valid JSON (no text outside it):
{
  "items": [
    { "id": "507f1f77bcf86cd799439011", "name": "", "store": "", "price": 0, "variant": { "brand": "", "size": "", "unit": "" }, "quantity": 1 }
  ],
  "message": ""
}

CRITICAL: The "id" field must ALWAYS be copied verbatim from a search_items result. Never invent or guess an id.
Leave message as "" when items were added without ambiguity.`;

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
      description: 'Remove an item from the current order.',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The id of the item to remove' },
        },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_item',
      description: 'Update the quantity of an existing item in the order.',
      parameters: {
        type: 'object',
        properties: {
          itemId:   { type: 'string',  description: 'The id of the item to update' },
          quantity: { type: 'number',  description: 'The new quantity' },
        },
        required: ['itemId', 'quantity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_item',
      description: 'Remove a wrong item and search for the correct one in a single call.',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The id of the item to remove' },
          query:  { type: 'string', description: 'Search query for the replacement item' },
        },
        required: ['itemId', 'query'],
      },
    },
  },
  ...(usePreferences ? [{
    type: 'function',
    function: {
      name: 'save_preference',
      description: 'Save the user\'s preferred variant for a generic item name (e.g. "bread" → specific item id).',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string', description: 'The generic item name (e.g. "bread", "milk")' },
          itemId:   { type: 'string', description: 'The _id of the chosen item' },
        },
        required: ['itemName', 'itemId'],
      },
    },
  }] : []),
];

function filterByTokens(items, query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (tokens.length <= 1) return items;

  const scored = items.map(item => {
    const haystack = [
      item.name,
      item.store,
      item.variant?.brand,
      item.variant?.size,
      item.variant?.unit,
      ...(item.tags ?? []),
    ].filter(Boolean).join(' ').toLowerCase();

    const matchCount = tokens.filter(t => haystack.includes(t)).length;
    return { item, matchCount };
  });

  const maxMatches = Math.max(...scored.map(s => s.matchCount));
  return scored.filter(s => s.matchCount === maxMatches).map(s => s.item);
}

async function searchItems(query, userId) {
  if (usePreferences && userId) {
    const pref = await Preference.findOne({ user: userId, itemName: query.toLowerCase() }).populate('item').lean();
    if (pref?.item) return [pref.item];
  }

  // Primary: MongoDB text index across name, brand, store, size, unit, tags
  const textResults = await Item.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } }).limit(10).lean();

  if (textResults.length) return filterByTokens(textResults, query);

  // Fallback: per-token word-boundary regex across all fields
  const tokens = query.split(/\s+/).filter(Boolean);
  const conditions = tokens.flatMap(token => {
    const re = new RegExp(`\\b${token}\\b`, 'i');
    return [
      { name: re },
      { 'variant.brand': re },
      { 'variant.size': re },
      { 'variant.unit': re },
      { store: re },
      { tags: re },
    ];
  });
  const fallback = await Item.find({ $or: conditions }).limit(10).lean();
  return filterByTokens(fallback, query);
}

async function runAgentLoop(messages, userId, logger) {
  const removedIds = [];
  const updatedItems = [];
  const savedPreferences = [];

  for (let i = 0; i < 10; i++) {
    const sentMessages = logger ? [...messages] : null;
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    });
    const choice = completion.choices[0];

    if (choice.finish_reason === 'tool_calls') {
      messages.push({
        role: 'assistant',
        content: choice.message.content ?? null,
        tool_calls: choice.message.tool_calls,
      });
      const callLog = [];
      for (const call of choice.message.tool_calls) {
        const args = JSON.parse(call.function.arguments);
        let result;
        switch (call.function.name) {
          case 'search_items':
            result = await searchItems(args.query, userId);
            break;
          case 'remove_item':
            removedIds.push(args.itemId);
            result = { removed: args.itemId };
            break;
          case 'update_item':
            updatedItems.push({ itemId: args.itemId, quantity: args.quantity });
            result = { updated: args.itemId, quantity: args.quantity };
            break;
          case 'replace_item':
            removedIds.push(args.itemId);
            result = await searchItems(args.query, userId);
            break;
          case 'save_preference':
            if (usePreferences) savedPreferences.push({ itemName: args.itemName.toLowerCase(), itemId: args.itemId });
            result = { saved: true };
            break;
        }
        callLog.push({ name: call.function.name, args, result });
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      logger?.iteration(i + 1, sentMessages, choice, callLog);
    } else {
      logger?.iteration(i + 1, sentMessages, choice, []);
      messages.push({ role: 'assistant', content: choice.message.content });
      try {
        return { ...JSON.parse(choice.message.content), removedIds, updatedItems, savedPreferences };
      } catch {
        return { items: [], message: choice.message.content, removedIds, updatedItems, savedPreferences };
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

  const logger = logLlm ? new LlmLogger(to) : null;
  logger?.userMessage(text);

  const { items: resolvedItems, removedIds, updatedItems, savedPreferences, message: reply } = await runAgentLoop(messages, user._id, logger);

  if (removedIds?.length) {
    order.items = order.items.filter(i => !removedIds.includes(i.item.toString()));
  }

  for (const { itemId, quantity } of updatedItems ?? []) {
    const existing = order.items.find(i => i.item.toString() === itemId);
    if (existing) existing.quantity = quantity;
  }

  for (const resolved of (reply ? [] : resolvedItems ?? [])) {
    if (!Types.ObjectId.isValid(resolved.id)) continue;
    const existing = order.items.find(i => i.item.toString() === resolved.id);
    if (existing) {
      existing.quantity = resolved.quantity ?? 1;
    } else {
      order.items.push({ item: resolved.id, quantity: resolved.quantity ?? 1 });
    }
  }

  if (usePreferences) {
    for (const { itemName, itemId } of savedPreferences ?? []) {
      await Preference.findOneAndUpdate(
        { user: user._id, itemName },
        { item: itemId },
        { upsert: true }
      );
    }
  }

  // Store only the bare user text in history (not the injected order context)
  order.history.push({ role: 'user', content: text });
  order.history.push({ role: 'assistant', content: JSON.stringify({ items: resolvedItems, removedIds, updatedItems, message: reply }) });
  order.clearToken = crypto.randomBytes(24).toString('hex');
  await order.save();

  const refreshed = await Order.findById(order._id).populate('items.item');
  const orderText = formatOrder(refreshed.items.filter(i => i.item));
  const clearUrl = `${baseUrl}/clear/${order._id}?t=${order.clearToken}`;
  const links = `Finish Shopping: https://leta.app/finish\nClear Order: ${clearUrl}`;

  const outText = [orderText, reply, links].filter(Boolean).join('\n\n');
  logger?.finalReply(reply || '(silent)');
  logger?.flush();
  return outText;
}

async function handleMessage(to, phoneNumber, text) {
  const reply = await processMessage(to, phoneNumber, text);
  await sendMessage(to, reply);
}

module.exports = { handleMessage, processMessage };

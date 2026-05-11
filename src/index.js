require('dotenv').config();
const express = require('express');
const Groq = require('groq-sdk');
const connectDB = require('./db/connection');
const User = require('./db/models/User');
const Order = require('./db/models/Order');
const Item = require('./db/models/Item');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappToken = process.env.WA_WHATSAPP_TOKEN;
const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
const baseUrl = process.env.BASE_URL;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a shopping assistant. The user sends messages to build a shopping list.

Use the search_items tool to look up each item the user mentions.
- Exactly 1 result: include it in the items array with the correct id, name, store, price, variant and quantity.
- Multiple results: add a short clarifying question to the message field.
- No results: mention the item is unavailable in the message field.

When all items are looked up respond ONLY with this JSON (no text outside it):
{
  "items": [
    { "id": "<_id>", "name": "", "store": "", "price": 0, "variant": { "brand": "", "size": "", "unit": "" }, "quantity": 1 }
  ],
  "message": ""
}

Leave message as "" unless you have clarifying questions, unavailable items, or the user sent a non-shopping message.
For non-shopping messages, keep the reply to one sentence and steer the user towards shopping.`;

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
];

async function searchItems(query) {
  return Item.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { 'variant.brand': { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ],
  }).limit(5).lean();
}

async function runAgentLoop(messages) {
  for (let i = 0; i < 10; i++) {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    const choice = completion.choices[0];
    messages.push(choice.message);

    if (choice.finish_reason === 'tool_calls') {
      for (const call of choice.message.tool_calls) {
        const { query } = JSON.parse(call.function.arguments);
        const results = await searchItems(query);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(results),
        });
      }
    } else {
      return JSON.parse(choice.message.content);
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

async function sendMessage(to, text) {
  await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${whatsappToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
}

// Webhook verification
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Webhook messages
app.post('/', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);

  const changes = req.body?.entry?.[0]?.changes?.[0];
  if (changes?.field !== 'messages') return res.status(200).end();

  const message = changes.value?.messages?.[0];
  if (!message) return res.status(200).end();

  console.log(JSON.stringify(req.body, null, 2));

  const to = message.from ?? message.from_user_id;
  const phoneNumber = message.from ?? null;
  const text = message.text?.body;

  console.log(`From: ${to}`);
  console.log(`Message: ${text}`);

  res.status(200).end();

  handleMessage(to, phoneNumber, text).catch(console.error);
});

// Clear order
app.get('/clear/:orderId', async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.orderId,
    { status: 'cleared' },
    { new: true }
  ).populate('user');

  if (!order) return res.status(404).send('Order not found.');

  res.send('Your order has been cleared. Send a message on WhatsApp to start a new one!');

  await sendMessage(order.user.waId, 'Your order has been cleared. Send a message to start a new one!');
});

async function handleMessage(to, phoneNumber, text) {
  const user = await User.findOneAndUpdate(
    { waId: to },
    { waId: to, ...(phoneNumber && { phoneNumber }) },
    { upsert: true, new: true }
  );

  let order = await Order.findOne({ user: user._id, status: 'active' });
  if (!order) order = await Order.create({ user: user._id });

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...order.history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: text },
  ];

  const { items: resolvedItems, message: reply } = await runAgentLoop(messages);

  // Merge resolved items into order (add new, update quantity of existing)
  for (const resolved of resolvedItems ?? []) {
    const existing = order.items.find(i => i.item.toString() === resolved.id);
    if (existing) {
      existing.quantity = resolved.quantity ?? 1;
    } else {
      order.items.push({ item: resolved.id, quantity: resolved.quantity ?? 1 });
    }
  }

  order.history.push({ role: 'user', content: text });
  order.history.push({ role: 'assistant', content: JSON.stringify({ items: resolvedItems, message: reply }) });
  await order.save();

  const populated = await Order.findById(order._id).populate('items.item');
  const orderText = formatOrder(populated.items.filter(i => i.item));
  const clearUrl = `${baseUrl}/clear/${order._id}`;
  const links = `Finish Shopping: https://leta.app/finish\nClear Order: ${clearUrl}`;

  const parts = [orderText, reply, links].filter(Boolean);
  await sendMessage(to, parts.join('\n\n'));
}

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`\nListening on port ${port}\n`);
  });
});

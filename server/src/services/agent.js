const crypto = require('crypto');
const OpenAI = require('openai');
const { Types } = require('mongoose');
const { openaiApiKey, baseUrl, checkoutUrl, usePreferences, logLlm } = require('../config');
const LlmLogger = require('../utils/llmLogger');
const User = require('../db/models/User');
const Order = require('../db/models/Order');
const Item = require('../db/models/Item');
const Preference = require('../db/models/Preference');
const { sendMessage } = require('./whatsapp');
const { findStoresNear, buildLocationPrompt, addToUserLocations } = require('./location');

const openai = new OpenAI({ apiKey: openaiApiKey });

const SYSTEM_PROMPT = `You are a friendly WhatsApp shopping assistant. Your job is to understand exactly what the customer wants and build their shopping list.

Keep replies short and conversational — like a helpful friend, not a form.

When the customer has an active order, the top of their message will show:

Current order:
- [id: <itemId>] Name (Brand) x<quantity>

Message: <their text>

Only add an item once you are certain it is what the customer wants. If the customer asks for several items at once, commit the ones you are sure about and, in the same response, ask a short clarifying question about any ambiguous ones. Keep clarifying until you can pick the right one with confidence.

search_items only returns items stocked in the stores serving this customer's delivery location. If a search returns no results (an empty array, or a result with "available": false), the requested item is NOT available — tell the customer plainly (e.g. "Sorry, X isn't available at the stores near you") and offer to help with something else. Never invent items, prices, brands, or store names. Never assume an item exists just because it would be reasonable to stock.
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
Every item in the "items" array will be committed to the order — only include items you are certain about. You may commit certain items AND ask a clarifying question about other items in the same response: put the certain items in "items" and the question in "message". An empty message is fine when no extra reply is needed; an empty items array is fine when the whole turn is a clarifying question.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_items',
      description: 'Search the product catalog for items by name, brand, size, or tags. Only returns items available in the stores serving the customer.',
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
      item.store?.name,
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

async function searchItems(query, userId, storeIds) {
  if (typeof query !== 'string' || !query.trim()) return [];

  const storeFilter = { store: { $in: storeIds } };

  if (usePreferences && userId) {
    const pref = await Preference.findOne({ user: userId, itemName: query.toLowerCase() })
      .populate({ path: 'item', populate: { path: 'store' } })
      .lean();
    if (pref?.item && storeIds.some(id => id.equals(pref.item.store?._id ?? pref.item.store))) {
      return [pref.item];
    }
  }

  // Primary: MongoDB text index (scoped to serving stores)
  const textResults = await Item.find(
    { ...storeFilter, $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } }).limit(10).populate('store').lean();

  if (textResults.length) return filterByTokens(textResults, query);

  // Fallback: per-token word-boundary regex
  const tokens = query.split(/\s+/).filter(Boolean);
  const conditions = tokens.flatMap(token => {
    const re = new RegExp(`\\b${token}\\b`, 'i');
    return [
      { name: re },
      { 'variant.brand': re },
      { 'variant.size': re },
      { 'variant.unit': re },
      { tags: re },
    ];
  });
  const fallback = await Item.find({ ...storeFilter, $or: conditions })
    .limit(10).populate('store').lean();
  return filterByTokens(fallback, query);
}

async function runAgentLoop(messages, userId, storeIds, logger) {
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
        let args = null;
        let result;
        try {
          args = JSON.parse(call.function.arguments);
          switch (call.function.name) {
            case 'search_items': {
              const found = await searchItems(args.query, userId, storeIds);
              result = found.length === 0
                ? { available: false, items: [], note: `No items matching "${args.query}" are stocked in the stores serving this customer's location.` }
                : found;
              break;
            }
            case 'remove_item':
              if (!args.itemId) throw new Error('Missing itemId');
              removedIds.push(args.itemId);
              result = { removed: args.itemId };
              break;
            case 'update_item':
              if (!args.itemId) throw new Error('Missing itemId');
              if (typeof args.quantity !== 'number') throw new Error('quantity must be a number');
              updatedItems.push({ itemId: args.itemId, quantity: args.quantity });
              result = { updated: args.itemId, quantity: args.quantity };
              break;
            case 'replace_item': {
              if (!args.itemId) throw new Error('Missing itemId');
              const replacements = await searchItems(args.query, userId, storeIds);
              if (replacements.length === 0) {
                result = { available: false, items: [], note: `No replacement matching "${args.query}" is stocked in this customer's stores. The original item has NOT been removed.` };
                break;
              }
              removedIds.push(args.itemId);
              result = replacements;
              break;
            }
            case 'save_preference':
              if (usePreferences) {
                if (!args.itemName || !args.itemId) throw new Error('itemName and itemId required');
                savedPreferences.push({ itemName: args.itemName.toLowerCase(), itemId: args.itemId });
              }
              result = { saved: true };
              break;
            default:
              result = { error: `Unknown tool: ${call.function.name}` };
          }
        } catch (err) {
          console.error(`Tool ${call.function.name} failed:`, err);
          result = { error: err.message || 'Tool call failed' };
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
    const store = item.store?.name ? ` @ ${item.store.name}` : '';
    const lineTotal = (item.price ?? 0) * quantity;
    total += lineTotal;
    const priceStr = item.price != null
      ? (quantity > 1 ? `KES ${item.price} x${quantity} = KES ${lineTotal}` : `KES ${item.price}`)
      : 'Price TBD';
    return `- ${item.name}${variant}${store}: ${priceStr}`;
  });

  return `Your order:\n${lines.join('\n')}\n\nTotal: KES ${total}`;
}

async function applyLocation(user, order, name, coordinates) {
  const stores = await findStoresNear(coordinates[0], coordinates[1]);
  if (!stores.length) return null;

  order.location = { name, coordinates };
  order.stores = stores.map(s => s._id);
  addToUserLocations(user, name, coordinates);
  await order.save();
  await user.save();

  const storeList = stores.map(s => s.name).join(', ');
  return `Delivery set to ${name}. We'll order from: ${storeList}. What would you like to shop for?`;
}

async function handleLocationGate(user, order, message) {
  if (message.type === 'location') {
    const { latitude, longitude, name, address } = message.location;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return 'Could not read that location. Please try sharing it again.';
    }
    const label = name || address || 'Shared location';
    const reply = await applyLocation(user, order, label, [longitude, latitude]);
    return reply || 'Sorry, that location is not in our service area yet. Please share a location near a partner store.';
  }

  // Text message during location gate: maybe a saved-location selection
  const trimmed = (message.text || '').trim();
  if (user.locations?.length && /^\d+$/.test(trimmed)) {
    const idx = parseInt(trimmed, 10) - 1;
    if (idx >= 0 && idx < user.locations.length) {
      const chosen = user.locations[idx];
      const reply = await applyLocation(user, order, chosen.name, chosen.coordinates);
      return reply || `${chosen.name} is no longer in our service area. Please share a new location.`;
    }
  }

  return buildLocationPrompt(user);
}

async function processMessage(to, phoneNumber, message) {
  const user = await User.findOneAndUpdate(
    { waId: to },
    { waId: to, ...(phoneNumber && { phoneNumber }) },
    { upsert: true, new: true }
  );

  let order = await Order.findOne({ user: user._id, status: 'active' });
  if (!order) order = await Order.create({ user: user._id });

  if (!order.location?.coordinates?.length) {
    return handleLocationGate(user, order, message);
  }

  if (message.type === 'location') {
    return `Delivery for this order is already set to ${order.location.name}. To use a different location, clear the order and start a new one.`;
  }

  const text = message.text;

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

  const { items: resolvedItems, removedIds, updatedItems, savedPreferences, message: reply } =
    await runAgentLoop(messages, user._id, order.stores, logger);

  if (removedIds?.length) {
    order.items = order.items.filter(i => !removedIds.includes(i.item.toString()));
  }

  for (const { itemId, quantity } of updatedItems ?? []) {
    const existing = order.items.find(i => i.item.toString() === itemId);
    if (existing) existing.quantity = quantity;
  }

  for (const resolved of resolvedItems ?? []) {
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
  order.checkoutToken = crypto.randomBytes(24).toString('hex');
  await order.save();

  const refreshed = await Order.findById(order._id)
    .populate({ path: 'items.item', populate: { path: 'store' } });
  const orderText = formatOrder(refreshed.items.filter(i => i.item));
  const clearUrl = `${baseUrl}/clear/${order._id}?t=${order.clearToken}`;
  const checkoutLink = `${checkoutUrl}/?order=${order._id}&t=${order.checkoutToken}`;
  const links = `Finish Shopping: ${checkoutLink}\nClear Order: ${clearUrl}`;

  const outText = [orderText, reply, links].filter(Boolean).join('\n\n');
  logger?.finalReply(reply || '(silent)');
  logger?.flush();
  return outText;
}

async function handleMessage(to, phoneNumber, message) {
  try {
    const reply = await processMessage(to, phoneNumber, message);
    await sendMessage(to, reply);
  } catch (err) {
    console.error('handleMessage failed:', err);
    try {
      await sendMessage(to, 'Sorry, something went wrong on our end. Please try that again in a moment.');
    } catch (sendErr) {
      console.error('Fallback sendMessage failed:', sendErr);
    }
  }
}

module.exports = { handleMessage, processMessage };

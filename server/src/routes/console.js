const { Router } = require('express');
const crypto = require('crypto');
const { Types } = require('mongoose');
const { requireAgent } = require('../middleware/auth');
const { baseUrl, checkoutUrl } = require('../config');
const { getConversationMode, setConversationMode, MODES } = require('../services/settings');
const { searchItems, formatOrder } = require('../services/agent');
const { findStoresNear, addToUserLocations } = require('../services/location');
const { sendMessage } = require('../services/whatsapp');
const Order = require('../db/models/Order');
const Item = require('../db/models/Item');

const router = Router();

router.use(requireAgent);

function summarize(order) {
  const last = order.history[order.history.length - 1];
  return {
    id: order._id,
    status: order.status,
    user: {
      waId: order.user?.waId,
      phoneNumber: order.user?.phoneNumber,
    },
    location: order.location?.name ? { name: order.location.name } : null,
    itemCount: order.items.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
    lastMessage: last ? { role: last.role, content: last.content, at: last._id.getTimestamp() } : null,
    needsReply: !!last && last.role === 'user',
    updatedAt: order.updatedAt,
  };
}

// --- Global AI / human toggle -------------------------------------------

router.get('/console/mode', async (req, res) => {
  res.json({ mode: await getConversationMode() });
});

router.post('/console/mode', async (req, res) => {
  const { mode } = req.body ?? {};
  if (!MODES.includes(mode)) return res.status(400).json({ error: `mode must be one of: ${MODES.join(', ')}` });
  res.json({ mode: await setConversationMode(mode) });
});

// --- Conversation inbox ---------------------------------------------------

router.get('/console/conversations', async (req, res) => {
  const { status = 'active' } = req.query;
  const filter = status === 'all' ? {} : { status };
  const orders = await Order.find(filter).sort({ updatedAt: -1 }).populate('user');
  res.json(orders.map(summarize));
});

router.get('/console/conversations/:orderId', async (req, res) => {
  const order = await Order.findById(req.params.orderId)
    .populate('user')
    .populate({ path: 'items.item', populate: { path: 'store' } })
    .populate('stores');
  if (!order) return res.status(404).json({ error: 'Conversation not found' });
  res.json(order);
});

// --- Catalog search (same catalog/scoping the LLM agent uses) -----------

router.get('/console/search', async (req, res) => {
  const { orderId, q } = req.query;
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ error: 'Conversation not found' });
  if (!order.stores?.length) return res.status(400).json({ error: 'Set a delivery location before searching items.' });

  const results = await searchItems(q, order.user, order.stores);
  res.json(results);
});

// --- Delivery location -----------------------------------------------------

router.post('/console/conversations/:orderId/location', async (req, res) => {
  const { name, latitude, longitude } = req.body ?? {};
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'latitude and longitude are required numbers' });
  }

  const order = await Order.findById(req.params.orderId).populate('user');
  if (!order) return res.status(404).json({ error: 'Conversation not found' });

  const stores = await findStoresNear(longitude, latitude);
  if (!stores.length) return res.status(400).json({ error: 'No partner stores serve that location.' });

  const label = name || 'Shared location';
  order.location = { name: label, coordinates: [longitude, latitude] };
  order.stores = stores.map(s => s._id);
  addToUserLocations(order.user, label, [longitude, latitude]);
  order.history.push({ role: 'assistant', content: `Delivery set to ${label}.` });

  await order.user.save();
  await order.save();

  res.json({ ok: true, stores: stores.map(s => ({ id: s._id, name: s.name })) });
});

// --- Order items -------------------------------------------------------

router.post('/console/conversations/:orderId/items', async (req, res) => {
  const { itemId, quantity = 1 } = req.body ?? {};
  if (!Types.ObjectId.isValid(itemId)) return res.status(400).json({ error: 'Invalid itemId' });
  if (typeof quantity !== 'number' || quantity < 1) return res.status(400).json({ error: 'quantity must be >= 1' });

  const item = await Item.findById(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Conversation not found' });

  const existing = order.items.find(i => i.item.toString() === itemId);
  if (existing) existing.quantity = quantity;
  else order.items.push({ item: itemId, quantity });

  await order.save();
  const refreshed = await Order.findById(order._id).populate({ path: 'items.item', populate: { path: 'store' } });
  res.json({ ok: true, items: refreshed.items });
});

router.delete('/console/conversations/:orderId/items/:itemId', async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Conversation not found' });

  order.items = order.items.filter(i => i.item.toString() !== req.params.itemId);
  await order.save();
  res.json({ ok: true });
});

// --- Replying to the customer --------------------------------------------
// Mirrors what the LLM agent sends after each turn: current order summary +
// an optional free-text message + the checkout/clear links.

router.post('/console/conversations/:orderId/send', async (req, res) => {
  const { text = '' } = req.body ?? {};

  const order = await Order.findById(req.params.orderId).populate('user');
  if (!order) return res.status(404).json({ error: 'Conversation not found' });

  order.clearToken = crypto.randomBytes(24).toString('hex');
  order.checkoutToken = crypto.randomBytes(24).toString('hex');
  order.history.push({ role: 'assistant', content: JSON.stringify({ message: text }) });
  await order.save();

  const refreshed = await Order.findById(order._id)
    .populate('user')
    .populate({ path: 'items.item', populate: { path: 'store' } });

  const orderText = formatOrder(refreshed.items.filter(i => i.item));
  const clearUrl = `${baseUrl}/clear/${order._id}?t=${order.clearToken}`;
  const checkoutLink = `${checkoutUrl}/?order=${order._id}&t=${order.checkoutToken}`;
  const links = `Finish Shopping: ${checkoutLink}\nClear Order: ${clearUrl}`;
  const outText = [orderText, text, links].filter(Boolean).join('\n\n');

  await sendMessage(refreshed.user.waId, outText);
  res.json({ ok: true, sent: outText });
});

module.exports = router;

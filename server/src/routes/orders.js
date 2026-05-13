const { Router } = require('express');
const Order = require('../db/models/Order');
const { sendMessage } = require('../services/whatsapp');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const STATUSES = ['active', 'completed', 'cleared'];

router.get('/orders', requireAuth, async (req, res) => {
  const { status } = req.query;
  const filter = status && status !== 'all' ? { status } : {};
  if (status && status !== 'all' && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const orders = await Order.find(filter)
    .sort({ updatedAt: -1 })
    .populate('user')
    .populate('items.item');

  res.json(orders);
});

router.get('/clear/:orderId', async (req, res) => {
  const { t } = req.query;
  if (!t) return res.status(400).send('Invalid or expired link.');

  let order;
  try {
    order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, clearToken: t },
      { status: 'cleared', clearToken: null },
      { new: true }
    ).populate('user');
  } catch {
    return res.status(400).send('Invalid or expired link.');
  }

  if (!order) return res.status(400).send('Invalid or expired link.');

  res.send('Your order has been cleared. Send a message on WhatsApp to start a new one!');

  await sendMessage(order.user.waId, 'Your order has been cleared. Send a message to start a new one!');
});

module.exports = router;

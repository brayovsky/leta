const { Router } = require('express');
const Order = require('../db/models/Order');
const { sendMessage } = require('../services/whatsapp');

const router = Router();

router.get('/clear/:orderId', async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.orderId,
    { status: 'cleared' },
    { new: true }
  ).populate('user');

  if (!order) return res.status(404).send('Order not found.');

  res.send('Your order has been cleared. Send a message on WhatsApp to start a new one!');

  await sendMessage(order.user.waId, 'Your order has been cleared. Send a message to start a new one!');
});

module.exports = router;

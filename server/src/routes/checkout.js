const { Router } = require('express');
const { Types } = require('mongoose');
const Order = require('../db/models/Order');
const { sendMessage } = require('../services/whatsapp');

const router = Router();

const DELIVERY_FEE = 200;

function serializeOrder(order) {
  const items = order.items
    .filter(i => i.item)
    .map(({ item, quantity }) => ({
      id: item._id,
      name: item.name,
      price: item.price ?? null,
      variant: {
        brand: item.variant?.brand ?? null,
        size: item.variant?.size ?? null,
        unit: item.variant?.unit ?? null,
      },
      store: item.store ? { id: item.store._id, name: item.store.name } : null,
      quantity,
    }));

  const subtotal = items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

  return {
    id: order._id,
    status: order.status,
    location: order.location?.name
      ? { name: order.location.name, coordinates: order.location.coordinates }
      : null,
    phoneNumber: order.user?.phoneNumber ?? order.user?.waId ?? null,
    items,
    subtotal,
    deliveryFee: DELIVERY_FEE,
    total: subtotal + DELIVERY_FEE,
  };
}

function loadOrder(orderId, token) {
  if (!token || !Types.ObjectId.isValid(orderId)) return null;
  return Order.findOne({ _id: orderId, checkoutToken: token })
    .populate('user')
    .populate({ path: 'items.item', populate: { path: 'store' } });
}

// Load an order for review at checkout time.
router.get('/checkout/:orderId', async (req, res) => {
  const order = await loadOrder(req.params.orderId, req.query.t);
  if (!order) return res.status(404).json({ error: 'Order not found or link expired.' });
  if (order.status !== 'active') {
    return res.status(409).json({ error: 'This order has already been placed.' });
  }
  res.json(serializeOrder(order));
});

// Apply any edits made during checkout, then confirm the order.
router.post('/checkout/:orderId/place', async (req, res) => {
  const { t, items } = req.body ?? {};
  const order = await loadOrder(req.params.orderId, t);
  if (!order) return res.status(404).json({ error: 'Order not found or link expired.' });
  if (order.status !== 'active') {
    return res.status(409).json({ error: 'This order has already been placed.' });
  }

  // Reconcile with the quantities / removals the customer made in the UI.
  if (Array.isArray(items)) {
    const wanted = new Map(items.map(i => [String(i.itemId), Number(i.quantity)]));
    order.items = order.items
      .filter(i => i.item && wanted.has(String(i.item._id ?? i.item)))
      .map(i => {
        i.quantity = Math.max(1, wanted.get(String(i.item._id ?? i.item)) || 1);
        return i;
      });
  }

  if (!order.items.length) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  order.status = 'completed';
  order.checkoutToken = null;
  order.clearToken = null;
  await order.save();

  const summary = serializeOrder(order);
  res.json({ ok: true, total: summary.total });

  const phone = order.user?.waId;
  if (phone) {
    await sendMessage(
      phone,
      `Your order is confirmed! Total: KES ${summary.total} (incl. KES ${DELIVERY_FEE} delivery). We'll let you know when it's on the way.`
    );
  }
});

module.exports = router;

const crypto = require('crypto');
const { Router } = require('express');
const { verifyToken, appSecret, isProd } = require('../config');
const { handleMessage } = require('../services/agent');
const { getConversationMode } = require('../services/settings');
const User = require('../db/models/User');
const Order = require('../db/models/Order');

const router = Router();

if (!appSecret) {
  if (isProd) throw new Error('WA_APP_SECRET must be set');
  console.warn('WA_APP_SECRET not set: webhook signatures will not be verified (dev only)');
}

// Meta signs each webhook POST with the app secret (X-Hub-Signature-256).
function hasValidSignature(req) {
  if (!appSecret) return true;
  const header = req.get('x-hub-signature-256') || '';
  if (!req.rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// When a human is handling conversations (see routes/console.js), incoming
// messages are just recorded onto the order's history for the console inbox
// to pick up — no auto-reply, no LLM call.
async function recordIncomingMessage(to, phoneNumber, message) {
  const user = await User.findOneAndUpdate(
    { waId: to },
    { waId: to, ...(phoneNumber && { phoneNumber }) },
    { upsert: true, new: true }
  );

  let order = await Order.findOne({ user: user._id, status: 'active' });
  if (!order) order = await Order.create({ user: user._id });

  if (message.type === 'location') {
    const { latitude, longitude, name, address } = message.location;
    order.history.push({
      role: 'user',
      content: `[Shared location] ${name || address || ''}`.trim(),
      meta: { type: 'location', latitude, longitude, name: name || address || 'Shared location' },
    });
  } else {
    order.history.push({ role: 'user', content: message.text ?? '' });
  }

  await order.save();
}

router.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

router.post('/', (req, res) => {
  if (!hasValidSignature(req)) return res.status(401).end();

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);

  const changes = req.body?.entry?.[0]?.changes?.[0];
  if (changes?.field !== 'messages') return res.status(200).end();

  const message = changes.value?.messages?.[0];
  if (!message) return res.status(200).end();

  const to = message.from ?? message.from_user_id;
  const phoneNumber = message.from ?? null;

  let payload;
  if (message.type === 'text') {
    payload = { type: 'text', text: message.text?.body };
  } else if (message.type === 'location') {
    payload = {
      type: 'location',
      location: {
        latitude: message.location?.latitude,
        longitude: message.location?.longitude,
        name: message.location?.name,
        address: message.location?.address,
      },
    };
  } else {
    return res.status(200).end();
  }

  console.log(`Message type: ${payload.type}`);

  res.status(200).end();

  getConversationMode()
    .then(mode => (mode === 'human'
      ? recordIncomingMessage(to, phoneNumber, payload)
      : handleMessage(to, phoneNumber, payload)))
    .catch(console.error);
});

module.exports = router;

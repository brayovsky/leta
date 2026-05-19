const { Router } = require('express');
const { verifyToken } = require('../config');
const { handleMessage } = require('../services/agent');

const router = Router();

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
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);

  const changes = req.body?.entry?.[0]?.changes?.[0];
  if (changes?.field !== 'messages') return res.status(200).end();

  const message = changes.value?.messages?.[0];
  if (!message) return res.status(200).end();

  console.log(JSON.stringify(req.body, null, 2));

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

  console.log(`From: ${to}`);
  console.log(`Message: ${payload.type === 'text' ? payload.text : JSON.stringify(payload.location)}`);

  res.status(200).end();

  handleMessage(to, phoneNumber, payload).catch(console.error);
});

module.exports = router;

require('dotenv').config();
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappToken = process.env.WA_WHATSAPP_TOKEN;
const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;

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

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  const changes = req.body?.entry?.[0]?.changes?.[0];
  if (changes?.field !== 'messages') return res.status(200).end();

  const message = changes.value?.messages?.[0];
  if (!message) return res.status(200).end();

  console.log(JSON.stringify(req.body, null, 2));

  const to = message.from ?? message.from_user_id;
  const text = message.text?.body;

  console.log(`From: ${to}`);
  console.log(`Message: ${text}`);

  res.status(200).end();

  handleMessage(to, text).catch(console.error);
});

async function handleMessage(to, text) {
  await sendMessage(to, `I received ${text}`);
}

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});

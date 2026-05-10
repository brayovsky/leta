require('dotenv').config();
const express = require('express');
const Groq = require('groq-sdk');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappToken = process.env.WA_WHATSAPP_TOKEN;
const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You will be provided with a user's text message from WhatsApp. Use it to create a shopping list.
Always encourage the user to add as many items in a single message.
Always engage the user to shop if the message is not of a shopping nature.`;

const histories = new Map();

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
  if (!histories.has(to)) histories.set(to, []);
  const history = histories.get(to);

  history.push({ role: 'user', content: text });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
  });

  const reply = completion.choices[0].message.content;
  history.push({ role: 'assistant', content: reply });

  const message = `${reply}\n\nFinish Shopping: https://leta.app/finish\nClear History: https://leta.app/clear`;
  await sendMessage(to, message);
}

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});

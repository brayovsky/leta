const EventEmitter = require('events');
const { whatsappToken, phoneNumberId } = require('../config');

const messageEmitter = new EventEmitter();

async function sendMessage(to, text) {
  messageEmitter.emit('message', { to, text });

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
  }).catch(() => {});
}

module.exports = { sendMessage, messageEmitter };

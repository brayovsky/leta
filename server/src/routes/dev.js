const { Router } = require('express');
const { messageEmitter } = require('../services/whatsapp');

const router = Router();

function localhostOnly(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
  res.status(403).end();
}

router.get('/dev/stream', localhostOnly, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const onMessage = ({ to, text }) => {
    res.write(`data: ${JSON.stringify({ to, text })}\n\n`);
  };

  messageEmitter.on('message', onMessage);
  req.on('close', () => messageEmitter.off('message', onMessage));
});

module.exports = router;

const express = require('express');
const webhookRoutes = require('./routes/webhook');
const orderRoutes = require('./routes/orders');
const checkoutRoutes = require('./routes/checkout');
const userRoutes = require('./routes/users');
const devRoutes = require('./routes/dev');
const authRoutes = require('./routes/auth');
const consoleRoutes = require('./routes/console');

const app = express();

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Keep the raw body so the webhook can verify Meta's X-Hub-Signature-256.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

app.use('/', webhookRoutes);
app.use('/', authRoutes);
app.use('/', orderRoutes);
app.use('/', checkoutRoutes);
app.use('/', userRoutes);
app.use('/', devRoutes);
app.use('/', consoleRoutes);

module.exports = app;

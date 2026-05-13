const express = require('express');
const webhookRoutes = require('./routes/webhook');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const devRoutes = require('./routes/dev');
const authRoutes = require('./routes/auth');

const app = express();

const ALLOWED_ORIGINS = new Set(['http://localhost:5173', 'http://localhost:5174']);

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

app.use(express.json());

app.use('/', webhookRoutes);
app.use('/', authRoutes);
app.use('/', orderRoutes);
app.use('/', userRoutes);
app.use('/', devRoutes);

module.exports = app;

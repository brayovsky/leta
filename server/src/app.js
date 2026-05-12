const express = require('express');
const webhookRoutes = require('./routes/webhook');
const orderRoutes = require('./routes/orders');
const devRoutes = require('./routes/dev');

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.use('/', webhookRoutes);
app.use('/', orderRoutes);
app.use('/', devRoutes);

module.exports = app;

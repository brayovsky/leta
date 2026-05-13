const { readSession } = require('../auth/session');

function requireAuth(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  next();
}

module.exports = { requireAuth };

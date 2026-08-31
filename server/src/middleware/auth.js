const { readSession } = require('../auth/session');

function requireAuth(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  next();
}

// Same session cookie, but requires the 'agent' role granted at sign-in to
// members of ALLOWED_AGENT_EMAILS (see routes/auth.js /auth/agent/google).
function requireAgent(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  if (user.role !== 'agent') return res.status(403).json({ error: 'Not authorized' });
  req.user = user;
  next();
}

module.exports = { requireAuth, requireAgent };

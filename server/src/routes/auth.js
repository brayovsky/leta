const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');
const { googleClientId, allowedEmails } = require('../config');
const { COOKIE_NAME, sign, cookieOptions, readSession } = require('../auth/session');

const router = Router();
const client = new OAuth2Client(googleClientId);

router.post('/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Missing credential' });

  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: googleClientId });
    const payload = ticket.getPayload();

    if (!payload?.email_verified) {
      return res.status(403).json({ error: 'Email not verified' });
    }
    if (!allowedEmails.includes(payload.email.toLowerCase())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const user = { email: payload.email, name: payload.name, picture: payload.picture };
    res.cookie(COOKIE_NAME, sign(user), cookieOptions());
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

router.post('/auth/signout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get('/auth/me', (req, res) => {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: 'No session' });
  res.json({ user: { email: user.email, name: user.name, picture: user.picture } });
});

module.exports = router;

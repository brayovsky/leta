const jwt = require('jsonwebtoken');
const { sessionSecret, sessionTtlSec, isProd } = require('../config');

const COOKIE_NAME = 'session';

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set');
}

function sign(user, role = 'portal') {
  return jwt.sign(
    { email: user.email, name: user.name, picture: user.picture, role },
    sessionSecret,
    { expiresIn: sessionTtlSec }
  );
}

function verify(token) {
  try {
    return jwt.verify(token, sessionSecret);
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: sessionTtlSec * 1000,
  };
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function readSession(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return null;
  return verify(token);
}

module.exports = { COOKIE_NAME, sign, verify, cookieOptions, readSession };

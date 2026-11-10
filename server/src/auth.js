import crypto from 'node:crypto';

const COOKIE = 'myinfo_session';
const DAY = 12 * 60 * 60;
const username = process.env.ADMIN_USERNAME || '';
const passwordHash = process.env.ADMIN_PASSWORD_HASH || '';
const secret = process.env.AUTH_SECRET || '';

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function verifyPassword(password) {
  if (!passwordHash.includes(':')) return false;
  const [salt, expectedHex] = passwordHash.split(':');
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return safeEqual(actual, expectedHex);
}
function sign(value) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}
function readCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}
export function authConfigured() {
  return Boolean(username && passwordHash && secret);
}
export function login(req, res) {
  const { id, password } = req.body || {};
  if (!authConfigured()) return res.status(503).json({ error: 'Login is not configured on the server.' });
  if (!safeEqual(id || '', username) || typeof password !== 'string' || !verifyPassword(password)) {
    return res.status(401).json({ error: 'Incorrect login ID or password.' });
  }
  const payload = Buffer.from(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + DAY })).toString('base64url');
  const token = payload + '.' + sign(payload);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', COOKIE + '=' + encodeURIComponent(token) + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + DAY + secure);
  return res.json({ ok: true, user: username });
}
export function logout(_req, res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', COOKIE + '=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' + secure);
  res.json({ ok: true });
}
export function requireAuth(req, res, next) {
  if (!authConfigured()) return res.status(503).json({ error: 'Login is not configured on the server.' });
  const token = readCookies(req.headers.cookie)[COOKIE] || '';
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return res.status(401).json({ error: 'Please log in.' });
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.sub !== username || data.exp < Math.floor(Date.now() / 1000)) throw new Error('expired');
    req.user = data.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}
export function sessionStatus(req, res) {
  const token = readCookies(req.headers.cookie)[COOKIE] || '';
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return res.json({ authenticated: false });
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return res.json({ authenticated: data.sub === username && data.exp >= Math.floor(Date.now() / 1000), user: data.sub });
  } catch { return res.json({ authenticated: false }); }
}

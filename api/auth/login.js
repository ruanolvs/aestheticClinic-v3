const bcrypt = require('bcryptjs');
const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const { verifyToken, signToken } = require('../../lib/auth');
const db = require('../../lib/turso');

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (Date.now() - record.start > WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordAttempt(ip, success) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  const record = loginAttempts.get(ip);
  if (!record || Date.now() - record.start > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, start: Date.now() });
  } else {
    record.count++;
  }
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' });
  }

  const { password } = sanitizeObj(req.body, ['password']);
  if (!password) return res.status(400).json({ error: 'Senha obrigatoria' });

  try {
    const row = await db.getPasswordHash();
    if (!row || !row.hash) return res.status(500).json({ error: 'Erro interno: senha nao configurada' });

    const match = await bcrypt.compare(password, row.hash);
    if (!match) {
      recordAttempt(ip, false);
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = signToken({ user: 'admin', iat: Math.floor(Date.now() / 1000) });
    recordAttempt(ip, true);
    await db.addAuditLog('LOGIN', 'admin', 'Login realizado');
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};

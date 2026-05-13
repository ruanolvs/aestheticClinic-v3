const bcrypt = require('bcryptjs');
const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const { verifyToken, signToken } = require('../../lib/auth');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const { password } = sanitizeObj(req.body, ['password']);
  if (!password) return res.status(400).json({ error: 'Senha obrigatoria' });

  try {
    const row = await db.getPasswordHash();
    if (!row || !row.hash) return res.status(500).json({ error: 'Erro interno: senha nao configurada' });

    const match = await bcrypt.compare(password, row.hash);
    if (!match) return res.status(401).json({ error: 'Senha incorreta' });

    const token = signToken({ user: 'admin', iat: Math.floor(Date.now() / 1000) });
    await db.addAuditLog('LOGIN', 'admin', 'Login realizado');
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};

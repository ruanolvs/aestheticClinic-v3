const { setCorsHeaders } = require('../../lib/utils');
const { verifyToken } = require('../../lib/auth');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Token invalido ou expirado' });

  try {
    await db.resetServicos();
    await db.addAuditLog('RESET_SERVICOS', 'admin', 'Servicos restaurados para padrao');
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};

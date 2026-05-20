const { setCorsHeaders } = require('../../lib/utils');
const { verifyToken } = require('../../lib/auth');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    try {
      const data = await db.getServicos();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  if (req.method === 'PUT') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Token invalido ou expirado' });

    const { servicos } = req.body;
    if (!Array.isArray(servicos)) return res.status(400).json({ error: 'Formato invalido' });

    try {
      await db.saveServicos(servicos);
      await db.addAuditLog('UPDATE_SERVICOS', 'admin', 'Servicos atualizados');
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(405).json({ error: 'Metodo nao permitido' });
};

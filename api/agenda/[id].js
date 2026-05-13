const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const { verifyToken } = require('../../lib/auth');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { id } = req.query;

  if (req.method === 'PUT') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Token invalido ou expirado' });

    const updates = sanitizeObj(req.body, ['nome', 'whatsapp', 'servico', 'data', 'hora', 'obs', 'status']);

    if (updates.status !== 'cancelado' && updates.data) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(updates.data + 'T00:00:00');
      if (selected < today) return res.status(400).json({ error: 'Nao e possivel agendar para datas passadas' });
    }

    try {
      const result = await db.updateAppointment(id, updates);
      if (!result) return res.status(404).json({ error: 'Agendamento nao encontrado' });
      await db.addAuditLog('UPDATE_APPOINTMENT', 'admin', `Agendamento ${id} atualizado`);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  if (req.method === 'DELETE') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Token invalido ou expirado' });

    try {
      await db.deleteAppointment(id);
      await db.addAuditLog('DELETE_APPOINTMENT', 'admin', `Agendamento ${id} removido`);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(405).json({ error: 'Metodo nao permitido' });
};

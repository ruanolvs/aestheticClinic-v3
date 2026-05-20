const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const { verifyToken } = require('../../lib/auth');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Token invalido ou expirado' });

    try {
      const { status } = req.query;
      const data = await db.getAgenda(status);
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  if (req.method === 'POST') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Token invalido ou expirado' });

    const { nome, whatsapp, servico, data, hora, obs, status } = sanitizeObj(req.body, ['nome', 'whatsapp', 'servico', 'data', 'hora', 'obs', 'status']);
    if (!nome || !servico || !data) return res.status(400).json({ error: 'Nome, servico e data sao obrigatorios' });

    if (status !== 'cancelado') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(data + 'T00:00:00');
      if (selected < today) return res.status(400).json({ error: 'Nao e possivel agendar para datas passadas' });
    }

    try {
      const appointment = await db.addAppointment({ nome, whatsapp, servico, data, hora, obs, status: status || 'pendente' });
      await db.addAuditLog('CREATE_APPOINTMENT', 'admin', `Agendamento: ${nome} - ${servico} - ${data}`);
      return res.status(200).json(appointment);
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(405).json({ error: 'Metodo nao permitido' });
};

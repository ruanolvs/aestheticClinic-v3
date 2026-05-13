const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const { nome, whatsapp, servico, data, hora, obs } = sanitizeObj(req.body, ['nome', 'whatsapp', 'servico', 'data', 'hora', 'obs']);
  if (!nome || !servico || !data) return res.status(400).json({ error: 'Nome, servico e data sao obrigatorios' });

  if (nome.length > 100 || (whatsapp && whatsapp.length > 30) || (obs && obs.length > 500)) {
    return res.status(400).json({ error: 'Dados muito longos' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(data + 'T00:00:00');
  if (selected < today) return res.status(400).json({ error: 'Nao e possivel agendar para datas passadas' });

  try {
    const appointment = await db.addAppointment({ nome, whatsapp, servico, data, hora, obs, status: 'pendente' });
    await db.addAuditLog('PUBLIC_BOOKING', 'site', `Agendamento publico: ${nome} - ${servico} - ${data}`);
    return res.status(200).json({ success: true, id: appointment.id });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};

const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo nao permitido' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID do agendamento e obrigatorio' });

  // Cancelar pagamentos expirados antes de consultar
  await db.cancelExpiredPayments();

  const apt = await db.getAppointment(id);
  if (!apt) return res.status(404).json({ error: 'Agendamento nao encontrado' });

  return res.status(200).json({
    id: apt.id,
    status: apt.status,
    servico: apt.servico,
    data: apt.data,
    hora: apt.hora,
    nome: apt.nome,
    tikkie_payment_url: apt.tikkie_payment_url,
    expira_em: apt.expira_em,
    pago_em: apt.pago_em
  });
};

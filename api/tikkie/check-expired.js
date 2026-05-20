const { verifyToken } = require('../../lib/auth');
const { setCorsHeaders } = require('../../lib/utils');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  // Autenticacao obrigatoria: aceita JWT do admin OU CRON_SECRET
  const cronSecret = process.env.CRON_SECRET || '';
  const authHeader = req.headers.authorization;
  const providedCronSecret = req.headers['x-cron-secret'] || req.query.secret || '';

  let authorized = false;

  // Verificar CRON_SECRET se configurado
  if (cronSecret && providedCronSecret === cronSecret) {
    authorized = true;
  }

  // Verificar JWT do admin
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const user = verifyToken(req);
    if (user) authorized = true;
  }

  if (!authorized) {
    return res.status(401).json({ error: 'Nao autorizado' });
  }

  try {
    const cancelledCount = await db.cancelExpiredPayments();
    return res.status(200).json({
      success: true,
      cancelled: cancelledCount,
      message: cancelledCount > 0
        ? `${cancelledCount} agendamento(s) expirado(s) cancelado(s)`
        : 'Nenhum agendamento expirado'
    });
  } catch (err) {
    console.error('Error checking expired payments:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

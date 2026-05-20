const { verifyToken } = require('../../lib/auth');
const { setCorsHeaders } = require('../../lib/utils');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Este endpoint pode ser chamado por cron (sem auth) ou manualmente pelo admin (com auth)
  if (req.method === 'POST') {
    // Verificar auth se fornecido, mas nao exigir (para cron jobs)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const user = verifyToken(req);
      if (!user) return res.status(401).json({ error: 'Token invalido' });
    }

    // Validar segredo do cron se configurado
    const cronSecret = process.env.CRON_SECRET || '';
    if (cronSecret) {
      const providedSecret = req.headers['x-cron-secret'] || req.query.secret || '';
      if (providedSecret !== cronSecret) {
        return res.status(401).json({ error: 'Segredo do cron invalido' });
      }
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
  }

  return res.status(405).json({ error: 'Metodo nao permitido' });
};

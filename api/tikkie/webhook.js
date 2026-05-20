const { setCorsHeaders } = require('../../lib/utils');
const db = require('../../lib/turso');
const tikkie = require('../../lib/tikkie');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    // Webhooks externos nao enviam Origin valido — permitir apenas POST
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Tikkie-Signature');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const payload = req.body;

  // Se Tikkie API esta configurada, webhook DEVE ter assinatura valida
  if (tikkie.isTikkieConfigured()) {
    const signature = req.headers['x-tikkie-signature'] || '';
    if (!signature) {
      return res.status(401).json({ error: 'Assinatura ausente' });
    }
    if (!tikkie.verifyTikkieWebhook(payload, signature)) {
      return res.status(401).json({ error: 'Assinatura invalida' });
    }
  } else {
    // Sem API configurada — nao aceitar webhooks (nao faz sentido)
    return res.status(403).json({ error: 'Integracao Tikkie nao configurada' });
  }

  // Extrair dados do pagamento
  const paymentId = payload.paymentRequestId || payload.payment_id || '';
  const paymentStatus = payload.status || payload.paymentStatus || '';

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentRequestId ausente' });
  }

  // Status pagos no Tikkie: "PAID" ou "paid"
  const isPaid = paymentStatus.toUpperCase() === 'PAID';

  if (isPaid) {
    // Buscar agendamento pelo payment_id usando helper
    const apt = await db.getAppointmentByTikkieId(paymentId);

    if (apt) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await db.updateAppointment(apt.id, {
        status: 'confirmado',
        pago_em: now
      });

      await db.addAuditLog('PAYMENT_CONFIRMED', 'tikkie', `Pagamento confirmado: ${apt.nome} - ${apt.servico} (${apt.id})`);

      return res.status(200).json({ success: true, action: 'confirmed' });
    }
  }

  return res.status(200).json({ success: true, action: 'no_update' });
};

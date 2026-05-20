const { setCorsHeaders } = require('../../lib/utils');
const db = require('../../lib/turso');
const tikkie = require('../../lib/tikkie');

module.exports = async function handler(req, res) {
  // Webhooks do Tikkie nao enviam CORS headers
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const payload = req.body;

  // Verificar webhook (quando API configurada)
  if (tikkie.isTikkieConfigured()) {
    const signature = req.headers['x-tikkie-signature'] || '';
    if (!tikkie.verifyTikkieWebhook(payload, signature)) {
      return res.status(401).json({ error: 'Assinatura invalida' });
    }
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
    // Buscar agendamento pelo payment_id
    const result = await db.execute({
      sql: "SELECT id, nome, servico FROM agenda WHERE tikkie_payment_id = ? AND status = 'aguardando_pagamento'",
      args: [paymentId]
    });

    if (result.rows.length > 0) {
      const apt = result.rows[0];
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

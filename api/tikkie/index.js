const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const { verifyToken } = require('../../lib/auth');
const db = require('../../lib/turso');
const tikkie = require('../../lib/tikkie');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action } = req.query;

  // POST /api/tikkie?action=create — criar agendamento com pagamento
  if (req.method === 'POST' && action === 'create') {
    const { nome, whatsapp, servico, plano, data, hora, obs, valor } = sanitizeObj(req.body, [
      'nome', 'whatsapp', 'servico', 'plano', 'data', 'hora', 'obs', 'valor'
    ]);

    if (!nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Nome, servico, data e hora sao obrigatorios' });
    }

    if (nome.length > 100 || (whatsapp && whatsapp.length > 30) || (obs && obs.length > 500)) {
      return res.status(400).json({ error: 'Dados muito longos' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(data + 'T00:00:00');
    if (selected < today) return res.status(400).json({ error: 'Nao e possivel agendar para datas passadas' });

    const booked = await db.getBookedSlotsForDate(data);
    const [h, m] = hora.split(':').map(Number);
    const slotStart = h * 60 + m;
    const slotEnd = slotStart + db.SLOT_DURATION;

    const isOccupied = booked.some(apt => {
      const [bh, bm] = apt.hora.split(':').map(Number);
      const bookedStart = bh * 60 + bm;
      const bookedEnd = bookedStart + db.SLOT_DURATION + db.SLOT_INTERVAL;
      return slotStart < bookedEnd && slotEnd > bookedStart;
    });

    if (isOccupied) {
      return res.status(409).json({ error: 'Este horario ja esta ocupado. Escolha outro horario.' });
    }

    const servicoDesc = servico + (plano ? ` - ${plano}` : '');

    const appointment = await db.addAppointment({
      nome, whatsapp, servico, plano, data, hora, obs,
      status: 'aguardando_pagamento',
      valor: valor || '',
    });

    let paymentResult = null;
    if (valor) {
      const numericAmount = valor.replace(/[^0-9.,]/g, '').replace(',', '.');
      if (numericAmount) {
        const halfAmount = (parseFloat(numericAmount) / 2).toFixed(2);
        paymentResult = await tikkie.createTikkiePayment(
          halfAmount,
          `JV Beauty - Deposito: ${servicoDesc}`,
          appointment.id
        );
      }
    }

    if (paymentResult) {
      await db.updateAppointment(appointment.id, {
        tikkie_payment_id: paymentResult.payment_id,
        tikkie_payment_url: paymentResult.payment_url,
      });
      appointment.tikkie_payment_id = paymentResult.payment_id;
      appointment.tikkie_payment_url = paymentResult.payment_url;
    }

    await db.addAuditLog('PUBLIC_BOOKING', 'site', `Agendamento: ${nome} - ${servicoDesc} - ${data} ${hora} (aguardando pagamento)`);

    return res.status(200).json({
      success: true,
      id: appointment.id,
      status: appointment.status,
      tikkie_url: appointment.tikkie_payment_url,
      expira_em: appointment.expira_em,
      tikkie_mode: paymentResult ? paymentResult.mode : 'manual',
    });
  }

  // POST /api/tikkie?action=webhook — receber notificacao de pagamento
  if (req.method === 'POST' && action === 'webhook') {
    const payload = req.body;

    if (tikkie.isTikkieConfigured()) {
      const signature = req.headers['x-tikkie-signature'] || '';
      if (!signature) return res.status(401).json({ error: 'Assinatura ausente' });
      if (!tikkie.verifyTikkieWebhook(payload, signature)) return res.status(401).json({ error: 'Assinatura invalida' });
    } else {
      return res.status(403).json({ error: 'Integracao Tikkie nao configurada' });
    }

    const paymentId = payload.paymentRequestId || payload.payment_id || '';
    const paymentStatus = payload.status || payload.paymentStatus || '';
    if (!paymentId) return res.status(400).json({ error: 'paymentRequestId ausente' });

    if (paymentStatus.toUpperCase() === 'PAID') {
      const apt = await db.getAppointmentByTikkieId(paymentId);
      if (apt) {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.updateAppointment(apt.id, { status: 'confirmado', pago_em: now });
        await db.addAuditLog('PAYMENT_CONFIRMED', 'tikkie', `Pagamento confirmado: ${apt.nome} - ${apt.servico} (${apt.id})`);
        return res.status(200).json({ success: true, action: 'confirmed' });
      }
    }

    return res.status(200).json({ success: true, action: 'no_update' });
  }

  // POST /api/tikkie?action=check-expired — cancelar pagamentos expirados
  if (req.method === 'POST' && action === 'check-expired') {
    const cronSecret = process.env.CRON_SECRET || '';
    const authHeader = req.headers.authorization;
    const providedCronSecret = req.headers['x-cron-secret'] || req.query.secret || '';

    let authorized = false;
    if (cronSecret && providedCronSecret === cronSecret) authorized = true;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const user = verifyToken(req);
      if (user) authorized = true;
    }
    if (!authorized) return res.status(401).json({ error: 'Nao autorizado' });

    try {
      const cancelledCount = await db.cancelExpiredPayments();
      return res.status(200).json({
        success: true,
        cancelled: cancelledCount,
        message: cancelledCount > 0
          ? `${cancelledCount} agendamento(s) expirado(s) cancelado(s)`
          : 'Nenhum agendamento expirado',
      });
    } catch (err) {
      console.error('Error checking expired payments:', err);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // GET /api/tikkie?action=status&id=xxx — verificar status de agendamento
  if (req.method === 'GET' && action === 'status') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID do agendamento e obrigatorio' });

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
      pago_em: apt.pago_em,
    });
  }

  return res.status(405).json({ error: 'Metodo nao permitido' });
};

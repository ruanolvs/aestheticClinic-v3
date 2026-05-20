const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const db = require('../../lib/turso');
const tikkie = require('../../lib/tikkie');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const { nome, whatsapp, servico, plano, data, hora, obs, valor } = sanitizeObj(req.body, [
    'nome', 'whatsapp', 'servico', 'plano', 'data', 'hora', 'obs', 'valor'
  ]);

  if (!nome || !servico || !data || !hora) {
    return res.status(400).json({ error: 'Nome, servico, data e hora sao obrigatorios' });
  }

  if (nome.length > 100 || (whatsapp && whatsapp.length > 30) || (obs && obs.length > 500)) {
    return res.status(400).json({ error: 'Dados muito longos' });
  }

  // Validar data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(data + 'T00:00:00');
  if (selected < today) return res.status(400).json({ error: 'Nao e possivel agendar para datas passadas' });

  // Verificar se o horario esta disponivel
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

  // Calcular valor do deposito (50%)
  const depositAmount = valor || '';
  const servicoDesc = servico + (plano ? ` - ${plano}` : '');

  // Criar agendamento com status aguardando_pagamento
  const now = new Date();
  const expiry = new Date(now.getTime() + db.PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000);
  const expiryStr = expiry.toISOString().slice(0, 19).replace('T', ' ');

  const appointment = await db.addAppointment({
    nome, whatsapp, servico, plano, data, hora, obs,
    status: 'aguardando_pagamento',
    valor: depositAmount,
    expira_em: expiryStr
  });

  // Tentar criar pagamento no Tikkie
  let paymentResult = null;
  if (depositAmount) {
    // Extrair valor numerico do deposito
    const numericAmount = depositAmount.replace(/[^0-9.,]/g, '').replace(',', '.');
    if (numericAmount) {
      const halfAmount = (parseFloat(numericAmount) / 2).toFixed(2);
      paymentResult = await tikkie.createTikkiePayment(
        halfAmount,
        `JV Beauty - Deposito: ${servicoDesc}`,
        appointment.id
      );
    }
  }

  // Atualizar agendamento com dados do Tikkie
  if (paymentResult) {
    await db.updateAppointment(appointment.id, {
      tikkie_payment_id: paymentResult.payment_id,
      tikkie_payment_url: paymentResult.payment_url
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
    tikkie_mode: paymentResult ? paymentResult.mode : 'manual'
  });
};

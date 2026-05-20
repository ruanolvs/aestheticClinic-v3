const { setCorsHeaders } = require('../../lib/utils');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo nao permitido' });

  const { data, servico } = req.query;
  if (!data) return res.status(400).json({ error: 'Parametro data e obrigatorio (YYYY-MM-DD)' });

  // Nao permitir datas passadas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(data + 'T00:00:00');
  if (selected < today) return res.status(200).json({ slots: [] });

  // Dia da semana (0=dom, 1=seg, ..., 6=sab)
  const dayOfWeek = selected.getDay();

  // Horario de funcionamento
  let startHour, endHour;
  if (dayOfWeek === 0) {
    // Domingo - fechado
    return res.status(200).json({ slots: [] });
  } else if (dayOfWeek === 6) {
    // Sabado: 09:00 - 15:00
    startHour = 9;
    endHour = 15;
  } else {
    // Seg-Sex: 09:00 - 19:00
    startHour = 9;
    endHour = 19;
  }

  // Buscar agendamentos existentes para aquela data
  const booked = await db.getBookedSlotsForDate(data);
  const bloqueios = await db.getBloqueiosForDate(data);

  // Montar lista de horarios ocupados (considerando duracao + intervalo)
  const occupiedRanges = booked.map(apt => {
    const [h, m] = apt.hora.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + db.SLOT_DURATION + db.SLOT_INTERVAL;
    return { start: startMin, end: endMin };
  });

  // Adicionar bloqueios
  for (const blk of bloqueios) {
    const [sh, sm] = blk.hora_inicio.split(':').map(Number);
    const [eh, em] = blk.hora_fim.split(':').map(Number);
    occupiedRanges.push({ start: sh * 60 + sm, end: eh * 60 + em });
  }

  // Gerar slots disponiveis
  const slots = [];
  const startMin = startHour * 60;
  const endMin = endHour * 60;

  for (let t = startMin; t + db.SLOT_DURATION <= endMin; t += db.SLOT_DURATION + db.SLOT_INTERVAL) {
    const slotStart = t;
    const slotEnd = t + db.SLOT_DURATION;

    // Verificar se o slot conflita com algum ocupado
    const isOccupied = occupiedRanges.some(range => {
      return slotStart < range.end && slotEnd > range.start;
    });

    if (!isOccupied) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');
      const hhEnd = String(Math.floor(slotEnd / 60)).padStart(2, '0');
      const mmEnd = String(slotEnd % 60).padStart(2, '0');

      // Se for hoje, nao mostrar horarios que ja passaram
      const isToday = selected.toDateString() === today.toDateString();
      if (isToday && slotStart <= today.getHours() * 60 + today.getMinutes()) {
        continue;
      }

      slots.push({
        hora: `${hh}:${mm}`,
        hora_fim: `${hhEnd}:${mmEnd}`,
        label: `${hh}:${mm} - ${hhEnd}:${mmEnd}`,
        disponivel: true
      });
    }
  }

  return res.status(200).json({ slots });
};

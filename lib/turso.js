const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const defaultServicos = [
  {
    categoria: 'Massagens',
    icone: 'fa-spa',
    descricao: 'Massagens terapeuticas e relaxantes que aliviam tensoes, melhoram a circulacao e promovem bem-estar profundo.',
    duracao: 60,
    itens: [
      { nome: '1 sessao', preco: '€75' },
      { nome: 'Plano 4 sessoes', preco: '€260' }
    ]
  },
  {
    categoria: 'Reducao de Medidas',
    icone: 'fa-ruler',
    descricao: 'Protocolos avancados de modelagem corporal para reduzir medidas e esculpir o contorno do corpo.',
    duracao: 60,
    itens: [
      { nome: '1 sessao', preco: '€80' },
      { nome: 'Plano 4 sessoes', preco: '€300' },
      { nome: 'Plano 6 sessoes', preco: '€420' },
      { nome: 'Plano 8 sessoes', preco: '€520' }
    ]
  },
  {
    categoria: 'Limpeza de Pele',
    icone: 'fa-leaf',
    descricao: 'Tratamento facial profundo que renova, hidrata e devolve o brilho natural da sua pele.',
    duracao: 60,
    itens: [
      { nome: '1 sessao', preco: '€85' }
    ]
  },
  {
    categoria: 'Plano Exclusivo',
    icone: 'fa-gem',
    descricao: 'Assinatura anual com sessoes regulares e condicoes especiais para quem busca resultados continuos.',
    duracao: 60,
    itens: [
      { nome: 'Abonamento Anual', preco: '€499' },
      { nome: 'Valor por sessao no plano', preco: '*€55', asterisk: true }
    ]
  }
];

const SLOT_DURATION = 60;
const SLOT_INTERVAL = 30;
const PAYMENT_EXPIRY_HOURS = 24;

let client = null;
let initialized = false;

function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  return client;
}

async function ensureSchema() {
  if (initialized) return;
  const db = getClient();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      email TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS agenda (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      whatsapp TEXT DEFAULT '',
      servico TEXT NOT NULL,
      plano TEXT DEFAULT '',
      data TEXT NOT NULL,
      hora TEXT DEFAULT '',
      obs TEXT DEFAULT '',
      status TEXT DEFAULT 'aguardando_pagamento',
      valor TEXT DEFAULT '',
      tikkie_payment_id TEXT DEFAULT '',
      tikkie_payment_url TEXT DEFAULT '',
      pago_em TEXT DEFAULT '',
      expira_em TEXT DEFAULT '',
      criado_em TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS bloqueios (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      motivo TEXT DEFAULT 'Bloqueado'
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      user TEXT NOT NULL,
      detail TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: add email column if missing (existing DBs)
  try {
    await db.execute('ALTER TABLE auth ADD COLUMN email TEXT NOT NULL DEFAULT ""');
  } catch {
    // Column already exists — ignore
  }

  // Seed password
  const authCheck = await db.execute('SELECT COUNT(*) as count FROM auth');
  if (authCheck.rows[0].count === 0) {
    const defaultPass = process.env.DEFAULT_PASS || '';
    const defaultEmail = process.env.DEFAULT_EMAIL || '';
    if (!defaultPass) {
      console.warn('[DB] DEFAULT_PASS not set — skipping password seed. Set it in env vars to enable login.');
    } else {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(defaultPass, salt);
      await db.execute({ sql: 'INSERT INTO auth (id, email, password_hash) VALUES (1, ?, ?)', args: [defaultEmail, hash] });
    }

    // Seed email for existing rows that have empty email
    if (defaultEmail) {
      const emailCheck = await db.execute("SELECT email FROM auth WHERE id = 1 AND (email IS NULL OR email = '')");
      if (emailCheck.rows.length > 0) {
        await db.execute({ sql: 'UPDATE auth SET email = ? WHERE id = 1', args: [defaultEmail] });
      }
    }
  }

  // Seed servicos
  const servCheck = await db.execute('SELECT COUNT(*) as count FROM servicos');
  if (servCheck.rows[0].count === 0) {
    await db.execute({ sql: 'INSERT INTO servicos (id, data) VALUES (1, ?)', args: [JSON.stringify(defaultServicos)] });
  }

  initialized = true;
}

// ========== AUTH ==========

async function getPasswordHash() {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute('SELECT password_hash as hash, email FROM auth WHERE id = 1');
  if (result.rows.length === 0) return { hash: '', email: '' };
  return { hash: result.rows[0].hash, email: result.rows[0].email || '' };
}

async function updatePasswordHash(newHash) {
  const db = getClient();
  await db.execute({ sql: 'UPDATE auth SET password_hash = ? WHERE id = 1', args: [newHash] });
}

async function getAdminEmail() {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute('SELECT email FROM auth WHERE id = 1');
  if (result.rows.length === 0) return '';
  return result.rows[0].email || '';
}

async function updateAdminEmail(newEmail) {
  const db = getClient();
  await db.execute({ sql: 'UPDATE auth SET email = ? WHERE id = 1', args: [newEmail] });
}

// ========== SERVICOS ==========

async function getServicos() {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute('SELECT data FROM servicos WHERE id = 1');
  if (result.rows.length === 0 || !result.rows[0].data) return defaultServicos;
  try { return JSON.parse(result.rows[0].data); } catch { return defaultServicos; }
}

async function saveServicos(data) {
  const db = getClient();
  await db.execute({ sql: 'UPDATE servicos SET data = ? WHERE id = 1', args: [JSON.stringify(data)] });
}

async function resetServicos() {
  const db = getClient();
  await db.execute({ sql: 'UPDATE servicos SET data = ? WHERE id = 1', args: [JSON.stringify(defaultServicos)] });
}

// ========== AGENDA ==========

async function getAgenda(statusFilter) {
  await ensureSchema();
  const db = getClient();
  if (statusFilter && statusFilter !== 'all') {
    const result = await db.execute({ sql: 'SELECT * FROM agenda WHERE status = ? ORDER BY data, hora', args: [statusFilter] });
    return result.rows;
  }
  const result = await db.execute('SELECT * FROM agenda ORDER BY data, hora');
  return result.rows;
}

async function getAppointment(id) {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute({ sql: 'SELECT * FROM agenda WHERE id = ?', args: [id] });
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function getAppointmentByTikkieId(tikkiePaymentId) {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute({
    sql: "SELECT id, nome, servico FROM agenda WHERE tikkie_payment_id = ? AND status = 'aguardando_pagamento'",
    args: [tikkiePaymentId]
  });
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function addAppointment(apt) {
  await ensureSchema();
  const db = getClient();
  const id = 'apt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  const now = new Date();
  const expiry = new Date(now.getTime() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000);
  const expiryStr = expiry.toISOString().slice(0, 19).replace('T', ' ');

  await db.execute({
    sql: `INSERT INTO agenda (id, nome, whatsapp, servico, plano, data, hora, obs, status, valor, tikkie_payment_id, tikkie_payment_url, expira_em)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, apt.nome, apt.whatsapp || '', apt.servico, apt.plano || '',
      apt.data, apt.hora || '', apt.obs || '',
      apt.status || 'aguardando_pagamento',
      apt.valor || '',
      apt.tikkie_payment_id || '',
      apt.tikkie_payment_url || '',
      apt.expira_em || expiryStr
    ]
  });

  return {
    id, nome: apt.nome, whatsapp: apt.whatsapp || '', servico: apt.servico,
    plano: apt.plano || '', data: apt.data, hora: apt.hora || '', obs: apt.obs || '',
    status: apt.status || 'aguardando_pagamento', valor: apt.valor || '',
    tikkie_payment_id: apt.tikkie_payment_id || '',
    tikkie_payment_url: apt.tikkie_payment_url || '',
    expira_em: apt.expira_em || expiryStr
  };
}

async function updateAppointment(id, updates) {
  const db = getClient();
  const existing = await db.execute({ sql: 'SELECT * FROM agenda WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) return null;

  const e = existing.rows[0];
  const merged = {
    nome: updates.nome || e.nome,
    whatsapp: updates.whatsapp !== undefined ? updates.whatsapp : e.whatsapp,
    servico: updates.servico || e.servico,
    plano: updates.plano !== undefined ? updates.plano : (e.plano || ''),
    data: updates.data || e.data,
    hora: updates.hora !== undefined ? updates.hora : e.hora,
    obs: updates.obs !== undefined ? updates.obs : e.obs,
    status: updates.status || e.status,
    valor: updates.valor !== undefined ? updates.valor : (e.valor || ''),
    tikkie_payment_id: updates.tikkie_payment_id !== undefined ? updates.tikkie_payment_id : (e.tikkie_payment_id || ''),
    tikkie_payment_url: updates.tikkie_payment_url !== undefined ? updates.tikkie_payment_url : (e.tikkie_payment_url || ''),
    pago_em: updates.pago_em !== undefined ? updates.pago_em : (e.pago_em || ''),
    expira_em: updates.expira_em !== undefined ? updates.expira_em : (e.expira_em || '')
  };

  await db.execute({
    sql: `UPDATE agenda SET nome = ?, whatsapp = ?, servico = ?, plano = ?, data = ?, hora = ?,
          obs = ?, status = ?, valor = ?, tikkie_payment_id = ?, tikkie_payment_url = ?,
          pago_em = ?, expira_em = ? WHERE id = ?`,
    args: [
      merged.nome, merged.whatsapp, merged.servico, merged.plano, merged.data, merged.hora,
      merged.obs, merged.status, merged.valor, merged.tikkie_payment_id, merged.tikkie_payment_url,
      merged.pago_em, merged.expira_em, id
    ]
  });
  return merged;
}

async function deleteAppointment(id) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM agenda WHERE id = ?', args: [id] });
}

async function getBookedSlotsForDate(date) {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute({
    sql: "SELECT hora, servico FROM agenda WHERE data = ? AND status != 'cancelado'",
    args: [date]
  });
  return result.rows;
}

// ========== BLOQUEIOS ==========

async function getBloqueiosForDate(date) {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute({
    sql: 'SELECT hora_inicio, hora_fim, motivo FROM bloqueios WHERE data = ?',
    args: [date]
  });
  return result.rows;
}

async function addBloqueio(bloqueio) {
  await ensureSchema();
  const db = getClient();
  const id = 'blk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  await db.execute({
    sql: 'INSERT INTO bloqueios (id, data, hora_inicio, hora_fim, motivo) VALUES (?, ?, ?, ?, ?)',
    args: [id, bloqueio.data, bloqueio.hora_inicio, bloqueio.hora_fim, bloqueio.motivo || 'Bloqueado']
  });
  return { id, ...bloqueio };
}

async function deleteBloqueio(id) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM bloqueios WHERE id = ?', args: [id] });
}

// ========== EXPIRED PAYMENTS ==========

async function cancelExpiredPayments() {
  await ensureSchema();
  const db = getClient();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const expired = await db.execute({
    sql: "SELECT id, nome, servico FROM agenda WHERE status = 'aguardando_pagamento' AND expira_em < ?",
    args: [now]
  });

  if (expired.rows.length > 0) {
    await db.execute({
      sql: "UPDATE agenda SET status = 'cancelado' WHERE status = 'aguardando_pagamento' AND expira_em < ?",
      args: [now]
    });

    for (const apt of expired.rows) {
      await addAuditLog('PAYMENT_EXPIRED', 'system', `Agendamento expirado: ${apt.nome} - ${apt.servico} (${apt.id})`);
    }
  }

  return expired.rows.length;
}

// ========== AUDIT ==========

async function addAuditLog(action, user, detail) {
  const db = getClient();
  await db.execute({ sql: 'INSERT INTO audit_log (action, user, detail) VALUES (?, ?, ?)', args: [action, user, detail] });
}

async function getAuditLogs() {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100');
  return result.rows;
}

module.exports = {
  ensureSchema, SLOT_DURATION, SLOT_INTERVAL, PAYMENT_EXPIRY_HOURS,
  getPasswordHash, updatePasswordHash, getAdminEmail, updateAdminEmail,
  getServicos, saveServicos, resetServicos,
  getAgenda, getAppointment, getAppointmentByTikkieId, addAppointment, updateAppointment, deleteAppointment,
  getBookedSlotsForDate,
  addBloqueio, getBloqueiosForDate, deleteBloqueio,
  cancelExpiredPayments,
  addAuditLog, getAuditLogs
};

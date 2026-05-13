const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const defaultServicos = [
  {
    categoria: 'Massagens',
    icone: 'fa-spa',
    descricao: 'Massagens terapeuticas e relaxantes que aliviam tensoes, melhoram a circulacao e promovem bem-estar profundo.',
    itens: [
      { nome: '1 sessao', preco: '€75' },
      { nome: 'Plano 4 sessoes', preco: '€260' }
    ]
  },
  {
    categoria: 'Reducao de Medidas',
    icone: 'fa-ruler',
    descricao: 'Protocolos avancados de modelagem corporal para reduzir medidas e esculpir o contorno do corpo.',
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
    itens: [
      { nome: '1 sessao', preco: '€85' }
    ]
  },
  {
    categoria: 'Plano Exclusivo',
    icone: 'fa-gem',
    descricao: 'Assinatura anual com sessoes regulares e condicoes especiais para quem busca resultados continuos.',
    itens: [
      { nome: 'Abonamento Anual', preco: '€499' },
      { nome: 'Valor por sessao no plano', preco: '*€55', asterisk: true }
    ]
  }
];

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
      data TEXT NOT NULL,
      hora TEXT DEFAULT '',
      obs TEXT DEFAULT '',
      status TEXT DEFAULT 'pendente',
      criado_em TEXT DEFAULT (datetime('now'))
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

  // Seed password
  const authCheck = await db.execute('SELECT COUNT(*) as count FROM auth');
  if (authCheck.rows[0].count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(process.env.DEFAULT_PASS, salt);
    await db.execute({ sql: 'INSERT INTO auth (id, password_hash) VALUES (1, ?)', args: [hash] });
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
  const result = await db.execute('SELECT password_hash as hash FROM auth WHERE id = 1');
  if (result.rows.length === 0) return { hash: '' };
  return { hash: result.rows[0].hash };
}

async function updatePasswordHash(newHash) {
  const db = getClient();
  await db.execute({ sql: 'UPDATE auth SET password_hash = ? WHERE id = 1', args: [newHash] });
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

async function addAppointment(apt) {
  const db = getClient();
  const id = 'apt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  await db.execute({
    sql: 'INSERT INTO agenda (id, nome, whatsapp, servico, data, hora, obs, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [id, apt.nome, apt.whatsapp || '', apt.servico, apt.data, apt.hora || '', apt.obs || '', apt.status || 'pendente']
  });
  return { id, nome: apt.nome, whatsapp: apt.whatsapp || '', servico: apt.servico, data: apt.data, hora: apt.hora || '', obs: apt.obs || '', status: apt.status || 'pendente' };
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
    data: updates.data || e.data,
    hora: updates.hora !== undefined ? updates.hora : e.hora,
    obs: updates.obs !== undefined ? updates.obs : e.obs,
    status: updates.status || e.status
  };

  await db.execute({
    sql: 'UPDATE agenda SET nome = ?, whatsapp = ?, servico = ?, data = ?, hora = ?, obs = ?, status = ? WHERE id = ?',
    args: [merged.nome, merged.whatsapp, merged.servico, merged.data, merged.hora, merged.obs, merged.status, id]
  });
  return merged;
}

async function deleteAppointment(id) {
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM agenda WHERE id = ?', args: [id] });
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
  ensureSchema,
  getPasswordHash,
  updatePasswordHash,
  getServicos,
  saveServicos,
  resetServicos,
  getAgenda,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  addAuditLog,
  getAuditLogs
};

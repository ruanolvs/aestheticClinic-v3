// ============================================
// JV BEAUTY - PAINEL ADMIN v6.0
// ============================================

const API_URL = '/api';
let authToken = null;

// ========== AUTH (API) ==========

async function apiLogin(password) {
  const url = API_URL + '/auth/login';
  console.log('[LOGIN] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  console.log('[LOGIN]', res.status, res.statusText);
  return res;
}

async function apiChangePassword(current, newPass) {
  const res = await fetch(API_URL + '/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + authToken
    },
    body: JSON.stringify({ current, newPass })
  });
  return res;
}

async function apiCheck() {
  try {
    const res = await fetch(API_URL + '/auth/check', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiFetch(endpoint, options = {}) {
  const url = API_URL + endpoint;
  console.log('[API]', options.method || 'GET', url, 'token:', authToken ? 'sim' : 'nao');
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken,
        ...(options.headers || {})
      }
    });
    console.log('[API]', res.status, res.statusText);
    return res;
  } catch (err) {
    console.error('[API] ERRO:', err.message);
    showToast('Erro de conexao com o servidor', 'error');
    throw err;
  }
}

// ========== UI AUTH ==========

function showLogin(errorMsg) {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-panel').classList.remove('visible');
  const hint = document.getElementById('login-hint');
  const error = document.getElementById('login-error');
  hint.textContent = 'Digite a senha para acessar o painel';
  if (errorMsg) error.textContent = errorMsg;
  else error.textContent = '';
  const input = document.getElementById('login-pass');
  input.value = '';
  input.focus();
}

async function showPanel() {
  console.log('[PANEL] abrindo painel...');
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').classList.add('visible');
  console.log('[PANEL] chamando renderCategories...');
  await renderCategories();
  console.log('[PANEL] chamando renderAgenda...');
  await renderAgenda();
  console.log('[PANEL] populateServiceSelect...');
  populateServiceSelect();
  const filterEl = document.getElementById('filter-status');
  if (filterEl) filterEl.value = 'all';
  updatePanelUrl();
  console.log('[PANEL] painel aberto!');
}

async function handleLogin() {
  const input = document.getElementById('login-pass');
  const error = document.getElementById('login-error');
  const pass = input.value.trim();

  if (!pass) {
    error.textContent = 'Digite a senha';
    return;
  }

  try {
    const res = await apiLogin(pass);
    const data = await res.json();

    if (res.ok && data.token) {
      authToken = data.token;
      sessionStorage.setItem('jvbeauty_token', authToken);
      error.textContent = '';
      input.value = '';
      showPanel();
    } else {
      error.textContent = data.error || 'Senha incorreta';
      input.value = '';
      input.focus();
    }
  } catch (err) {
    error.textContent = 'Erro de conexao. Verifique se o servidor esta rodando.';
  }
}

function handleLogout() {
  authToken = null;
  sessionStorage.removeItem('jvbeauty_token');
  showLogin();
}

function togglePassVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

async function handleChangePass() {
  const current = document.getElementById('pass-current').value.trim();
  const newPass = document.getElementById('pass-new').value.trim();
  const confirm = document.getElementById('pass-confirm').value.trim();
  const error = document.getElementById('pass-error');

  if (!current || !newPass || !confirm) {
    error.textContent = 'Preencha todos os campos';
    return;
  }

  if (newPass.length < 6) {
    error.textContent = 'Minimo 6 caracteres';
    return;
  }

  if (newPass !== confirm) {
    error.textContent = 'As senhas nao conferem';
    return;
  }

  try {
    const res = await apiChangePassword(current, newPass);
    const data = await res.json();

    if (res.ok) {
      document.getElementById('pass-current').value = '';
      document.getElementById('pass-new').value = '';
      document.getElementById('pass-confirm').value = '';
      error.textContent = '';
      showToast('Senha alterada com sucesso!', 'success');
    } else {
      error.textContent = data.error || 'Erro ao alterar senha';
    }
  } catch {
    error.textContent = 'Erro de conexao';
  }
}

function updatePanelUrl() {
  const urlField = document.getElementById('panel-url');
  if (urlField) urlField.value = window.location.href;
}

// ========== TABS ==========

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'agenda') renderAgenda();
      if (tab.dataset.tab === 'audit') renderAuditLog();
    });
  });
}

// ========== TOAST ==========

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast toast-' + type + ' show';
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ========== SERVICOS (API) ==========

const iconOptions = [
  { value: 'fa-spa', label: 'Spa / Massagem' },
  { value: 'fa-ruler', label: 'Regua / Medidas' },
  { value: 'fa-leaf', label: 'Folha / Natural' },
  { value: 'fa-gem', label: 'Gema / Premium' },
  { value: 'fa-face-smile', label: 'Rosto / Facial' },
  { value: 'fa-hand-sparkles', label: 'Maos / Cuidado' },
  { value: 'fa-droplet', label: 'Gota / Hidratacao' },
  { value: 'fa-wand-magic-sparkles', label: 'Varinha / Tratamento' },
  { value: 'fa-heart', label: 'Coracao / Bem-estar' },
  { value: 'fa-star', label: 'Estrela / Destaque' }
];

let servicosCache = [];
let agendaCache = [];

async function loadServicos() {
  const url = API_URL + '/servicos';
  console.log('[SERVICOS] GET', url);
  try {
    const res = await fetch(url);
    console.log('[SERVICOS]', res.status);
    if (res.ok) {
      const data = await res.json();
      servicosCache = data;
      return data;
    }
  } catch (err) {
    console.error('[SERVICOS] ERRO:', err.message);
  }
  return servicosCache;
}

async function saveServicos(data) {
  await apiFetch('/servicos', {
    method: 'PUT',
    body: JSON.stringify({ servicos: data })
  });
  servicosCache = data;
}

async function renderCategories() {
  const container = document.getElementById('categories-list');
  if (!container) return;
  const data = await loadServicos();

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Nenhum servico.</p></div>';
    return;
  }

  container.innerHTML = data.map((cat, catIndex) => `
    <div class="category-card" data-index="${catIndex}">
      <div class="category-header">
        <div>
          <h3><i class="fas ${escapeHtml(cat.icone)}"></i> ${escapeHtml(cat.categoria)}</h3>
          <span class="icon-label">${cat.itens.length} item(ns)</span>
        </div>
        <div class="category-header-actions">
          <button class="btn btn-sm" onclick="moveCategory(${catIndex}, -1)" ${catIndex === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
          <button class="btn btn-sm" onclick="moveCategory(${catIndex}, 1)" ${catIndex === data.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
          <button class="btn btn-sm" onclick="removeCategory(${catIndex})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="category-body">
        <div class="field-group">
          <label>Nome da Categoria</label>
          <input type="text" value="${escapeAttr(cat.categoria)}" onchange="updateField(${catIndex}, 'categoria', this.value)">
        </div>
        <div class="field-group">
          <label>Icone</label>
          <select onchange="updateField(${catIndex}, 'icone', this.value)">
            ${iconOptions.map(opt => `<option value="${opt.value}" ${cat.icone === opt.value ? 'selected' : ''}>${opt.label} (${opt.value})</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label>Descricao</label>
          <textarea onchange="updateField(${catIndex}, 'descricao', this.value)">${escapeHtml(cat.descricao)}</textarea>
        </div>
        <label style="font-weight:600; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; display:block;">Precos & Itens</label>
        <div class="pricing-list">
          ${cat.itens.map((item, itemIndex) => `
            <div class="pricing-item">
              <input type="text" value="${escapeAttr(item.nome)}" placeholder="Nome" onchange="updateItem(${catIndex}, ${itemIndex}, 'nome', this.value)">
              <input type="text" value="${escapeAttr(item.preco)}" placeholder="Preco" class="price-input" onchange="updateItem(${catIndex}, ${itemIndex}, 'preco', this.value)">
              <input type="checkbox" title="Asterisco (*)" ${item.asterisk ? 'checked' : ''} onchange="updateItem(${catIndex}, ${itemIndex}, 'asterisk', this.checked)">
              <button class="remove-item" onclick="removeItem(${catIndex}, ${itemIndex})" title="Remover">&times;</button>
            </div>
          `).join('')}
        </div>
        <button class="add-item-btn" onclick="addItem(${catIndex})"><i class="fas fa-plus"></i> Adicionar Item</button>
      </div>
    </div>
  `).join('');

  populateServiceSelect();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function updateField(catIndex, field, value) {
  const data = [...servicosCache];
  data[catIndex][field] = value;
  await saveServicos(data);
  renderCategories();
  showToast('Atualizado!', 'success');
}

async function updateItem(catIndex, itemIndex, field, value) {
  const data = [...servicosCache];
  data[catIndex].itens[itemIndex][field] = value;
  await saveServicos(data);
  showToast('Item atualizado!', 'success');
}

async function addItem(catIndex) {
  const data = [...servicosCache];
  data[catIndex].itens.push({ nome: 'Novo item', preco: '€0' });
  await saveServicos(data);
  renderCategories();
}

async function removeItem(catIndex, itemIndex) {
  const data = [...servicosCache];
  data[catIndex].itens.splice(itemIndex, 1);
  await saveServicos(data);
  renderCategories();
  showToast('Item removido', 'info');
}

async function addCategory() {
  const data = [...servicosCache];
  data.push({ categoria: 'Novo Servico', icone: 'fa-star', descricao: 'Descricao...', itens: [{ nome: '1 sessao', preco: '€0' }] });
  await saveServicos(data);
  renderCategories();
  showToast('Servico adicionado!', 'success');
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

async function removeCategory(catIndex) {
  const data = [...servicosCache];
  data.splice(catIndex, 1);
  await saveServicos(data);
  renderCategories();
  showToast('Categoria removida', 'info');
}

async function moveCategory(catIndex, direction) {
  const data = [...servicosCache];
  const newIndex = catIndex + direction;
  if (newIndex < 0 || newIndex >= data.length) return;
  [data[catIndex], data[newIndex]] = [data[newIndex], data[catIndex]];
  await saveServicos(data);
  renderCategories();
}

async function exportData() {
  const data = servicosCache;
  try {
    const res = await apiFetch('/agenda');
    const agenda = await res.json();
    const exportObj = { servicos: data, agenda, exportDate: new Date().toISOString() };
    const json = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jvbeauty-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exportado!', 'success');
  } catch {
    showToast('Erro ao exportar', 'error');
  }
}

function importData() {
  document.getElementById('import-file').click();
}

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const importData = JSON.parse(evt.target.result);
      if (importData.servicos) await saveServicos(importData.servicos);
      renderCategories();
      showToast('Dados importados!', 'success');
    } catch {
      showToast('Erro: arquivo invalido', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetToDefault() {
  document.getElementById('modal-reset').classList.add('show');
}

// ========== STATUS HELPERS ==========

const STATUS_LABELS = {
  aguardando_pagamento: 'Aguardando Pagamento',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado'
};

const STATUS_ICONS = {
  aguardando_pagamento: 'fa-clock',
  confirmado: 'fa-check-circle',
  cancelado: 'fa-times-circle'
};

function formatStatus(status) {
  return STATUS_LABELS[status] || status;
}

function calcDeposit(valor) {
  if (!valor) return '';
  const numeric = valor.replace(/[^0-9.,]/g, '').replace(',', '.');
  if (!numeric) return '';
  const half = (parseFloat(numeric) / 2).toFixed(2);
  return '€' + half;
}

function formatExpiry(expiraEm) {
  if (!expiraEm) return '';
  try {
    const d = new Date(expiraEm + (expiraEm.endsWith('Z') ? '' : 'Z'));
    return d.toLocaleString('pt-BR');
  } catch {
    return expiraEm;
  }
}

function formatPagoEm(pagoEm) {
  if (!pagoEm) return '';
  try {
    const d = new Date(pagoEm + (pagoEm.endsWith('Z') ? '' : 'Z'));
    return d.toLocaleString('pt-BR');
  } catch {
    return pagoEm;
  }
}

// ========== AGENDA (API) ==========

function populateServiceSelect() {
  const select = document.getElementById('apt-servico');
  if (!select) return;
  const data = servicosCache;
  select.innerHTML = data.map(cat =>
    `<option value="${escapeAttr(cat.categoria)}">${escapeHtml(cat.categoria)}</option>`
  ).join('');
  populatePlanoSelect();
}

function populatePlanoSelect() {
  const servicoSelect = document.getElementById('apt-servico');
  const planoSelect = document.getElementById('apt-plano');
  if (!servicoSelect || !planoSelect) return;

  const catName = servicoSelect.value;
  const cat = servicosCache.find(c => c.categoria === catName);

  if (!cat || !cat.itens || cat.itens.length === 0) {
    planoSelect.innerHTML = '<option value="">Nenhum plano disponivel</option>';
    return;
  }

  planoSelect.innerHTML = cat.itens.map(item =>
    `<option value="${escapeAttr(item.nome)}" data-preco="${escapeAttr(item.preco || '')}">${escapeHtml(item.nome)} — ${escapeHtml(item.preco || '')}</option>`
  ).join('');
}

async function loadAdminTimeSlots(selectedTime) {
  const data = document.getElementById('apt-data').value;
  const horaSelect = document.getElementById('apt-hora');
  if (!horaSelect) return;

  if (!data) {
    horaSelect.innerHTML = '<option value="">Selecione uma data primeiro</option>';
    return;
  }

  horaSelect.innerHTML = '<option value="">Carregando horarios...</option>';

  try {
    const res = await fetch(API_URL + '/horarios?data=' + data, {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) throw new Error('Erro');
    const result = await res.json();

    if (!result.slots || result.slots.length === 0) {
      horaSelect.innerHTML = '<option value="">Nenhum horario disponivel</option>';
      return;
    }

    horaSelect.innerHTML = '<option value="">Selecione um horario</option>' +
      result.slots.map(slot =>
        `<option value="${escapeAttr(slot.hora)}"${selectedTime === slot.hora ? ' selected' : ''}>${escapeHtml(slot.label)}</option>`
      ).join('');
  } catch {
    horaSelect.innerHTML = '<option value="">Erro ao carregar horarios</option>';
  }
}

let servicosExtras = [];

function addServicoExtra() {
  const select = document.getElementById('apt-servico');
  if (!select) return;
  const catName = select.value;
  const cat = servicosCache.find(c => c.categoria === catName);
  if (!cat) return;

  const currentIndex = servicosExtras.length;
  servicosExtras.push({ servico: catName, plano: cat.itens[0]?.nome || '', preco: cat.itens[0]?.preco || '' });

  renderServicosExtras();
  updateValorFromPlanos();
}

function removeServicoExtra(index) {
  servicosExtras.splice(index, 1);
  renderServicosExtras();
  updateValorFromPlanos();
}

function updateServicoExtra(index, field, value) {
  if (field === 'servico') {
    servicosExtras[index].servico = value;
    const cat = servicosCache.find(c => c.categoria === value);
    if (cat && cat.itens.length > 0) {
      servicosExtras[index].plano = cat.itens[0].nome;
      servicosExtras[index].preco = cat.itens[0].preco || '';
    } else {
      servicosExtras[index].plano = '';
      servicosExtras[index].preco = '';
    }
  } else if (field === 'plano') {
    servicosExtras[index].plano = value;
    const cat = servicosCache.find(c => c.categoria === servicosExtras[index].servico);
    const item = cat?.itens?.find(i => i.nome === value);
    servicosExtras[index].preco = item?.preco || '';
  }
  renderServicosExtras();
  updateValorFromPlanos();
}

function renderServicosExtras() {
  const container = document.getElementById('servicos-extras-list');
  if (!container) return;

  if (servicosExtras.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = servicosExtras.map((extra, i) => {
    const cat = servicosCache.find(c => c.categoria === extra.servico);
    const planos = cat?.itens || [];
    return `
      <div class="servico-extra-row">
        <select onchange="updateServicoExtra(${i}, 'servico', this.value)">
          ${servicosCache.map(c => `<option value="${escapeAttr(c.categoria)}" ${c.categoria === extra.servico ? 'selected' : ''}>${escapeHtml(c.categoria)}</option>`).join('')}
        </select>
        <select onchange="updateServicoExtra(${i}, 'plano', this.value)">
          ${planos.map(item => `<option value="${escapeAttr(item.nome)}" ${item.nome === extra.plano ? 'selected' : ''}>${escapeHtml(item.nome)} — ${escapeHtml(item.preco || '')}</option>`).join('')}
        </select>
        <button type="button" class="remove-extra" onclick="removeServicoExtra(${i})" title="Remover"><i class="fas fa-times"></i></button>
      </div>
    `;
  }).join('');
}

function parsePrice(preco) {
  if (!preco) return 0;
  const num = preco.replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(num) || 0;
}

function updateValorFromPlanos() {
  const planoSelect = document.getElementById('apt-plano');
  const valorInput = document.getElementById('apt-valor');
  if (!planoSelect || !valorInput) return;

  let total = 0;

  const selectedOption = planoSelect.options[planoSelect.selectedIndex];
  if (selectedOption) {
    total += parsePrice(selectedOption.dataset.preco);
  }

  servicosExtras.forEach(extra => {
    total += parsePrice(extra.preco);
  });

  valorInput.value = total > 0 ? '€' + total.toFixed(2) : '';
  updateDepositField();
  updateTikkieHint();
}

function updateTikkieHint() {
  const hint = document.getElementById('apt-tikkie-hint');
  const depositField = document.getElementById('apt-deposito');
  if (!hint || !depositField) return;
  const deposit = depositField.value;
  if (deposit) {
    hint.textContent = `Um link de pagamento Tikkie sera gerado para ${deposit} (deposito 50%).`;
  } else {
    hint.textContent = 'Um link de pagamento Tikkie sera gerado para metade do valor.';
  }
}

async function renderAgenda() {
  const container = document.getElementById('agenda-list');
  if (!container) { console.error('[AGENDA] container nao encontrado'); return; }
  const filter = document.getElementById('filter-status').value;

  let data;
  try {
    const res = await apiFetch('/agenda' + (filter !== 'all' ? '?status=' + filter : ''));
    console.log('[AGENDA] response status:', res.status);
    if (res.status === 401) {
      showToast('Sessao expirada. Faca login novamente.', 'error');
      handleLogout();
      return;
    }
    const text = await res.text();
    console.log('[AGENDA] response body:', text);
    data = JSON.parse(text);
  } catch (err) {
    console.error('[AGENDA] ERRO:', err.message);
    container.innerHTML = '<div class="agenda-empty"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar agendamentos.</p></div>';
    return;
  }

  agendaCache = data || [];
  console.log('[AGENDA] itens carregados:', agendaCache.length);

  if (data.length === 0) {
    container.innerHTML = '<div class="agenda-empty"><i class="fas fa-calendar-check"></i><p>Nenhum agendamento.</p></div>';
    return;
  }

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  container.innerHTML = data.map(apt => {
    const dateObj = new Date(apt.data + 'T00:00:00');
    const day = dateObj.getDate();
    const month = months[dateObj.getMonth()];
    const statusClass = apt.status === 'aguardando_pagamento' ? 'aguardando' : apt.status;
    const isAwaiting = apt.status === 'aguardando_pagamento';
    const deposit = calcDeposit(apt.valor);

    let quickActions = '';
    if (isAwaiting) {
      quickActions = `
        <button class="btn btn-success btn-sm" onclick="confirmPayment('${apt.id}')" title="Confirmar Pagamento"><i class="fas fa-check"></i> Confirmar Pagto</button>
        <button class="btn btn-cancel-action btn-sm" onclick="cancelAppointment('${apt.id}')" title="Cancelar"><i class="fas fa-ban"></i> Cancelar</button>
      `;
    }

    return `
      <div class="appointment-card status-${statusClass}">
        <div class="apt-info">
          <h4>${escapeHtml(apt.nome)}</h4>
          <p><i class="fas fa-cut"></i> ${escapeHtml(apt.servico)}</p>
          ${apt.plano ? '<p><i class="fas fa-tag"></i> ' + escapeHtml(apt.plano) + '</p>' : ''}
          ${apt.whatsapp ? '<p><i class="fab fa-whatsapp"></i> ' + escapeHtml(apt.whatsapp) + '</p>' : ''}
          ${apt.valor ? '<p><i class="fas fa-euro-sign"></i> Valor: ' + escapeHtml(apt.valor) + (deposit ? ' &middot; Deposito: ' + deposit : '') + '</p>' : ''}
          ${apt.obs ? '<p><i class="fas fa-sticky-note"></i> ' + escapeHtml(apt.obs) + '</p>' : ''}
          ${isAwaiting && apt.expira_em ? '<p class="apt-expiry"><i class="fas fa-hourglass-half"></i> Expira: ' + formatExpiry(apt.expira_em) + '</p>' : ''}
          ${apt.pago_em ? '<p class="apt-payed"><i class="fas fa-check-circle"></i> Pago em: ' + formatPagoEm(apt.pago_em) + '</p>' : ''}
          ${apt.tikkie_payment_url ? '<p><i class="fas fa-external-link-alt"></i> <a href="' + escapeHtml(apt.tikkie_payment_url) + '" target="_blank" rel="noopener">Link Tikkie</a></p>' : ''}
        </div>
        <div class="apt-meta">
          <div class="apt-date">
            <div class="day">${day}</div>
            <div class="month">${month}</div>
            <div class="time">${apt.hora || '--:--'}</div>
          </div>
          <span class="apt-status ${statusClass}"><i class="fas ${STATUS_ICONS[apt.status] || 'fa-circle'}"></i> ${formatStatus(apt.status)}</span>
        </div>
        <div class="apt-actions">
          ${quickActions}
          <button class="btn btn-outline btn-sm" onclick="editAppointment('${apt.id}')" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteAppointment('${apt.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `}).join('');
}

async function confirmPayment(id) {
  if (!confirm('Confirmar pagamento deste agendamento?')) return;
  try {
    const res = await apiFetch('/agenda/' + id, {
      method: 'PUT',
      body: JSON.stringify({ status: 'confirmado', pago_em: new Date().toISOString() })
    });
    if (res.ok) {
      await renderAgenda();
      showToast('Pagamento confirmado!', 'success');
    } else if (res.status === 401) {
      showToast('Sessao expirada. Faca login novamente.', 'error');
      handleLogout();
    } else {
      showToast('Erro ao confirmar pagamento', 'error');
    }
  } catch {
    // apiFetch already shows toast
  }
}

async function cancelAppointment(id) {
  if (!confirm('Cancelar este agendamento?')) return;
  try {
    const res = await apiFetch('/agenda/' + id, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelado' })
    });
    if (res.ok) {
      await renderAgenda();
      showToast('Agendamento cancelado', 'info');
    } else if (res.status === 401) {
      showToast('Sessao expirada. Faca login novamente.', 'error');
      handleLogout();
    } else {
      showToast('Erro ao cancelar agendamento', 'error');
    }
  } catch {
    // apiFetch already shows toast
  }
}

function openAppointmentModal(apt) {
  const modal = document.getElementById('modal-appointment');
  const title = document.getElementById('modal-apt-title');
  const isEdit = !!apt;

  title.textContent = isEdit ? 'Editar Agendamento' : 'Novo Agendamento';
  document.getElementById('apt-nome').value = apt ? apt.nome : '';
  document.getElementById('apt-whatsapp').value = apt ? apt.whatsapp || '' : '';
  document.getElementById('apt-servico').value = apt ? apt.servico : (servicosCache[0] || {}).categoria || '';

  populatePlanoSelect();

  if (apt && apt.plano) {
    const planoSelect = document.getElementById('apt-plano');
    for (let i = 0; i < planoSelect.options.length; i++) {
      if (planoSelect.options[i].value === apt.plano) {
        planoSelect.selectedIndex = i;
        break;
      }
    }
  }

  servicosExtras = (apt && apt.servicos_extras) ? [...apt.servicos_extras] : [];
  renderServicosExtras();

  document.getElementById('apt-data').value = apt ? apt.data : new Date().toISOString().slice(0, 10);

  if (apt && apt.hora) {
    loadAdminTimeSlots(apt.hora);
  } else {
    loadAdminTimeSlots();
  }

  document.getElementById('apt-valor').value = apt ? apt.valor || '' : '';
  document.getElementById('apt-obs').value = apt ? apt.obs || '' : '';
  document.getElementById('apt-status').value = apt ? apt.status : 'aguardando_pagamento';

  // Calculate deposit from valor
  updateDepositField();

  // Tikkie info section (editar)
  const tikkieSection = document.getElementById('apt-tikkie-info');
  if (isEdit && (apt.tikkie_payment_id || apt.tikkie_payment_url || apt.expira_em)) {
    tikkieSection.style.display = 'block';
    document.getElementById('apt-tikkie-id').value = apt.tikkie_payment_id || '';
    document.getElementById('apt-tikkie-url').value = apt.tikkie_payment_url || '';
    document.getElementById('apt-expira-em').value = formatExpiry(apt.expira_em);
    document.getElementById('apt-pago-em').value = formatPagoEm(apt.pago_em);
  } else {
    tikkieSection.style.display = 'none';
  }

  // Tikkie create section (novo agendamento)
  const tikkieCreate = document.getElementById('apt-tikkie-create');
  if (tikkieCreate) {
    if (!isEdit) {
      tikkieCreate.style.display = 'block';
      document.getElementById('apt-create-tikkie').checked = true;
    } else {
      tikkieCreate.style.display = 'none';
    }
  }

  modal.classList.add('show');
  modal.dataset.editId = apt ? apt.id : '';
}

function updateDepositField() {
  const valor = document.getElementById('apt-valor').value;
  document.getElementById('apt-deposito').value = calcDeposit(valor);
}

function closeAppointmentModal() {
  document.getElementById('modal-appointment').classList.remove('show');
  servicosExtras = [];
  renderServicosExtras();
}

async function saveAppointment() {
  const nome = document.getElementById('apt-nome').value.trim();
  const whatsapp = document.getElementById('apt-whatsapp').value.trim();
  const servico = document.getElementById('apt-servico').value;
  const plano = document.getElementById('apt-plano').value;
  const data = document.getElementById('apt-data').value;
  const hora = document.getElementById('apt-hora').value;
  const valor = document.getElementById('apt-valor').value.trim();
  const obs = document.getElementById('apt-obs').value.trim();
  const status = document.getElementById('apt-status').value;

  if (!nome || !servico || !data) {
    showToast('Preencha nome, servico e data', 'error');
    return;
  }

  if (!hora) {
    showToast('Selecione um horario disponivel', 'error');
    return;
  }

  const payload = { nome, whatsapp, servico, plano, data, hora, obs, status, valor };
  if (servicosExtras.length > 0) {
    payload.servicos_extras = servicosExtras;
  }

  const editId = document.getElementById('modal-appointment').dataset.editId;
  const createTikkie = !editId && document.getElementById('apt-create-tikkie')?.checked;
  let res;

  try {
    if (editId) {
      res = await apiFetch('/agenda/' + editId, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else if (createTikkie) {
      res = await apiFetch('/tikkie?action=create', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiFetch('/agenda', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      const result = res.status !== 204 ? await res.json().catch(() => ({})) : {};
      closeAppointmentModal();
      await renderAgenda();
      if (createTikkie && result.tikkie_url) {
        showToast('Agendamento + Tikkie criados! Link copiado.', 'success');
      } else {
        showToast(editId ? 'Agendamento atualizado!' : 'Agendamento criado!', 'success');
      }
    } else {
      if (res.status === 401) {
        showToast('Sessao expirada. Faca login novamente.', 'error');
        handleLogout();
        return;
      }
      let errMsg = 'Erro ao salvar';
      try { const err = await res.json(); errMsg = err.error || errMsg; } catch {}
      showToast(errMsg, 'error');
    }
  } catch {
    // apiFetch already shows toast on network error
  }
}

function editAppointment(id) {
  const apt = agendaCache.find(a => a.id === id);
  if (!apt) return;
  openAppointmentModal(apt);
}

async function deleteAppointment(id) {
  if (!confirm('Excluir este agendamento?')) return;
  try {
    const res = await apiFetch('/agenda/' + id, { method: 'DELETE' });
    if (res.ok) {
      await renderAgenda();
      showToast('Agendamento removido', 'info');
    } else if (res.status === 401) {
      showToast('Sessao expirada. Faca login novamente.', 'error');
      handleLogout();
    } else {
      showToast('Erro ao remover agendamento', 'error');
    }
  } catch {
    // apiFetch already shows toast
  }
}

// ========== AUDIT LOG (API) ==========

async function renderAuditLog() {
  const container = document.getElementById('audit-list');
  if (!container) return;

  let data;
  try {
    const res = await apiFetch('/audit');
    if (res.status === 401) {
      showToast('Sessao expirada. Faca login novamente.', 'error');
      handleLogout();
      return;
    }
    data = await res.json();
  } catch {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar auditoria.</p></div>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Nenhum registro de auditoria.</p></div>';
    return;
  }

  const actionLabels = {
    LOGIN: 'Login',
    CHANGE_PASS: 'Alteracao de Senha',
    UPDATE_SERVICOS: 'Servicos Atualizados',
    RESET_SERVICOS: 'Servicos Restaurados',
    CREATE_APPOINTMENT: 'Agendamento Criado',
    UPDATE_APPOINTMENT: 'Agendamento Atualizado',
    DELETE_APPOINTMENT: 'Agendamento Removido',
    PUBLIC_BOOKING: 'Agendamento Publico',
    PAYMENT_CONFIRMED: 'Pagamento Confirmado',
    PAYMENT_EXPIRED: 'Pagamento Expirado',
    PAYMENT_CANCELLED: 'Pagamento Cancelado'
  };

  const actionColors = {
    LOGIN: 'info',
    CHANGE_PASS: 'warning',
    UPDATE_SERVICOS: 'info',
    RESET_SERVICOS: 'warning',
    CREATE_APPOINTMENT: 'success',
    UPDATE_APPOINTMENT: 'success',
    DELETE_APPOINTMENT: 'danger',
    PUBLIC_BOOKING: 'success',
    PAYMENT_CONFIRMED: 'success',
    PAYMENT_EXPIRED: 'warning',
    PAYMENT_CANCELLED: 'danger'
  };

  container.innerHTML = data.map(log => {
    const action = log.action || 'UNKNOWN';
    const label = actionLabels[action] || action;
    const color = actionColors[action] || 'info';
    const date = log.created_at ? new Date(log.created_at + 'Z').toLocaleString('pt-BR') : '';

    return `
      <div class="appointment-card" style="border-left-color: var(--${color === 'info' ? 'primary' : color === 'success' ? 'success' : color === 'warning' ? 'warning' : 'danger'})">
        <div class="apt-info">
          <h4>${label}</h4>
          <p><i class="fas fa-user"></i> ${escapeHtml(log.user || '')}</p>
          ${log.detail ? '<p><i class="fas fa-info-circle"></i> ' + escapeHtml(log.detail) + '</p>' : ''}
        </div>
        <div class="apt-meta">
          <span class="apt-status ${color}" style="text-transform:none; letter-spacing:0">${date}</span>
        </div>
      </div>
    `}).join('');
}

// ========== EVENT LISTENERS ==========

document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  handleLogin();
});

document.getElementById('btn-logout').addEventListener('click', handleLogout);
document.getElementById('btn-change-pass').addEventListener('click', handleChangePass);
document.getElementById('btn-add-category').addEventListener('click', addCategory);
document.getElementById('btn-export').addEventListener('click', exportData);
document.getElementById('btn-import').addEventListener('click', importData);
document.getElementById('import-file').addEventListener('change', handleImportFile);
document.getElementById('btn-reset').addEventListener('click', resetToDefault);

document.getElementById('modal-cancel').addEventListener('click', () => {
  document.getElementById('modal-reset').classList.remove('show');
});

document.getElementById('modal-confirm').addEventListener('click', async () => {
  const res = await apiFetch('/servicos/reset', { method: 'POST' });
  if (res.ok) {
    await renderCategories();
    showToast('Restaurado para o padrao!', 'info');
  }
  document.getElementById('modal-reset').classList.remove('show');
});

document.getElementById('btn-new-appointment').addEventListener('click', () => openAppointmentModal(null));
document.getElementById('modal-apt-cancel').addEventListener('click', closeAppointmentModal);
document.getElementById('modal-apt-save').addEventListener('click', saveAppointment);
document.getElementById('filter-status').addEventListener('change', renderAgenda);

// Auto-calculate deposit when valor changes
document.getElementById('apt-valor').addEventListener('input', updateDepositField);

// When servico changes, populate plano dropdown and recalculate valor
document.getElementById('apt-servico').addEventListener('change', () => {
  populatePlanoSelect();
  updateValorFromPlanos();
});

// When plano changes, recalculate valor
document.getElementById('apt-plano').addEventListener('change', updateValorFromPlanos);

// Add servico extra button
document.getElementById('btn-add-servico-extra').addEventListener('click', addServicoExtra);

// Load time slots when date changes
document.getElementById('apt-data').addEventListener('change', () => loadAdminTimeSlots());

// Update Tikkie hint when checkbox toggled
const tikkieCheckbox = document.getElementById('apt-create-tikkie');
if (tikkieCheckbox) {
  tikkieCheckbox.addEventListener('change', function() {
    const hint = document.getElementById('apt-tikkie-hint');
    if (hint) hint.style.opacity = this.checked ? '1' : '0.4';
  });
}

const btnRefreshAudit = document.getElementById('btn-refresh-audit');
if (btnRefreshAudit) btnRefreshAudit.addEventListener('click', renderAuditLog);

// ========== INIT ==========

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();

  const savedToken = sessionStorage.getItem('jvbeauty_token');
  if (savedToken) {
    authToken = savedToken;
    const valid = await apiCheck();
    if (valid) {
      showPanel();
      return;
    }
    authToken = null;
    sessionStorage.removeItem('jvbeauty_token');
  }

  showLogin();
});

const WHATSAPP_URL = 'https://wa.me/31685580076';
const API_URL = '/api';

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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

let servicosCache = null;

async function loadServicos() {
  try {
    const res = await fetch(API_URL + '/servicos');
    if (res.ok) {
      const data = await res.json();
      servicosCache = data;
      return data;
    }
  } catch { /* API not available, fallback */ }
  return defaultServicos;
}

async function renderizarServicos() {
  const grid = document.getElementById('grid-servicos');
  if (!grid) return;
  const servicosData = await loadServicos();

  grid.innerHTML = servicosData.map((cat, index) => `
    <article class="service-card" data-aos="fade-up" data-aos-delay="${index * 100}">
      <div class="service-card-header">
        <span class="service-card-icon"><i class="fas ${escapeHtml(cat.icone)}"></i></span>
        <h3 class="service-card-title">${escapeHtml(cat.categoria)}</h3>
      </div>
      <div class="service-card-body">
        <p class="service-card-desc">${escapeHtml(cat.descricao)}</p>
        <div class="service-pricing">
          ${cat.itens.map(item => `
          <div class="service-pricing-item">
            <span class="price-label">${item.nome}</span>
            <span class="price-value${item.asterisk ? ' asterisk' : ''}">${item.preco}</span>
          </div>
        `).join('')}
        </div>
        <div class="service-card-cta">
          <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-whatsapp"></i> Agendar ${escapeHtml(cat.categoria)}
          </a>
        </div>
      </div>
    </article>
  `).join('');
}

function initFaq() {
  document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.parentElement;
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(other => {
        other.classList.remove('active');
        other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if (!isActive) {
        item.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

function initMenuMobile() {
  const menuToggle = document.getElementById('mobile-menu');
  const navLinks = document.querySelector('.nav-links');
  if (!menuToggle || !navLinks) return;

  function closeMenu() {
    navLinks.classList.remove('active');
    menuToggle.classList.remove('is-active');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('active');
    menuToggle.classList.toggle('is-active');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
      closeMenu();
    }
  });
}

function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  function update() {
    const scrollY = window.scrollY + 150;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) link.classList.add('active');
        });
      }
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initHeaderScroll() {
  const header = document.getElementById('header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  renderizarServicos();
  initFaq();
  initMenuMobile();
  initScrollSpy();
  initHeaderScroll();
  initBookingForm();

  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, easing: 'ease-out-quad', once: true, offset: 80 });
  }
});

// ========== BOOKING FORM - STEPPER ==========

function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;

  populateBookingSelects();
  document.getElementById('book-servico').addEventListener('change', updatePlanOptions);

  // Carregar slots quando mudar a data
  document.getElementById('book-data').addEventListener('change', loadTimeSlots);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitBooking();
  });
}

// Stepper navigation
function nextStep(step) {
  const currentStep = step - 1;

  if (currentStep === 1) {
    const nome = document.getElementById('book-nome').value.trim();
    if (!nome) {
      document.getElementById('book-nome').focus();
      return;
    }
  }

  if (currentStep === 2) {
    const servico = document.getElementById('book-servico').value;
    if (!servico) {
      document.getElementById('book-servico').focus();
      return;
    }
  }

  if (currentStep === 3) {
    const hora = document.getElementById('book-hora').value;
    const data = document.getElementById('book-data').value;
    if (!data) {
      document.getElementById('book-data').focus();
      return;
    }
    if (!hora) {
      showBookingFeedback('Selecione um horario disponivel.', 'error');
      return;
    }
  }

  goToStep(step);
}

function prevStep(step) {
  goToStep(step);
}

function goToStep(step) {
  document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
  const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);
  if (targetStep) targetStep.classList.add('active');

  document.querySelectorAll('.step-item').forEach(el => {
    const stepNum = parseInt(el.dataset.step);
    el.classList.remove('active', 'completed');
    if (stepNum === step) el.classList.add('active');
    else if (stepNum < step) el.classList.add('completed');
  });

  document.querySelectorAll('.step-line').forEach((line, index) => {
    if (index < step - 1) line.classList.add('active');
    else line.classList.remove('active');
  });

  if (step === 4) buildBookingSummary();

  document.querySelector('.agendar-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== TIME SLOTS ==========

async function loadTimeSlots() {
  const data = document.getElementById('book-data').value;
  const slotsContainer = document.getElementById('time-slots');
  if (!data || !slotsContainer) return;

  slotsContainer.innerHTML = '<p class="slots-placeholder"><i class="fas fa-spinner fa-spin"></i> Carregando horarios...</p>';

  try {
    const res = await fetch(`${API_URL}/horarios?data=${data}`);
    if (!res.ok) throw new Error('Erro ao carregar horarios');
    const result = await res.json();

    if (result.slots.length === 0) {
      slotsContainer.innerHTML = '<p class="slots-placeholder"><i class="fas fa-calendar-times"></i> Nenhum horario disponivel nesta data</p>';
      return;
    }

    slotsContainer.innerHTML = result.slots.map(slot => `
      <button type="button" class="time-slot-btn" data-time="${slot.hora}" onclick="selectTimeSlot(this)">
        <i class="fas fa-clock"></i>
        <span>${slot.label}</span>
      </button>
    `).join('');
  } catch {
    slotsContainer.innerHTML = '<p class="slots-placeholder"><i class="fas fa-exclamation-circle"></i> Erro ao carregar. Tente novamente.</p>';
  }
}

function selectTimeSlot(btn) {
  // Remove selecao anterior
  document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
  // Marca nova selecao
  btn.classList.add('selected');
  document.getElementById('book-hora').value = btn.dataset.time;
}

// ========== BUILD SUMMAR ==========

function buildBookingSummary() {
  const summary = document.getElementById('booking-summary');
  if (!summary) return;

  const nome = document.getElementById('book-nome').value.trim();
  const whatsapp = document.getElementById('book-whatsapp').value.trim();
  const servico = document.getElementById('book-servico');
  const servicoText = servico.options[servico.selectedIndex]?.text || '';
  const plano = document.getElementById('book-plano');
  const planoText = plano.options[plano.selectedIndex]?.text || '';
  const data = document.getElementById('book-data').value;
  const hora = document.getElementById('book-hora').value;
  const obs = document.getElementById('book-obs').value.trim();
  const dataFormatada = data ? data.split('-').reverse().join('/') : '';

  // Calcular deposito
  const preçoTexto = planoText.includes('-') ? planoText.split('-').pop().trim() : '';
  let depositText = '';
  if (preçoTexto) {
    const numeric = preçoTexto.replace(/[^0-9.,]/g, '').replace(',', '.');
    if (numeric) {
      const half = (parseFloat(numeric) / 2).toFixed(2);
      depositText = `€${half}`;
    }
  }

  let rows = `
    <div class="booking-summary-row">
      <span class="summary-label"><i class="fas fa-user"></i> Nome</span>
      <span class="summary-value">${escapeHtml(nome)}</span>
    </div>`;

  if (whatsapp) rows += `
    <div class="booking-summary-row">
      <span class="summary-label"><i class="fab fa-whatsapp"></i> WhatsApp</span>
      <span class="summary-value">${escapeHtml(whatsapp)}</span>
    </div>`;

  rows += `
    <div class="booking-summary-row">
      <span class="summary-label"><i class="fas fa-spa"></i> Servico</span>
      <span class="summary-value">${escapeHtml(servicoText)}</span>
    </div>`;

  if (planoText) rows += `
    <div class="booking-summary-row">
      <span class="summary-label"><i class="fas fa-tag"></i> Plano</span>
      <span class="summary-value">${escapeHtml(planoText)}</span>
    </div>`;

  if (dataFormatada) rows += `
    <div class="booking-summary-row">
      <span class="summary-label"><i class="fas fa-calendar"></i> Data</span>
      <span class="summary-value">${dataFormatada}</span>
    </div>`;

  if (hora) rows += `
    <div class="booking-summary-row">
      <span class="summary-label"><i class="fas fa-clock"></i> Horario</span>
      <span class="summary-value">${hora}</span>
    </div>`;

  if (obs) rows += `
    <div class="booking-summary-row">
      <span class="summary-label"><i class="fas fa-comment"></i> Obs</span>
      <span class="summary-value">${escapeHtml(obs)}</span>
    </div>`;

  if (depositText) rows += `
    <div class="booking-summary-row booking-deposit">
      <span class="summary-label"><i class="fas fa-credit-card"></i> Deposito 50%</span>
      <span class="summary-value">${depositText}</span>
    </div>`;

  summary.innerHTML = rows;
}

// ========== SUBMIT BOOKING ==========

async function populateBookingSelects() {
  const data = servicosCache || await loadServicos();
  const servicoSelect = document.getElementById('book-servico');
  if (!servicoSelect) return;

  servicoSelect.innerHTML = '<option value="">Selecione um servico</option>' +
    data.map(cat => `<option value="${cat.categoria}">${cat.categoria}</option>`).join('');

  updatePlanOptions();
}

function updatePlanOptions() {
  const data = servicosCache || defaultServicos;
  const servicoSelect = document.getElementById('book-servico');
  const planoSelect = document.getElementById('book-plano');
  if (!servicoSelect || !planoSelect) return;

  const selected = servicoSelect.value;
  const cat = data.find(c => c.categoria === selected);

  if (!cat) {
    planoSelect.innerHTML = '<option value="">Selecione um servico primeiro</option>';
    return;
  }

  planoSelect.innerHTML = cat.itens.map(item =>
    `<option value="${item.nome} - ${item.preco}">${item.nome} - ${item.preco}</option>`
  ).join('');

  // Atualizar valor hidden
  const firstItem = cat.itens[0];
  if (firstItem) {
    document.getElementById('book-valor').value = firstItem.preco;
  }
}

async function submitBooking() {
  const nome = document.getElementById('book-nome').value.trim();
  const whatsapp = document.getElementById('book-whatsapp').value.trim();
  const servico = document.getElementById('book-servico').value;
  const plano = document.getElementById('book-plano').value;
  const data = document.getElementById('book-data').value;
  const hora = document.getElementById('book-hora').value;
  const obs = document.getElementById('book-obs').value.trim();
  const valor = document.getElementById('book-valor').value;

  if (!nome || !servico || !data || !hora) {
    showBookingFeedback('Preencha todos os campos obrigatorios.', 'error');
    return;
  }

  const submitBtn = document.querySelector('.agendar-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

  try {
    const res = await fetch(API_URL + '/tikkie/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, whatsapp, servico, plano, data, hora, obs, valor })
    });

    const result = await res.json();

    if (!res.ok) {
      showBookingFeedback(result.error || 'Erro ao criar agendamento.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-lock"></i> Confirmar e Pagar Deposito';
      return;
    }

    // Sucesso - agendamento criado
    showBookingFeedback('Agendamento registrado!', 'success');

    // Se tem URL do Tikkie (API configurada), redirecionar
    if (result.tikkie_url) {
      setTimeout(() => {
        window.location.href = result.tikkie_url;
      }, 1500);
    } else {
      // Modo manual - enviar dados via WhatsApp para a Janaina criar o Tikkie
      const dataFormatada = data.split('-').reverse().join('/');
      const servicoDesc = servico + (plano ? ` - ${plano}` : '');
      // Calcular deposito
      const preçoTexto = plano.includes('-') ? plano.split('-').pop().trim() : valor;
      const numeric = preçoTexto.replace(/[^0-9.,]/g, '').replace(',', '.');
      const halfAmount = numeric ? (parseFloat(numeric) / 2).toFixed(2) : '';

      let msg = `*Novo Agendamento - JV Beauty*\n\n`;
      msg += `*Nome:* ${nome}\n`;
      if (whatsapp) msg += `*WhatsApp:* ${whatsapp}\n`;
      msg += `*Servico:* ${servicoDesc}\n`;
      msg += `*Data:* ${dataFormatada}\n`;
      msg += `*Horario:* ${hora}\n`;
      if (halfAmount) msg += `*Deposito 50%:* €${halfAmount}\n`;
      if (obs) msg += `*Observacoes:* ${obs}\n`;
      msg += `\n_Status: Aguardando pagamento via Tikkie_`;
      msg += `\n_ID: ${result.id}_`;

      const url = WHATSAPP_URL + '?text=' + encodeURIComponent(msg);
      setTimeout(() => {
        window.open(url, '_blank');
      }, 1000);
    }

    // Reset form
    document.getElementById('booking-form').reset();
    populateBookingSelects();
    goToStep(1);

  } catch {
    showBookingFeedback('Erro de conexao. Tente novamente.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-lock"></i> Confirmar e Pagar Deposito';
  }
}

function showBookingFeedback(message, type) {
  let feedback = document.getElementById('booking-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'booking-feedback';
    feedback.className = 'booking-feedback';
    const card = document.querySelector('.agendar-card');
    card.insertBefore(feedback, card.firstChild);
  }

  feedback.textContent = message;
  feedback.className = 'booking-feedback ' + type;
  feedback.style.display = 'block';

  setTimeout(() => { feedback.style.display = 'none'; }, 4000);
}

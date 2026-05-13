const WHATSAPP_URL = 'https://wa.me/31685580076';
const API_URL = '/api';

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
        <span class="service-card-icon"><i class="fas ${cat.icone}"></i></span>
        <h3 class="service-card-title">${cat.categoria}</h3>
      </div>
      <div class="service-card-body">
        <p class="service-card-desc">${cat.descricao}</p>
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
            <i class="fab fa-whatsapp"></i> Agendar ${cat.categoria}
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
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
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

  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    if (currentScroll > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
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
    AOS.init({
      duration: 800,
      easing: 'ease-out-quad',
      once: true,
      offset: 80
    });
  }
});

// ========== BOOKING FORM ==========

function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;

  populateBookingSelects();

  document.getElementById('book-servico').addEventListener('change', updatePlanOptions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateBookingDate() && validateBookingTime()) {
      sendBookingWhatsApp();
    }
  });
}

function validateBookingDate() {
  const dataInput = document.getElementById('book-data');
  if (!dataInput) return true;
  const selected = dataInput.value;
  if (!selected) {
    dataInput.setCustomValidity('Selecione uma data para o agendamento.');
    dataInput.reportValidity();
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(selected + 'T00:00:00');

  if (selectedDate < today) {
    dataInput.setCustomValidity('Nao e possivel agendar para datas passadas.');
    dataInput.reportValidity();
    return false;
  }

  dataInput.setCustomValidity('');
  return true;
}

function validateBookingTime() {
  const dataInput = document.getElementById('book-data');
  const horaInput = document.getElementById('book-hora');
  if (!dataInput || !horaInput) return true;

  const data = dataInput.value;
  const hora = horaInput.value;
  if (!data || !hora) return true;

  const today = new Date();
  const todayStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');

  if (data === todayStr && hora) {
    const [h, m] = hora.split(':').map(Number);
    const nowMin = today.getHours() * 60 + today.getMinutes();
    const selectedMin = h * 60 + m;

    if (selectedMin <= nowMin) {
      horaInput.setCustomValidity('Este horario ja passou. Escolha um horario futuro.');
      horaInput.reportValidity();
      return false;
    }
  }

  horaInput.setCustomValidity('');
  return true;
}

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
}

async function sendBookingWhatsApp() {
  const nome = document.getElementById('book-nome').value.trim();
  const whatsapp = document.getElementById('book-whatsapp').value.trim();
  const servico = document.getElementById('book-servico').value;
  const plano = document.getElementById('book-plano').value;
  const data = document.getElementById('book-data').value;
  const hora = document.getElementById('book-hora').value;
  const obs = document.getElementById('book-obs').value.trim();

  if (!nome || !servico || !data) {
    showBookingFeedback('Por favor, preencha seu nome, servico e data.', 'error');
    return;
  }

  // Salvar na API primeiro
  try {
    const res = await fetch(API_URL + '/agenda/public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, whatsapp, servico: servico + (plano ? ' - ' + plano : ''), data, hora, obs })
    });

    if (!res.ok) {
      const err = await res.json();
      showBookingFeedback(err.error || 'Erro ao agendar. Tente novamente.', 'error');
      return;
    }
  } catch {
    showBookingFeedback('Erro de conexao. Tente novamente.', 'error');
    return;
  }

  showBookingFeedback('Agendamento registrado com sucesso!', 'success');

  // Abrir WhatsApp como notificacao adicional
  const dataFormatada = data.split('-').reverse().join('/');

  let msg = `*Novo Agendamento - JV Beauty*\n\n`;
  msg += `*Nome:* ${nome}\n`;
  if (whatsapp) msg += `*WhatsApp:* ${whatsapp}\n`;
  msg += `*Servico:* ${servico}\n`;
  if (plano) msg += `*Plano:* ${plano}\n`;
  msg += `*Data:* ${dataFormatada}\n`;
  if (hora) msg += `*Horario:* ${hora}\n`;
  if (obs) msg += `*Observacoes:* ${obs}\n`;
  msg += `\n_Enviado pelo site jvbeauty.nl_`;

  const url = WHATSAPP_URL + '?text=' + encodeURIComponent(msg);
  window.open(url, '_blank');

  document.getElementById('booking-form').reset();
  populateBookingSelects();
}

function showBookingFeedback(message, type) {
  let feedback = document.getElementById('booking-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'booking-feedback';
    feedback.className = 'booking-feedback';
    const submitBtn = document.querySelector('.agendar-submit');
    submitBtn.parentNode.insertBefore(feedback, submitBtn);
  }

  feedback.textContent = message;
  feedback.className = 'booking-feedback ' + type;
  feedback.style.display = 'block';

  setTimeout(() => { feedback.style.display = 'none'; }, 4000);
}

const servicosData = [
    { categoria: "Massagens", itens: [{ nome: "1 sessão", preco: "€75" }, { nome: "Plano 4 sessões", preco: "€260" }] },
    { categoria: "Redução de Medidas", itens: [{ nome: "1 sessão", preco: "€80" }, { nome: "Plano 4 sessões", preco: "€300" }, { nome: "Plano 6 sessões", preco: "€420" }, { nome: "Plano 8 sessões", preco: "€520" }] },
    { categoria: "Limpeza de Pele", itens: [{ nome: "1 sessão", preco: "€85" }] },
    { categoria: "Plano Exclusivo", itens: [{ nome: "Abonamento Anual", preco: "€499" }, { nome: "Valor por sessão no plano", preco: "*€55" }] }
];

function renderizarServicos() {
    const grid = document.getElementById('grid-servicos');
    if (!grid) return;

    grid.innerHTML = servicosData.map((cat, index) => `
        <div class="card" data-aos="fade-up" data-aos-delay="${index * 100}">
            <h3>${cat.categoria}</h3>
            ${cat.itens.map(item => `
                <div class="service-item">
                    <span>${item.nome}</span>
                    <strong>${item.preco}</strong>
                </div>
            `).join('')}
        </div>
    `).join('');
}

function initFaq() {
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const item = button.parentElement;
            document.querySelectorAll('.faq-item').forEach(other => {
                if(other !== item) other.classList.remove('active');
            });
            item.classList.toggle('active');
        });
    });
}

// ### NOVA FUNÇÃO: Gerenciamento do Menu Mobile
function initMenuMobile() {
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (!menuToggle || !navLinks) return;

    menuToggle.addEventListener('click', () => {
        // Alterna a visibilidade do menu
        navLinks.classList.toggle('active');
        // Alterna a animação visual do botão hambúrguer (X)
        menuToggle.classList.toggle('is-active');
    });

    // Fecha o menu ao clicar em qualquer link (importante para UX)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            menuToggle.classList.remove('is-active');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderizarServicos();
    initFaq();
    initMenuMobile(); // Inicializa o comportamento do hambúrguer
    
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-out-quad',
            once: true
        });
    }
});
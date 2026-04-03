// Dados dos Serviços
const servicosData = [
    {
        categoria: "Massagens",
        itens: [
            { nome: "1 sessão", preco: "€75" },
            { nome: "Plano 4 sessões", preco: "€260" }
        ]
    },
    {
        categoria: "Redução de Medidas",
        itens: [
            { nome: "1 sessão", preco: "€80" },
            { nome: "Plano 6 sessões", preco: "€420" }
        ]
    },
    {
        categoria: "Limpeza de Pele",
        itens: [
            { nome: "1 sessão", preco: "€85" }
        ]
    }
];

// Renderizar Serviços nos Cards
function renderizarServicos() {
    const grid = document.getElementById('grid-servicos');
    if (!grid) return;

    grid.innerHTML = servicosData.map(cat => `
        <div class="card">
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

// Lógica do FAQ (Abrir/Fechar)
function initFaq() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            // Fecha outros abertos
            document.querySelectorAll('.faq-item').forEach(other => {
                if (other !== item) other.classList.remove('active');
            });
            item.classList.toggle('active');
        });
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    renderizarServicos();
    initFaq();
});
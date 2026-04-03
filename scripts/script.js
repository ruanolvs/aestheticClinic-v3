// Dados dos Serviços - FIEL À TABELA DE PREÇOS OFICIAL
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
            { nome: "Plano 4 sessões", preco: "€300" },
            { nome: "Plano 6 sessões", preco: "€420" },
            { nome: "Plano 8 sessões", preco: "€520" }
        ]
    },
    {
        categoria: "Limpeza de Pele",
        itens: [
            { nome: "1 sessão", preco: "€85" }
        ]
    },
    {
        categoria: "Plano Exclusivo",
        itens: [
            { nome: "Abonamento Anual", preco: "€499" },
            { nome: "Valor por sessão no plano", preco: "*€55" }
        ]
    }
];

// Função para renderizar os serviços na tela
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

// Lógica para abrir/fechar o FAQ
function initFaq() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            // Fecha outros que possam estar abertos para um visual mais limpo
            document.querySelectorAll('.faq-item').forEach(other => {
                if (other !== item) other.classList.remove('active');
            });
            item.classList.toggle('active');
        });
    });
}

// Inicializa tudo quando o documento carregar
document.addEventListener('DOMContentLoaded', () => {
    renderizarServicos();
    initFaq();
});
// Estado da aplicação
let state = {
    concurso: null,
    baralho: null,
    cards: [],
    cardAtual: 0,
    acertos: 0,
    erros: 0,
    revisados: 0,
    total: 0
};

// Carregar dados do flashcards
async function carregarFlashcards() {
    try {
        const response = await fetch('/flashcards/data/flashcards.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao carregar flashcards:', error);
        return null;
    }
}

// Selecionar baralho
async function selecionarBaralho(concursoId, baralhoId) {
    const data = await carregarFlashcards();
    if (!data) return;
    
    const concurso = data[concursoId];
    if (!concurso) return;
    
    const baralho = concurso.baralhos[baralhoId];
    if (!baralho) return;
    
    state.concurso = concursoId;
    state.baralho = baralhoId;
    state.cards = baralho.cards.map(c => ({ ...c, revisado: false }));
    state.cardAtual = 0;
    state.acertos = 0;
    state.erros = 0;
    state.revisados = 0;
    state.total = state.cards.length;
    
    iniciarEstudo();
}

// Iniciar estudo
function iniciarEstudo() {
    const container = document.getElementById('app');
    
    if (state.cards.length === 0) {
        container.innerHTML = `
            <div class="finalizado">
                <h2>🎉 Nenhum card encontrado!</h2>
                <p>Este baralho está vazio.</p>
                <a href="/flashcards/" class="btn btn-voltar">Voltar</a>
            </div>
        `;
        return;
    }
    
    mostrarCard();
}

// Mostrar card atual
function mostrarCard() {
    const container = document.getElementById('app');
    const card = state.cards[state.cardAtual];
    
    if (!card) {
        mostrarFinalizado();
        return;
    }
    
    const progresso = ((state.revisados) / state.total * 100);
    
    container.innerHTML = `
        <div class="progress-container">
            <div class="progress-info">
                <span>Card ${state.revisados + 1} de ${state.total}</span>
                <span>${Math.round(progresso)}% concluído</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${progresso}%"></div>
            </div>
        </div>
        
        <div class="flashcard-container" id="flashcard" onclick="virarCard()">
            <div class="frente" id="frente">
                ${card.frente}
            </div>
            <div class="verso" id="verso" style="display: none;">
                ${card.verso}
            </div>
            <div class="dica" id="dica">👆 Clique para ver a resposta</div>
        </div>
        
        <div class="botoes" id="botoes" style="display: none;">
            <button class="btn btn-dificil" onclick="avaliar(0)">😰 Esqueci</button>
            <button class="btn btn-medio" onclick="avaliar(3)">🤔 Médio</button>
            <button class="btn btn-facil" onclick="avaliar(5)">😊 Fácil</button>
        </div>
        
        <div class="estatisticas">
            <span class="acertos">✅ Acertos: <span class="numero">${state.acertos}</span></span>
            <span class="erros">❌ Erros: <span class="numero">${state.erros}</span></span>
            <span>📊 Revisados: <span class="numero">${state.revisados}</span></span>
        </div>
    `;
}

// Virar o card (mostrar resposta)
function virarCard() {
    const frente = document.getElementById('frente');
    const verso = document.getElementById('verso');
    const dica = document.getElementById('dica');
    const botoes = document.getElementById('botoes');
    
    if (frente.style.display !== 'none') {
        frente.style.display = 'none';
        verso.style.display = 'block';
        dica.textContent = '📝 Como você se saiu?';
        botoes.style.display = 'flex';
    }
}

// Avaliar o card
function avaliar(nota) {
    const card = state.cards[state.cardAtual];
    card.revisado = true;
    state.revisados++;
    
    if (nota >= 4) {
        state.acertos++;
    } else {
        state.erros++;
    }
    
    // Avança para o próximo card
    state.cardAtual++;
    
    // Verifica se terminou
    if (state.cardAtual >= state.cards.length) {
        mostrarFinalizado();
    } else {
        mostrarCard();
    }
}

// Mostrar tela de finalizado
function mostrarFinalizado() {
    const container = document.getElementById('app');
    
    const taxaAcerto = state.total > 0 ? Math.round((state.acertos / state.total) * 100) : 0;
    
    container.innerHTML = `
        <div class="finalizado">
            <h2>🎉 Estudo concluído!</h2>
            <p>Você revisou <strong>${state.total}</strong> cards.</p>
            <p>✅ Acertos: <strong>${state.acertos}</strong></p>
            <p>❌ Erros: <strong>${state.erros}</strong></p>
            <p>📊 Taxa de acerto: <strong>${taxaAcerto}%</strong></p>
            <br>
            <a href="/flashcards/" class="btn btn-voltar">⬅ Voltar aos baralhos</a>
            <a href="#" class="btn btn-facil" onclick="reiniciar()">🔄 Revisar novamente</a>
        </div>
    `;
}

// Reiniciar o estudo
function reiniciar() {
    state.cards.forEach(c => c.revisado = false);
    state.cardAtual = 0;
    state.acertos = 0;
    state.erros = 0;
    state.revisados = 0;
    iniciarEstudo();
}

// Página inicial - listar baralhos
async function paginaInicial() {
    const container = document.getElementById('app');
    const data = await carregarFlashcards();
    
    if (!data) {
        container.innerHTML = `
            <div class="finalizado">
                <h2>⚠️ Erro ao carregar</h2>
                <p>Não foi possível carregar os flashcards.</p>
            </div>
        `;
        return;
    }
    
    // Pega o primeiro concurso (seduc-ms-2022)
    const concursoId = Object.keys(data)[0];
    const concurso = data[concursoId];
    
    let html = `
        <h2 style="margin: 1rem 0 0.5rem; color: #1a1a2e;">📚 ${concurso.nome}</h2>
        <p style="color: #6c757d; margin-bottom: 1rem;">Escolha uma matéria para estudar</p>
        <div class="baralhos-grid">
    `;
    
    for (const [id, baralho] of Object.entries(concurso.baralhos)) {
        html += `
            <div class="baralho-card" onclick="selecionarBaralho('${concursoId}', '${id}')">
                <h3>${baralho.nome}</h3>
                <p>${baralho.cards.length} cards</p>
                <span class="qtd">${baralho.cards.length} questões</span>
            </div>
        `;
    }
    
    html += `
        </div>
        <div style="margin-top: 2rem; text-align: center; color: #6c757d; font-size: 0.9rem;">
            <p>💡 Clique em um baralho para começar a estudar</p>
        </div>
    `;
    
    container.innerHTML = html;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se há um baralho selecionado via URL
    const urlParams = new URLSearchParams(window.location.search);
    const concurso = urlParams.get('concurso');
    const baralho = urlParams.get('baralho');
    
    if (concurso && baralho) {
        selecionarBaralho(concurso, baralho);
    } else {
        paginaInicial();
    }
});

// Exportar funções para o escopo global
window.selecionarBaralho = selecionarBaralho;
window.virarCard = virarCard;
window.avaliar = avaliar;
window.reiniciar = reiniciar;

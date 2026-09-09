// ==========================================
// ALGORITMO SM-2 (Repetição Espaçada)
// ==========================================

// Estado da aplicação
let state = {
    concurso: null,
    baralho: null,
    cards: [],
    cardAtual: 0,
    acertos: 0,
    erros: 0,
    revisados: 0,
    total: 0,
    sessionId: null,
    acessoLiberado: false
};

// Constantes do SM-2
const SM2 = {
    FATOR_INICIAL: 2.5,
    INTERVALO_INICIAL: 0,
    MINIMO_FATOR: 1.3,
    MAXIMO_FATOR: 2.5
};

// ==========================================
// FUNÇÕES DE SALVAMENTO (localStorage)
// ==========================================

function salvarProgresso() {
    if (!state.concurso || !state.baralho) return;
    
    const key = `flashcards_${state.concurso}_${state.baralho}`;
    const dados = {
        cards: state.cards.map(c => ({
            id: c.id,
            frente: c.frente,
            verso: c.verso,
            dificuldade: c.dificuldade,
            intervalo: c.intervalo || 0,
            fator: c.fator || SM2.FATOR_INICIAL,
            proxima_revisao: c.proxima_revisao || null,
            revisado: c.revisado || false,
            acertos: c.acertos || 0,
            erros: c.erros || 0
        })),
        stats: {
            total_revisoes: state.total_revisoes || 0,
            ultimo_estudo: new Date().toISOString()
        }
    };
    
    localStorage.setItem(key, JSON.stringify(dados));
}

function carregarProgresso(concursoId, baralhoId) {
    const key = `flashcards_${concursoId}_${baralhoId}`;
    const dados = localStorage.getItem(key);
    
    if (dados) {
        try {
            return JSON.parse(dados);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// ==========================================
// ALGORITMO SM-2
// ==========================================

function calcularProximoIntervalo(qualidade, intervaloAtual, fator) {
    // Qualidade: 0-5 (0=esqueci, 5=fácil)
    const qualidadeMap = {
        0: { intervalo: 0, fator_ajuste: 0.0 },
        1: { intervalo: 1, fator_ajuste: 0.0 },
        2: { intervalo: 2, fator_ajuste: 0.0 },
        3: { intervalo: 4, fator_ajuste: 1.3 },
        4: { intervalo: 7, fator_ajuste: 1.5 },
        5: { intervalo: 14, fator_ajuste: 1.7 }
    };
    
    const dados = qualidadeMap[qualidade] || qualidadeMap[3];
    
    // Novo fator
    let novoFator = fator + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02));
    novoFator = Math.max(SM2.MINIMO_FATOR, Math.min(SM2.MAXIMO_FATOR, novoFator));
    
    // Novo intervalo
    let novoIntervalo;
    if (intervaloAtual === 0) {
        novoIntervalo = dados.intervalo;
    } else if (intervaloAtual === 1) {
        novoIntervalo = dados.intervalo > 1 ? dados.intervalo : 6;
    } else {
        novoIntervalo = Math.round(intervaloAtual * novoFator);
    }
    
    // Data da próxima revisão
    const proximaData = new Date();
    proximaData.setDate(proximaData.getDate() + novoIntervalo);
    
    return {
        intervalo: novoIntervalo,
        fator: novoFator,
        proxima_revisao: proximaData.toISOString()
    };
}

// ==========================================
// FUNÇÕES PRINCIPAIS
// ==========================================

// Verificar acesso via Stripe
async function verificarAcesso() {
    const urlParams = new URLSearchParams(window.location.search);
    state.sessionId = urlParams.get('session_id');
    
    if (!state.sessionId) {
        // Tenta carregar do localStorage
        const savedSession = localStorage.getItem('flashcards_session_id');
        if (savedSession) {
            state.sessionId = savedSession;
        } else {
            return false;
        }
    }
    
    try {
        const response = await fetch(`/api/check-session/${state.sessionId}`);
        const data = await response.json();
        
        if (data.status === 'paid') {
            state.acessoLiberado = true;
            localStorage.setItem('flashcards_session_id', state.sessionId);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        return false;
    }
}

// Carregar dados dos flashcards
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

/// Selecionar baralho
async function selecionarBaralho(concursoId, baralhoId) {
    // Verifica acesso
    const temAcesso = await verificarAcesso();
    if (!temAcesso) {
        mostrarAcessoNegado();
        return;
    }
    
    const data = await carregarFlashcards();
    if (!data) return;
    
    const concurso = data[concursoId];
    if (!concurso) return;
    
    const baralho = concurso.baralhos[baralhoId];
    if (!baralho) return;
    
    state.concurso = concursoId;
    state.baralho = baralhoId;
    
    // Tenta carregar progresso salvo
    const progressoSalvo = carregarProgresso(concursoId, baralhoId);
    
    if (progressoSalvo) {
        state.cards = progressoSalvo.cards;
        state.total = state.cards.length;
        state.total_revisoes = progressoSalvo.stats.total_revisoes || 0;
    } else {
        // Inicializa novos cards
        state.cards = baralho.cards.map(c => ({
            ...c,
            intervalo: 0,
            fator: SM2.FATOR_INICIAL,
            proxima_revisao: null,
            revisado: false,
            acertos: 0,
            erros: 0
        }));
        state.total = state.cards.length;
        state.total_revisoes = 0;
    }
    
    // Filtra cards que precisam ser revisados (ou todos se for primeira vez)
    const hoje = new Date();
    const cardsParaRevisar = state.cards.filter(c => {
        if (!c.revisado) return true;
        if (!c.proxima_revisao) return true;
        const dataRevisao = new Date(c.proxima_revisao);
        return dataRevisao <= hoje;
    });
    
    if (cardsParaRevisar.length === 0) {
        mostrarParabens();
        return;
    }
    
    state.cards = cardsParaRevisar;
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
        mostrarParabens();
        return;
    }
    
    mostrarCard();
}

// Mostrar card atual (COM BOTÃO VOLTAR AO MATERIAL)
function mostrarCard() {
    const container = document.getElementById('app');
    const card = state.cards[state.cardAtual];
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || 'dev_test';
    const concurso = new URLSearchParams(window.location.search).get('concurso') || 'seduc-ms-2022';
    
    if (!card) {
        mostrarParabens();
        return;
    }
    
    const progresso = state.total > 0 ? Math.round((state.revisados / state.total) * 100) : 0;
    
    container.innerHTML = `
        <div class="progress-container">
            <div class="progress-info">
                <span>Card ${state.revisados + 1} de ${state.total}</span>
                <span>${progresso}% concluído</span>
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
            <div class="dica" id="dica">Clique para ver a resposta</div>
        </div>
        
        <div class="botoes" id="botoes" style="display: none;">
            <button class="btn btn-dificil" onclick="avaliar(0)">Esqueci</button>
            <button class="btn btn-medio" onclick="avaliar(3)">Médio</button>
            <button class="btn btn-facil" onclick="avaliar(5)">Fácil</button>
        </div>
        
        <div class="estatisticas">
            <span class="acertos">Acertos: <span class="numero">${state.acertos}</span></span>
            <span class="erros">Erros: <span class="numero">${state.erros}</span></span>
            <span>Revisados: <span class="numero">${state.revisados}</span></span>
        </div>

        <div style="text-align: center; margin-top: 1.5rem; padding: 1rem; border-top: 1px solid #e9ecef;">
            <a href="/material/${concurso}/?session_id=${sessionId}" 
               style="display: inline-block; padding: 0.8rem 2rem; background: #6c757d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.3s;">
               ← Voltar ao Material
            </a>
        </div>
        <a href="#" onclick="paginaInicial()" class="voltar">← Voltar aos baralhos</a>
    `;
}

// Virar o card (mostrar resposta)
function virarCard() {
    const frente = document.getElementById('frente');
    const verso = document.getElementById('verso');
    const dica = document.getElementById('dica');
    const botoes = document.getElementById('botoes');
    
    if (frente && frente.style.display !== 'none') {
        frente.style.display = 'none';
        verso.style.display = 'block';
        dica.textContent = 'Como você se saiu?';
        botoes.style.display = 'flex';
    }
}

// Avaliar o card (com SRS)
function avaliar(nota) {
    const card = state.cards[state.cardAtual];
    card.revisado = true;
    card.revisado_hoje = true;
    state.revisados++;
    state.total_revisoes = (state.total_revisoes || 0) + 1;
    
    if (nota >= 4) {
        state.acertos++;
        card.acertos = (card.acertos || 0) + 1;
    } else {
        state.erros++;
        card.erros = (card.erros || 0) + 1;
    }
    
    // Calcula próximo intervalo usando SM-2
    const resultado = calcularProximoIntervalo(nota, card.intervalo || 0, card.fator || SM2.FATOR_INICIAL);
    card.intervalo = resultado.intervalo;
    card.fator = resultado.fator;
    card.proxima_revisao = resultado.proxima_revisao;
    
    // Salva progresso
    salvarProgresso();
    
    // Avança para o próximo card
    state.cardAtual++;
    
    // Verifica se terminou
    if (state.cardAtual >= state.cards.length) {
        mostrarFinalizado();
    } else {
        mostrarCard();
    }
}

// Mostrar tela de finalizado (COM BOTÃO VOLTAR AO MATERIAL)
function mostrarFinalizado() {
    const container = document.getElementById('app');
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || 'dev_test';
    const concurso = new URLSearchParams(window.location.search).get('concurso') || 'seduc-ms-2022';
    
    const taxaAcerto = state.total > 0 ? Math.round((state.acertos / state.total) * 100) : 0;
    
    container.innerHTML = `
        <div class="finalizado">
            <h2>Estudo concluído!</h2>
            <p>Você revisou <strong>${state.total}</strong> cards.</p>
            <p>Acertos: <strong>${state.acertos}</strong></p>
            <p>Erros: <strong>${state.erros}</strong></p>
            <p>Taxa de acerto: <strong>${taxaAcerto}%</strong></p>
            <br>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <a href="#" onclick="reiniciar()" class="btn btn-facil">Revisar novamente</a>
                <a href="/material/${concurso}/?session_id=${sessionId}" 
                   style="display: inline-block; padding: 0.8rem 2rem; background: #6c757d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.3s;">
                   ← Voltar ao Material
                </a>
            </div>
        </div>
    `;
}

// Mostrar parabéns (todos os cards revisados) (COM BOTÃO VOLTAR AO MATERIAL)
function mostrarParabens() {
    const container = document.getElementById('app');
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || 'dev_test';
    const concurso = new URLSearchParams(window.location.search).get('concurso') || 'seduc-ms-2022';
    
    container.innerHTML = `
        <div class="finalizado">
            <h2>Parabéns!</h2>
            <p>Você já revisou todos os cards deste baralho.</p>
            <p>Volte amanhã para mais revisões.</p>
            <br>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <a href="#" onclick="paginaInicial()" class="btn btn-voltar">← Voltar aos baralhos</a>
                <a href="/material/${concurso}/?session_id=${sessionId}" 
                   style="display: inline-block; padding: 0.8rem 2rem; background: #6c757d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.3s;">
                   ← Voltar ao Material
                </a>
            </div>
        </div>
    `;
}

// Reiniciar o estudo
function reiniciar() {
    state.cardAtual = 0;
    state.acertos = 0;
    state.erros = 0;
    state.revisados = 0;
    
    // Marca todos como não revisados para o dia
    state.cards.forEach(c => c.revisado = false);
    iniciarEstudo();
}

// Mostrar acesso negado
function mostrarAcessoNegado() {
    const container = document.getElementById('app');
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || 'dev_test';
    const concurso = new URLSearchParams(window.location.search).get('concurso') || 'seduc-ms-2022';
    
    container.innerHTML = `
        <div class="acesso-negado">
            <h2>Acesso restrito</h2>
            <p>Você precisa adquirir o material para acessar os flashcards.</p>
            <a href="/" class="btn btn-primary">Ver concursos disponíveis</a>
            <br><br>
            <p style="font-size: 0.9rem; color: #6c757d;">
                Já comprou? Acesse pelo link enviado no e-mail de confirmação.
            </p>
            <br>
            <a href="/material/${concurso}/?session_id=${sessionId}" 
               style="display: inline-block; padding: 0.8rem 2rem; background: #6c757d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.3s;">
               ← Voltar ao Material
            </a>
        </div>
    `;
}

// Página inicial - listar baralhos
async function paginaInicial() {
    const container = document.getElementById('app');
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || 'dev_test';
    const concurso = new URLSearchParams(window.location.search).get('concurso') || 'seduc-ms-2022';
    
    const dados = await carregarDados();
    
    if (!dados) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h2>Erro ao carregar dados</h2>
                <p>Não foi possível carregar os flashcards.</p>
            </div>
        `;
        return;
    }

    let totalCards = 0;
    let html = `
        <h2 style="margin: 1rem 0 0.5rem; color: #1a1a2e;">${dados.nome}</h2>
        <p style="color: #6c757d; margin-bottom: 1rem;">Escolha uma matéria para estudar</p>
        <div class="baralhos-grid">
    `;

    for (const [id, baralho] of Object.entries(dados.baralhos)) {
        totalCards += baralho.cards.length;
        const progresso = localStorage.getItem(`flashcards_${CONCURSO_ID}_${id}`);
        const revisados = progresso ? JSON.parse(progresso).filter(c => c.revisado).length : 0;
        const status = revisados > 0 ? `${revisados}/${baralho.cards.length} revisados` : `${baralho.cards.length} cards`;

        html += `
            <div class="baralho-card" onclick="selecionarBaralho('${id}')">
                <h3>${baralho.nome}</h3>
                <p>${status}</p>
                <span class="qtd">${baralho.cards.length} questões</span>
            </div>
        `;
    }

    html += `
        </div>
        <div style="margin-top: 2rem; text-align: center; color: #6c757d; font-size: 0.9rem;">
            <p>Clique em um baralho para começar a estudar</p>
            <p style="font-size: 0.8rem; margin-top: 0.5rem;">Total: ${totalCards} cards disponíveis</p>
        </div>
        <div style="text-align: center; margin-top: 1.5rem; padding: 1rem; border-top: 1px solid #e9ecef;">
            <a href="/material/${concurso}/?session_id=${sessionId}" 
               style="display: inline-block; padding: 0.8rem 2rem; background: #6c757d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.3s;">
               ← Voltar ao Material
            </a>
        </div>
        <a href="/" class="voltar">← Voltar à loja</a>
    `;

    container.innerHTML = html;
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

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

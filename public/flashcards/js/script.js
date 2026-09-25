// ==========================================
// FLASHCARDS - SCRIPT COMPLETO (SM-2 ADAPTADO)
// ==========================================
// Lógica de revisão espaçada:
//   Esqueci  -> 10 min (mesma sessão), depois 1 dia, depois reinicia
//   Médio    -> 1 dia, depois 2 dias, depois intervalo x 1.5
//   Fácil    -> 4 dias, depois 7 dias, depois intervalo x 2
// ==========================================

const CONCURSO_ID = new URLSearchParams(window.location.search).get('concurso') || 'seduc-ms-2022';
const SESSION_ID = new URLSearchParams(window.location.search).get('session_id') || 'dev_test';

// ==========================================
// ESTADO
// ==========================================
let state = {
    concurso: null,
    baralho: null,
    cards: [],       // base completa (histórico persistido)
    fila: [],        // cards da sessão atual
    cardAtual: 0,
    acertos: 0,
    erros: 0,
    revisados: 0,
    total: 0,
    total_revisoes: 0
};

// ==========================================
// CONSTANTES DE INTERVALO (em dias)
// ==========================================
const INTERVALOS = {
    ESQUECI: {
        primeira: 10 / (60 * 24),  // 10 minutos em dias
        segunda: 1,                 // 1 dia
        fator: null                 // reinicia ciclo (não multiplica)
    },
    MEDIO: {
        primeira: 1,                // 1 dia
        segunda: 2,                 // 2 dias
        fator: 1.5                  // x1.5 nas próximas
    },
    FACIL: {
        primeira: 4,                // 4 dias
        segunda: 7,                 // 7 dias
        fator: 2                    // x2 nas próximas
    }
};

// ==========================================
// FUNÇÕES PRINCIPAIS
// ==========================================

async function carregarFlashcards() {
    try {
        const response = await fetch(`/material/dados/${CONCURSO_ID}.json`);
        if (!response.ok) throw new Error('Arquivo não encontrado');
        return await response.json();
    } catch (error) {
        console.error('Erro ao carregar flashcards:', error);
        return null;
    }
}

function carregarProgresso(concursoId, baralhoId) {
    const key = `flashcards_${concursoId}_${baralhoId}`;
    const dados = localStorage.getItem(key);
    if (dados) {
        try { return JSON.parse(dados); } catch (e) { return null; }
    }
    return null;
}

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
            proxima_revisao: c.proxima_revisao || null,
            revisado: c.revisado || false,
            acertos: c.acertos || 0,
            erros: c.erros || 0,
            ultima_resposta: c.ultima_resposta || null
        })),
        stats: {
            total_revisoes: state.total_revisoes || 0,
            ultimo_estudo: new Date().toISOString()
        }
    };
    localStorage.setItem(key, JSON.stringify(dados));
}

/**
 * Calcula o próximo intervalo com base na resposta e no histórico do card.
 * @param {string} tipo - 'esqueci' | 'medio' | 'facil'
 * @param {number} intervaloAtual - intervalo atual em dias
 * @returns {object} { intervalo, proxima_revisao }
 */
function calcularProximoIntervalo(tipo, intervaloAtual) {
    const regra = INTERVALOS[tipo.toUpperCase()];
    let novoIntervalo;

    if (tipo === 'esqueci') {
        // Se nunca revisou: 10 min. Se já revisou antes: 1 dia (reinicia ciclo).
        if (intervaloAtual === 0) {
            novoIntervalo = regra.primeira;
        } else {
            novoIntervalo = regra.segunda;
        }
    } else if (tipo === 'medio') {
        if (intervaloAtual === 0) {
            novoIntervalo = regra.primeira;      // 1 dia
        } else if (intervaloAtual <= 1) {
            novoIntervalo = regra.segunda;       // 2 dias
        } else {
            novoIntervalo = Math.round(intervaloAtual * regra.fator * 10) / 10; // x1.5
        }
    } else { // facil
        if (intervaloAtual === 0) {
            novoIntervalo = regra.primeira;      // 4 dias
        } else if (intervaloAtual <= 4) {
            novoIntervalo = regra.segunda;       // 7 dias
        } else {
            novoIntervalo = Math.round(intervaloAtual * regra.fator * 10) / 10; // x2
        }
    }

    const proximaData = new Date();
    // intervalo está em dias; converter para ms (1 dia = 86400000 ms)
    proximaData.setTime(proximaData.getTime() + novoIntervalo * 86400000);

    return {
        intervalo: novoIntervalo,
        proxima_revisao: proximaData.toISOString()
    };
}

// ==========================================
// NAVEGAÇÃO
// ==========================================

function paginaInicial() {
    const container = document.getElementById('app');
    carregarFlashcards().then(dados => {
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
            let revisados = 0;
            let pendentes = baralho.cards.length;

            if (progresso) {
                try {
                    const p = JSON.parse(progresso);
                    if (p.cards) {
                        revisados = p.cards.filter(c => c.revisado).length;
                        const hoje = new Date();
                        pendentes = p.cards.filter(c => {
                            if (!c.revisado) return true;
                            if (!c.proxima_revisao) return true;
                            return new Date(c.proxima_revisao) <= hoje;
                        }).length;
                    }
                } catch (e) {}
            }

            const status = revisados > 0
                ? `${revisados}/${baralho.cards.length} revisados${pendentes > 0 ? ` • ${pendentes} para revisar` : ''}`
                : `${baralho.cards.length} cards`;

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
                <a href="/material/${CONCURSO_ID}/?session_id=${SESSION_ID}" 
                   style="display: inline-block; padding: 0.8rem 2rem; background: #6c757d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                   ← Voltar ao Material
                </a>
            </div>
            <a href="/" class="voltar">← Voltar à loja</a>
        `;

        container.innerHTML = html;
    });
}

async function selecionarBaralho(baralhoId) {
    const data = await carregarFlashcards();
    if (!data) return;

    const baralho = data.baralhos[baralhoId];
    if (!baralho) return;

    state.concurso = CONCURSO_ID;
    state.baralho = baralhoId;

    const progressoSalvo = carregarProgresso(CONCURSO_ID, baralhoId);
    if (progressoSalvo && progressoSalvo.cards) {
        state.cards = progressoSalvo.cards;
        state.total_revisoes = progressoSalvo.stats?.total_revisoes || 0;
    } else {
        state.cards = baralho.cards.map(c => ({
            ...c,
            intervalo: 0,
            proxima_revisao: null,
            revisado: false,
            acertos: 0,
            erros: 0,
            ultima_resposta: null
        }));
        state.total_revisoes = 0;
    }

    // Filtra apenas os cards que precisam ser revisados agora
    const agora = new Date();
    const cardsParaRevisar = state.cards.filter(c => {
        if (!c.revisado) return true;
        if (!c.proxima_revisao) return true;
        return new Date(c.proxima_revisao) <= agora;
    });

    if (cardsParaRevisar.length === 0) {
        mostrarParabens();
        return;
    }

    state.fila = cardsParaRevisar;
    state.cardAtual = 0;
    state.acertos = 0;
    state.erros = 0;
    state.revisados = 0;
    state.total = cardsParaRevisar.length;

    iniciarEstudo();
}

function iniciarEstudo() {
    if (state.fila.length === 0) {
        mostrarParabens();
        return;
    }
    mostrarCard();
}

// ==========================================
// EXIBIÇÃO DOS CARDS
// ==========================================

function limparVerso(texto) {
    if (!texto) return '';
    return texto.replace(/^alternativa\s+correta\s*:\s*/i, '').trim();
}

function mostrarCard() {
    const container = document.getElementById('app');
    const card = state.fila[state.cardAtual];

    if (!card) {
        mostrarFinalizado();
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
            <div class="frente" id="frente">${card.frente}</div>
            <div class="verso" id="verso" style="display: none;">${limparVerso(card.verso)}</div>
            <div class="dica" id="dica">Clique para ver a resposta</div>
        </div>

        <div class="botoes" id="botoes" style="display: none;">
            <button class="btn btn-dificil" onclick="avaliar('esqueci')">Esqueci</button>
            <button class="btn btn-medio" onclick="avaliar('medio')">Médio</button>
            <button class="btn btn-facil" onclick="avaliar('facil')">Fácil</button>
        </div>

        <div class="estatisticas">
            <span class="acertos">Acertos: <span class="numero">${state.acertos}</span></span>
            <span class="erros">Erros: <span class="numero">${state.erros}</span></span>
            <span>Revisados: <span class="numero">${state.revisados}</span></span>
        </div>

        <div style="text-align: center; margin-top: 1.5rem; padding: 1rem; border-top: 1px solid #e9ecef;">
            <a href="/material/${CONCURSO_ID}/?session_id=${SESSION_ID}" 
               style="display: inline-block; padding: 0.8rem 2rem; background: #6c757d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
               ← Voltar ao Material
            </a>
        </div>
        <a href="#" onclick="paginaInicial()" class="voltar">← Voltar aos baralhos</a>
    `;
}

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

function avaliar(tipo) {
    const card = state.fila[state.cardAtual];
    if (!card) return;

    card.revisado = true;
    card.ultima_resposta = tipo;
    state.revisados++;
    state.total_revisoes = (state.total_revisoes || 0) + 1;

    if (tipo === 'esqueci') {
        state.erros++;
        card.erros = (card.erros || 0) + 1;
    } else {
        state.acertos++;
        card.acertos = (card.acertos || 0) + 1;
    }

    // Atualiza o card na base completa (state.cards)
    const cardBase = state.cards.find(c => c.id === card.id);
    if (cardBase) {
        const resultado = calcularProximoIntervalo(tipo, cardBase.intervalo || 0);
        cardBase.intervalo = resultado.intervalo;
        cardBase.proxima_revisao = resultado.proxima_revisao;
        cardBase.revisado = true;
        cardBase.acertos = card.acertos;
        cardBase.erros = card.erros;
        cardBase.ultima_resposta = tipo;

        // Se o card errou, volta para o final da fila (mesma sessão)
        if (tipo === 'esqueci') {
            state.fila.push({ ...cardBase });
        }
    }

    salvarProgresso();

    state.cardAtual++;

    if (state.cardAtual >= state.fila.length) {
        mostrarFinalizado();
    } else {
        mostrarCard();
    }
}

function mostrarFinalizado() {
    const container = document.getElementById('app');
    const total = state.acertos + state.erros;
    const taxaAcerto = total > 0 ? Math.round((state.acertos / total) * 100) : 0;

    container.innerHTML = `
        <div class="finalizado">
            <h2>Estudo concluído!</h2>
            <p>Você revisou <strong>${total}</strong> cards.</p>
            <p>✅ Acertos: <strong>${state.acertos}</strong></p>
            <p>❌ Erros: <strong>${state.erros}</strong></p>
            <p>📊 Taxa de acerto: <strong>${taxaAcerto}%</strong></p>
            <br>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <a href="#" onclick="reiniciar()" class="btn btn-facil">Revisar novamente</a>
                <a href="/material/${CONCURSO_ID}/?session_id=${SESSION_ID}" 
                   style="display: inline-block; padding: 0.8rem 2rem; background: #6c757d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                   ← Voltar ao Material
                </a>
            </div>
        </div>
    `;
}

function mostrarParabens() {
    const container = document.getElementById('app');

    container.innerHTML = `
        <div class="finalizado">
            <h2>Parabéns!</h2>
            <p>Você já revisou todos os cards disponíveis hoje.</p>
            <p>Volte mais tarde para as próximas revisões.</p>
            <br>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <a href="#" onclick="paginaInicial()" class="btn btn-voltar">← Voltar aos baralhos</a>
                <a href="/material/${CONCURSO_ID}/?session_id=${SESSION_ID}" 
                   style="display: inline-block; padding: 0.8rem 2rem; background: #6c757d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                   ← Voltar ao Material
                </a>
            </div>
        </div>
    `;
}

function reiniciar() {
    // Filtra apenas os cards que precisam ser revisados AGORA
    const agora = new Date();
    const cardsParaRevisar = state.cards.filter(c => {
        if (!c.revisado) return true;
        if (!c.proxima_revisao) return true;
        return new Date(c.proxima_revisao) <= agora;
    });

    if (cardsParaRevisar.length === 0) {
        mostrarParabens();
        return;
    }

    state.fila = cardsParaRevisar;
    state.cardAtual = 0;
    state.acertos = 0;
    state.erros = 0;
    state.revisados = 0;
    state.total = cardsParaRevisar.length;
    iniciarEstudo();
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    paginaInicial();
});

window.selecionarBaralho = selecionarBaralho;
window.virarCard = virarCard;
window.avaliar = avaliar;
window.reiniciar = reiniciar;
window.paginaInicial = paginaInicial;
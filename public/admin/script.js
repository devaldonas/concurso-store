// ==========================================
// ADMIN - CONCURSO STORE
// ==========================================

// Dados mockados para demonstração
// Em produção, estes dados viriam do banco de dados via API

const dados = {
    pedidos: [
        { id: 1, cliente: 'devaldo.nas@gmail.com', produto: 'PM/SP 2026', valor: 'R$ 19,90', status: 'Pago', data: '06/09/2026' },
        { id: 2, cliente: 'devaldo.nas@gmail.com', produto: 'PF 2024', valor: 'R$ 29,90', status: 'Pago', data: '06/09/2026' },
        { id: 3, cliente: 'devaldo.nas@gmail.com', produto: 'TJ/SP 2024', valor: 'R$ 25,90', status: 'Pago', data: '06/09/2026' },
    ],
    clientes: [
        { id: 1, nome: 'Devaldo Nascimento', email: 'devaldo.nas@gmail.com', pedidos: 3, total: 'R$ 75,70', status: 'Ativo' },
    ],
    mensagens: [
        { id: 1, remetente: 'devaldo.nas@gmail.com', assunto: 'Dúvida sobre material', data: '06/09/2026', status: 'Não lida' },
    ],
    produtos: [
        { id: 1, nome: 'SEDUC/MS 2022', valor: 'R$ 19,90', categoria: 'Educação', status: 'Ativo' },
        { id: 2, nome: 'PM/SP 2026', valor: 'R$ 19,90', categoria: 'Segurança', status: 'Ativo' },
        { id: 3, nome: 'INSS 2022', valor: 'R$ 19,90', categoria: 'Federal', status: 'Ativo' },
        { id: 4, nome: 'CAIXA 2024', valor: 'R$ 24,90', categoria: 'Bancário', status: 'Ativo' },
        { id: 5, nome: 'PF 2024', valor: 'R$ 29,90', categoria: 'Segurança', status: 'Ativo' },
        { id: 6, nome: 'TJ/SP 2024', valor: 'R$ 25,90', categoria: 'Judiciário', status: 'Ativo' },
    ]
};

// ==========================================
// DASHBOARD
// ==========================================
function carregarDashboard() {
    const totalPedidos = document.getElementById('total-pedidos');
    const totalClientes = document.getElementById('total-clientes');
    const totalMensagens = document.getElementById('total-mensagens');
    const totalProdutos = document.getElementById('total-produtos');
    const recentActivity = document.getElementById('recent-activity-list');

    if (totalPedidos) totalPedidos.textContent = dados.pedidos.length;
    if (totalClientes) totalClientes.textContent = dados.clientes.length;
    if (totalMensagens) totalMensagens.textContent = dados.mensagens.length;
    if (totalProdutos) totalProdutos.textContent = dados.produtos.length;

    // Últimas atividades
    if (recentActivity) {
        const atividades = dados.pedidos.slice(-3).map(p => `
            <div style="display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid #f1f3f5;">
                <span>📦 Novo pedido: <strong>${p.produto}</strong> - ${p.cliente}</span>
                <span style="color: #6c757d; font-size: 0.85rem;">${p.data}</span>
            </div>
        `).join('');
        recentActivity.innerHTML = atividades || '<p style="color: #6c757d; text-align: center; padding: 2rem;">Nenhuma atividade recente.</p>';
    }

    // Atualizar badges
    const badgePedidos = document.getElementById('badge-pedidos');
    const badgeClientes = document.getElementById('badge-clientes');
    const badgeMensagens = document.getElementById('badge-mensagens');
    const badgeProdutos = document.getElementById('badge-produtos');

    if (badgePedidos) badgePedidos.textContent = dados.pedidos.length;
    if (badgeClientes) badgeClientes.textContent = dados.clientes.length;
    if (badgeMensagens) badgeMensagens.textContent = dados.mensagens.filter(m => m.status === 'Não lida').length;
    if (badgeProdutos) badgeProdutos.textContent = dados.produtos.length;
}

// ==========================================
// PEDIDOS
// ==========================================
function carregarPedidosAdmin() {
    const container = document.getElementById('pedidos-container');
    if (!container) return;

    let html = `
        <div class="table-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>📦 Pedidos</h2>
                <span style="color: #6c757d; font-size: 0.9rem;">Total: ${dados.pedidos.length} pedidos</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Produto</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Data</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;

    dados.pedidos.forEach(p => {
        const statusClass = p.status === 'Pago' ? 'status-pago' : 'status-pendente';
        html += `
            <tr>
                <td>#${p.id}</td>
                <td>${p.cliente}</td>
                <td>${p.produto}</td>
                <td>${p.valor}</td>
                <td><span class="status-badge ${statusClass}">${p.status}</span></td>
                <td>${p.data}</td>
                <td>
                    <button class="btn-admin btn-admin-primary" onclick="verPedido(${p.id})">Ver</button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// ==========================================
// CLIENTES
// ==========================================
function carregarClientesAdmin() {
    const container = document.getElementById('clientes-container');
    if (!container) return;

    let html = `
        <div class="table-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>👤 Clientes</h2>
                <span style="color: #6c757d; font-size: 0.9rem;">Total: ${dados.clientes.length} clientes</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Pedidos</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;

    dados.clientes.forEach(c => {
        html += `
            <tr>
                <td>#${c.id}</td>
                <td>${c.nome}</td>
                <td>${c.email}</td>
                <td>${c.pedidos}</td>
                <td>${c.total}</td>
                <td><span class="status-badge status-pago">${c.status}</span></td>
                <td>
                    <button class="btn-admin btn-admin-primary" onclick="verCliente(${c.id})">Ver</button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// ==========================================
// MENSAGENS
// ==========================================
function carregarMensagensAdmin() {
    const container = document.getElementById('mensagens-container');
    if (!container) return;

    let html = `
        <div class="table-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>💬 Mensagens</h2>
                <span style="color: #6c757d; font-size: 0.9rem;">Total: ${dados.mensagens.length} mensagens</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Remetente</th>
                        <th>Assunto</th>
                        <th>Data</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;

    dados.mensagens.forEach(m => {
        const statusClass = m.status === 'Não lida' ? 'status-pendente' : 'status-pago';
        html += `
            <tr>
                <td>#${m.id}</td>
                <td>${m.remetente}</td>
                <td>${m.assunto}</td>
                <td>${m.data}</td>
                <td><span class="status-badge ${statusClass}">${m.status}</span></td>
                <td>
                    <button class="btn-admin btn-admin-primary" onclick="verMensagem(${m.id})">Ver</button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// ==========================================
// PRODUTOS
// ==========================================
function carregarProdutosAdmin() {
    const container = document.getElementById('produtos-container');
    if (!container) return;

    let html = `
        <div class="table-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>📚 Produtos</h2>
                <span style="color: #6c757d; font-size: 0.9rem;">Total: ${dados.produtos.length} produtos</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Valor</th>
                        <th>Categoria</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;

    dados.produtos.forEach(p => {
        const statusClass = p.status === 'Ativo' ? 'status-pago' : 'status-pendente';
        html += `
            <tr>
                <td>#${p.id}</td>
                <td>${p.nome}</td>
                <td>${p.valor}</td>
                <td>${p.categoria}</td>
                <td><span class="status-badge ${statusClass}">${p.status}</span></td>
                <td>
                    <button class="btn-admin btn-admin-secondary" onclick="editarProduto(${p.id})">Editar</button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
function verPedido(id) {
    alert(`Ver detalhes do pedido #${id}`);
}

function verCliente(id) {
    alert(`Ver detalhes do cliente #${id}`);
}

function verMensagem(id) {
    alert(`Ver mensagem #${id}`);
}

function editarProduto(id) {
    alert(`Editar produto #${id}`);
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Determina qual página está carregada pelo caminho
    const path = window.location.pathname;
    
    if (path.includes('/admin/pedidos.html')) {
        carregarPedidosAdmin();
    } else if (path.includes('/admin/clientes.html')) {
        carregarClientesAdmin();
    } else if (path.includes('/admin/mensagens.html')) {
        carregarMensagensAdmin();
    } else if (path.includes('/admin/produtos.html')) {
        carregarProdutosAdmin();
    } else {
        // Dashboard
        carregarDashboard();
    }
});

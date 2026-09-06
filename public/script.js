// ==========================================
// NAVEGAÇÃO - CARREGAR PRODUTOS
// ==========================================

// Carregar produtos na página inicial
document.addEventListener('DOMContentLoaded', async () => {
    // Navegação por âncoras - apenas redireciona para a página inicial com a âncora
    document.querySelectorAll('.nav-links a, [data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            // Se for um link para âncora, apenas redireciona
            if (this.getAttribute('href') && this.getAttribute('href').startsWith('/#')) {
                // Não faz nada, deixa o navegador lidar com a âncora
                return;
            }
            // Para links com data-page, redireciona para a página inicial com a âncora
            const page = this.getAttribute('data-page');
            if (page) {
                e.preventDefault();
                window.location.href = `/#${page}`;
            }
        });
    });

    // Fecha o menu mobile ao clicar em um link
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // Carrega os produtos
    await loadProducts();
});

// Carregar produtos
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const products = await response.json();
        
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        products.forEach(product => {
            const priceFormatted = (product.price / 100).toFixed(2);
            const featuresList = product.features.map(f => 
                `<span class="feature-tag">${f}</span>`
            ).join('');
            
            const card = document.createElement('div');
            card.className = 'product-card';
            
            let badgeHtml = '';
            if (product.badge) {
                badgeHtml = `<span class="product-badge">${product.badge}</span>`;
            }
            
            card.innerHTML = `
                ${badgeHtml}
                <span class="product-category">${product.category}</span>
                <h3>${product.name}</h3>
                <p class="description">${product.description}</p>
                <div class="product-features">
                    ${featuresList}
                </div>
                <div class="price">R$ ${priceFormatted}</div>
                <button onclick="buyProduct('${product.id}')" class="btn btn-primary">
                    Adquirir Material
                </button>
            `;
            
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        const container = document.getElementById('productsContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Não foi possível carregar os materiais. Tente novamente.</p>
                </div>
            `;
        }
    }
}

// Função para comprar produto
async function buyProduct(productId) {
    try {
        const buttons = document.querySelectorAll('.btn-primary');
        let loadingBtn = null;
        
        buttons.forEach(btn => {
            if (btn.textContent === 'Adquirir Material' || btn.textContent === 'Comprar Agora') {
                loadingBtn = btn;
            }
        });
        
        if (loadingBtn) {
            loadingBtn.textContent = 'Processando...';
            loadingBtn.disabled = true;
        }

        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId })
        });
        
        const data = await response.json();
        
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Erro ao criar sessão de pagamento');
            if (loadingBtn) {
                loadingBtn.textContent = 'Adquirir Material';
                loadingBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao processar pagamento. Tente novamente.');
        
        const buttons = document.querySelectorAll('.btn-primary');
        buttons.forEach(btn => {
            if (btn.textContent === 'Processando...') {
                btn.textContent = 'Adquirir Material';
                btn.disabled = false;
            }
        });
    }
}

// ==========================================
// FUNÇÃO PARA MENU MOBILE
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
});

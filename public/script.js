// Navegação por páginas
document.addEventListener('DOMContentLoaded', () => {
    // Menu Mobile
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Navegação entre páginas
    const pages = {
        home: document.getElementById('page-home'),
        concursos: document.getElementById('page-concursos'),
        metodo: document.getElementById('page-metodo'),
        pedidos: document.getElementById('page-pedidos')
    };

    // Links de navegação
    const navItems = document.querySelectorAll('.nav-links a, [data-page]');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page && pages[page]) {
                navigateTo(page);
                // Fecha menu mobile
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    });

    function navigateTo(pageName) {
        // Esconde todas as páginas
        Object.values(pages).forEach(page => {
            page.classList.remove('active');
        });
        
        // Mostra a página selecionada
        if (pages[pageName]) {
            pages[pageName].classList.add('active');
        }
        
        // Atualiza links ativos
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageName) {
                link.classList.add('active');
            }
        });
    }

    // Carregar produtos na página de concursos
    loadProducts();
});

// Carregar produtos
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        const container = document.getElementById('productsContainer');
        container.innerHTML = '';
        
        products.forEach((product) => {
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
        document.getElementById('productsContainer').innerHTML = `
            <div class="error-message">
                <p>Não foi possível carregar os materiais.</p>
            </div>
        `;
    }
}

// Função para comprar produto
async function buyProduct(productId) {
    try {
        const buttons = document.querySelectorAll('.btn-primary');
        let loadingBtn = null;
        
        buttons.forEach(btn => {
            if (btn.textContent === 'Adquirir Material') {
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
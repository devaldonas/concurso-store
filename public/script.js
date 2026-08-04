// Carregar produtos
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        const container = document.getElementById('productsContainer');
        
        products.forEach((product, index) => {
            const priceFormatted = (product.price / 100).toFixed(2);
            
            // Lista de características
            const featuresList = product.features.map(f => `<span class="feature-tag">${f}</span>`).join('');
            
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
                <p>Não foi possível carregar os materiais. Por favor, tente novamente.</p>
            </div>
        `;
    }
});

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
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const Stripe = require('stripe');

// Verifica se a chave do Stripe está configurada
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('ERRO: STRIPE_SECRET_KEY não está configurada!');
  process.exit(1);
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Produtos - Nomes completos dos concursos
const products = [
  { 
    id: 'memorizacao_seduc_ms', 
    name: 'Secretaria de Educação - MS (Docência)', 
    price: 1990, 
    currency: 'brl', 
    description: 'Concurso para nível superior na carreira de docência',
    badge: 'Lançamento',
    category: 'Educação',
    features: ['Mapas mentais', 'Flashcards digitais', 'Revisão programada', 'Simulados exclusivos']
  },
  { 
    id: 'memorizacao_pm_sp', 
    name: 'Polícia Militar - SP (Soldado)', 
    price: 1990, 
    currency: 'brl', 
    description: 'Concurso para o cargo de Soldado da Polícia Militar',
    badge: 'Destaque',
    category: 'Segurança',
    features: ['Técnicas de associação', 'Revisão espaçada', 'Questões comentadas', 'Acompanhamento de desempenho']
  },
  { 
    id: 'memorizacao_inss', 
    name: 'INSS - Instituto Nacional do Seguro Social', 
    price: 1990, 
    currency: 'brl', 
    description: 'Um dos maiores concursos previstos com grande volume de vagas',
    badge: 'Mais Vendido',
    category: 'Federal',
    features: ['Resumos estratégicos', 'Áudio revisão', 'Mapas conceituais', 'Banco de questões']
  },
  { 
    id: 'memorizacao_caixa', 
    name: 'Caixa Econômica Federal', 
    price: 2490, 
    currency: 'brl', 
    description: 'Concurso para cargos administrativos e técnicos',
    badge: '',
    category: 'Bancário',
    features: ['Técnicas mnemônicas', 'Exercícios práticos', 'Revisão diária', 'Simulados cronometrados']
  },
  { 
    id: 'memorizacao_pf', 
    name: 'Polícia Federal (Agente)', 
    price: 2990, 
    currency: 'brl', 
    description: 'Concurso para o cargo de Agente da Polícia Federal',
    badge: 'Premium',
    category: 'Segurança',
    features: ['Legislação memorizada', 'Casos práticos', 'Revisão estratégica', 'Testes de fixação']
  },
  { 
    id: 'memorizacao_tj_sp', 
    name: 'Tribunal de Justiça - SP (Escrevente)', 
    price: 2590, 
    currency: 'brl', 
    description: 'Concurso para o cargo de Escrevente do TJ/SP',
    badge: '',
    category: 'Judiciário',
    features: ['Jurisprudência sistematizada', 'Flashcards legais', 'Revisão programada', 'Questões práticas']
  }
];

// API para listar produtos
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Criar sessão de checkout Stripe
app.post('/create-checkout-session', async (req, res) => {
  const { productId } = req.body;
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return res.status(400).json({ error: 'Produto inválido' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: product.currency,
          product_data: { 
            name: product.name, 
            description: product.description 
          },
          unit_amount: product.price
        },
        quantity: 1
      }],
      success_url: `${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/cancel.html`,
      metadata: {
        product_id: product.id,
        product_name: product.name
      }
    });
    
    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('Erro ao criar sessão:', err);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento' });
  }
});

// Endpoint para verificar status do pagamento
app.get('/api/check-session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({ 
      status: session.payment_status,
      customer_email: session.customer_details?.email
    });
  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
});

// Endpoint para obter chave pública
app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Rota para health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Concurso Store rodando em: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Rotas para flashcards
app.get('/flashcards', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'flashcards', 'index.html'));
});

app.get('/flashcards/study', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'flashcards', 'study.html'));
});

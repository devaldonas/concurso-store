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

// ==========================================
// CORS (pode ficar antes de tudo)
// ==========================================
app.use(cors());

// ==========================================
// WEBHOOK DO STRIPE - PRIMEIRO DE TUDO!
// NÃO PODE PASSAR PELO express.json()
// ==========================================
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  console.log('📨 Webhook recebido');
  console.log('📨 Headers:', req.headers);
  console.log('📨 Body type:', typeof req.body);
  console.log('📨 Body is Buffer?', Buffer.isBuffer(req.body));
  
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('⚠️ STRIPE_WEBHOOK_SECRET não configurado!');
    return res.status(400).send('Webhook secret não configurado');
  }

  let event;
  try {
    // req.body agora é um Buffer (raw body)
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Erro no webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log(`✅ Webhook recebido: ${event.type} (ID: ${event.id})`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const productName = session.metadata?.product_name || 'Material de Estudo';
    const sessionId = session.id;
    
    console.log(`💳 Pagamento confirmado para ${email} - Produto: ${productName}`);
    
    try {
      const { enviarMaterial } = require('./config/email');
      const resultado = await enviarMaterial(email, productName, sessionId);
      if (resultado) {
        console.log(`📧 E-mail enviado com sucesso para ${email}`);
      } else {
        console.log(`❌ Falha ao enviar e-mail para ${email}`);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar e-mail:', error.message);
      console.error('❌ Erro completo:', error);
    }
  }
  
  res.json({ received: true });
});

// ==========================================
// MIDDLEWARES (DEPOIS DO WEBHOOK)
// ==========================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// MODO DE DESENVOLVIMENTO
// ==========================================
const DEV_MODE = process.env.DEV_MODE === 'true' || true;

// ==========================================
// PRODUTOS
// ==========================================
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

// ==========================================
// ROTAS DA API
// ==========================================

// Listar produtos
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Criar sessão de checkout Stripe
app.post('/create-checkout-session', async (req, res) => {
  console.log('📥 POST /create-checkout-session recebido');
  console.log('📦 Body:', req.body);
  
  const { productId } = req.body;
  
  if (!productId) {
    console.log('❌ productId não fornecido');
    return res.status(400).json({ error: 'productId não fornecido' });
  }
  
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    console.log('❌ Produto não encontrado:', productId);
    return res.status(400).json({ error: 'Produto inválido' });
  }

  try {
    console.log(`🔄 Criando sessão para: ${product.name} (R$ ${product.price/100})`);
    
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
    
    console.log(`✅ Sessão criada: ${session.id}`);
    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('❌ Erro ao criar sessão:', err);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento' });
  }
});

// Verificar status do pagamento (COM MODO DE TESTE)
app.get('/api/check-session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  console.log(`🔍 Verificando sessão: ${sessionId}`);

  if (DEV_MODE && (sessionId === 'cs_test_teste123' || sessionId.startsWith('dev_'))) {
    console.log(`🔓 Modo DEV: Acesso liberado para ${sessionId}`);
    return res.json({
      status: 'paid',
      customer_email: 'teste@dev.com',
      product_id: 'memorizacao_seduc_ms'
    });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`✅ Sessão encontrada: ${sessionId} - Status: ${session.payment_status}`);
    res.json({ 
      status: session.payment_status,
      customer_email: session.customer_details?.email,
      product_id: session.metadata?.product_id
    });
  } catch (err) {
    console.error('❌ Erro ao verificar sessão:', err);
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
});

// Obter chave pública do Stripe
app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// ROTAS DOS FLASHCARDS
// ==========================================

// Página principal dos flashcards
app.get('/flashcards', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'flashcards', 'index.html'));
});

// Página de estudo
app.get('/flashcards/study', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'flashcards', 'study.html'));
});

// ==========================================
// ROTAS DO MATERIAL
// ==========================================

app.get('/material/*', (req, res) => {
  const filePath = req.params[0];
  res.sendFile(path.join(__dirname, 'public', 'material', filePath));
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 Concurso Store rodando em: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  if (DEV_MODE) {
    console.log(`🔓 Modo de desenvolvimento ATIVADO`);
    console.log(`📝 Use session_id=dev_test para testar sem pagamento`);
  }
});
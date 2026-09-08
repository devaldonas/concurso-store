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

  // No webhook, quando processar checkout.session.completed:
if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const productName = session.metadata?.product_name || 'Material de Estudo';
    const productId = session.metadata?.product_id || 'memorizacao_seduc_ms';
    const sessionId = session.id;
    
    console.log(`💳 Pagamento confirmado para ${email} - Produto: ${productName} (${productId})`);
    
    try {
        const { enviarMaterial } = require('./config/email');
        const resultado = await enviarMaterial(email, productName, sessionId, productId);
        if (resultado) {
            console.log(`📧 E-mail enviado com sucesso para ${email}`);
        } else {
            console.log(`❌ Falha ao enviar e-mail para ${email}`);
        }
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail:', error.message);
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
// PRODUTOS (6 CONCURSOS)
// ==========================================
// ==========================================
// PRODUTOS (hardcoded - sem banco de dados)
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
    features: [
      '180 flashcards',
      '3 mapas mentais',
      'Guia de revisão 4 semanas',
      '80 questões - 5h'
    ]
  },
  { 
    id: 'memorizacao_pm_sp', 
    name: 'Polícia Militar - SP (Soldado)', 
    price: 1990, 
    currency: 'brl', 
    description: 'Concurso para o cargo de Soldado da Polícia Militar',
    badge: 'Destaque',
    category: 'Segurança',
    features: [
      '115 flashcards',
      '5 mapas mentais',
      'Guia de revisão 4 semanas',
      '60 questões - 5h'
    ]
  },
  { 
    id: 'memorizacao_inss', 
    name: 'INSS - Instituto Nacional do Seguro Social', 
    price: 1990, 
    currency: 'brl', 
    description: 'Concurso para Técnico do Seguro Social',
    badge: 'Mais Vendido',
    category: 'Federal',
    features: [
      '295 flashcards',
      '7 mapas mentais',
      'Guia de revisão 4 semanas',
      '120 questões - 3h30'
    ]
  },
  { 
    id: 'memorizacao_caixa', 
    name: 'Caixa Econômica Federal', 
    price: 2490, 
    currency: 'brl', 
    description: 'Concurso para cargos administrativos e técnicos',
    badge: '',
    category: 'Bancário',
    features: [
      '175 flashcards',
      '1 mapa mental',
      'Guia de revisão 4 semanas',
      '80 questões - 3h30'
    ]
  },
  { 
    id: 'memorizacao_pf', 
    name: 'Polícia Federal (Agente)', 
    price: 2990, 
    currency: 'brl', 
    description: 'Concurso para o cargo de Agente da Polícia Federal',
    badge: 'Premium',
    category: 'Segurança',
    features: [
      '150 flashcards',
      '1 mapa mental',
      'Guia de revisão 4 semanas',
      '80 questões - 4h'
    ]
  },
  { 
    id: 'memorizacao_tj_sp', 
    name: 'Tribunal de Justiça - SP (Escrevente)', 
    price: 2590, 
    currency: 'brl', 
    description: 'Concurso para o cargo de Escrevente do TJ/SP',
    badge: '',
    category: 'Judiciário',
    features: [
      '100 flashcards',
      '1 mapa mental',
      'Guia de revisão 4 semanas',
      '80 questões - 4h'
    ]
  },
  { 
  id: 'memorizacao_ufabc', 
  name: 'UFABC - Assistente em Administração', 
  price: 1990, 
  currency: 'brl', 
  description: 'Concurso para Assistente em Administração da UFABC',
  badge: 'Novo',
  category: 'Educação',
  features: ['Mapas mentais', 'Flashcards digitais', 'Revisão programada', 'Simulados exclusivos']
}
];

// ==========================================
// ROTA PARA LISTAR PRODUTOS
// ==========================================
app.get('/api/products', (req, res) => {
  res.json(products);
});

// ==========================================
// ROTAS DA API
// ==========================================

// Listar produtos
app.get('/api/products', async (req, res) => {
  try {
    const result = await query('SELECT * FROM produtos WHERE ativo = true ORDER BY preco');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao carregar produtos' });
  }
});

// Criar sessão de checkout Stripe
app.post('/create-checkout-session', async (req, res) => {
  console.log('📥 POST /create-checkout-session recebido');
  console.log('📦 Body:', req.body);
  console.log('🔑 Stripe Key configurada:', process.env.STRIPE_SECRET_KEY ? '✅ Sim' : '❌ Não');
  console.log('🔑 Stripe Key prefixo:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 8) : 'não configurada');
  
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
    console.error('❌ Erro detalhado ao criar sessão:', err);
    console.error('❌ Mensagem:', err.message);
    console.error('❌ Tipo:', err.type);
    console.error('❌ Código:', err.code);
    console.error('❌ Stack:', err.stack);
    res.status(500).json({ 
        error: 'Erro ao criar sessão de pagamento',
        detalhe: err.message 
    });
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
// ROTAS DAS PÁGINAS
// ==========================================

// Página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Página Concursos
app.get('/concursos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'concursos.html'));
});

// Página Método
app.get('/metodo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'metodo.html'));
});

// Página Contato
app.get('/contato', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contato.html'));
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function startServer() {
  
  // Inicia o servidor
  app.listen(PORT, () => {
    console.log(`🚀 Concurso Store rodando em: http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    if (DEV_MODE) {
      console.log(`🔓 Modo de desenvolvimento ATIVADO`);
      console.log(`📝 Use session_id=dev_test para testar sem pagamento`);
    }
  });
}

startServer();
// ==========================================
// ROTA DE CONTATO
// ==========================================

const fs = require('fs');
const pathData = path.join(__dirname, 'data');

// Garante que a pasta data existe
if (!fs.existsSync(pathData)) {
    fs.mkdirSync(pathData, { recursive: true });
}

// Rota para receber mensagens de contato
app.post('/api/contato', async (req, res) => {
    try {
        const { nome, email, telefone, assunto, mensagem, data } = req.body;

        // Validação básica
        if (!nome || !email || !assunto || !mensagem) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        // Cria objeto da mensagem
        const novaMensagem = {
            id: Date.now(),
            nome,
            email,
            telefone: telefone || 'Não informado',
            assunto,
            mensagem,
            data: data || new Date().toISOString(),
            status: 'Não lida',
            lida_em: null,
            respondida_em: null,
            resposta: null
        };

        // Caminho do arquivo
        const filePath = path.join(pathData, 'mensagens.json');

        // Lê mensagens existentes ou cria array vazio
        let mensagens = [];
        if (fs.existsSync(filePath)) {
            const conteudo = fs.readFileSync(filePath, 'utf8');
            mensagens = JSON.parse(conteudo);
        }

        // Adiciona nova mensagem
        mensagens.push(novaMensagem);

        // Salva no arquivo
        fs.writeFileSync(filePath, JSON.stringify(mensagens, null, 2), 'utf8');

        console.log(`📩 Nova mensagem de ${nome} (${email}) - Assunto: ${assunto}`);

        res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso!' });

    } catch (error) {
        console.error('❌ Erro ao salvar mensagem:', error);
        res.status(500).json({ error: 'Erro interno ao processar mensagem' });
    }
});

// Rota para buscar mensagens (apenas para admin)
app.get('/api/admin/mensagens', (req, res) => {
    try {
        const filePath = path.join(pathData, 'mensagens.json');
        if (!fs.existsSync(filePath)) {
            return res.json([]);
        }
        const conteudo = fs.readFileSync(filePath, 'utf8');
        const mensagens = JSON.parse(conteudo);
        // Ordena por data decrescente (mais recentes primeiro)
        mensagens.sort((a, b) => new Date(b.data) - new Date(a.data));
        res.json(mensagens);
    } catch (error) {
        console.error('❌ Erro ao ler mensagens:', error);
        res.status(500).json({ error: 'Erro ao carregar mensagens' });
    }
});

// Rota para marcar mensagem como lida
app.post('/api/admin/mensagens/:id/lida', (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path.join(pathData, 'mensagens.json');
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Nenhuma mensagem encontrada' });
        }

        const conteudo = fs.readFileSync(filePath, 'utf8');
        let mensagens = JSON.parse(conteudo);
        
        const index = mensagens.findIndex(m => m.id === parseInt(id));
        if (index === -1) {
            return res.status(404).json({ error: 'Mensagem não encontrada' });
        }

        mensagens[index].status = 'Lida';
        mensagens[index].lida_em = new Date().toISOString();

        fs.writeFileSync(filePath, JSON.stringify(mensagens, null, 2), 'utf8');
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao marcar mensagem como lida:', error);
        res.status(500).json({ error: 'Erro ao atualizar mensagem' });
    }
});

// Rota para responder mensagem (admin)
app.post('/api/admin/mensagens/:id/resposta', (req, res) => {
    try {
        const { id } = req.params;
        const { resposta } = req.body;
        
        if (!resposta) {
            return res.status(400).json({ error: 'Resposta é obrigatória' });
        }

        const filePath = path.join(pathData, 'mensagens.json');
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Nenhuma mensagem encontrada' });
        }

        const conteudo = fs.readFileSync(filePath, 'utf8');
        let mensagens = JSON.parse(conteudo);
        
        const index = mensagens.findIndex(m => m.id === parseInt(id));
        if (index === -1) {
            return res.status(404).json({ error: 'Mensagem não encontrada' });
        }

        mensagens[index].status = 'Respondida';
        mensagens[index].respondida_em = new Date().toISOString();
        mensagens[index].resposta = resposta;

        fs.writeFileSync(filePath, JSON.stringify(mensagens, null, 2), 'utf8');
        
        console.log(`📨 Mensagem #${id} respondida.`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao responder mensagem:', error);
        res.status(500).json({ error: 'Erro ao responder mensagem' });
    }
});

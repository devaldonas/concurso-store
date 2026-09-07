const { Pool } = require('pg');
require('dotenv').config();

// Usa a DATABASE_URL do Railway ou variáveis individuais
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Função para executar queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('✅ Query executada:', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', error);
    throw error;
  }
}

// Função para testar conexão
async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Conectado ao PostgreSQL!', res.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão:', error);
    return false;
  }
}

// Função para inicializar o banco
async function initDatabase() {
  console.log('🔄 Inicializando banco de dados...');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Não foi possível conectar ao banco');
    return false;
  }

  try {
    // Cria tabela clientes se não existir
    await query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        nome TEXT,
        telefone TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Cria tabela produtos se não existir
    await query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco INTEGER NOT NULL,
        moeda TEXT DEFAULT 'brl',
        categoria TEXT,
        badge TEXT,
        features TEXT[],
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Cria tabela pedidos se não existir
    await query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id TEXT PRIMARY KEY,
        cliente_id UUID REFERENCES clientes(id),
        produto_id TEXT REFERENCES produtos(id),
        session_id TEXT UNIQUE,
        valor_total INTEGER,
        status TEXT DEFAULT 'pendente',
        payment_status TEXT DEFAULT 'pending',
        data_pagamento TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Cria tabela mensagens se não existir
    await query(`
      CREATE TABLE IF NOT EXISTS mensagens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT NOT NULL,
        telefone TEXT,
        assunto TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        status TEXT DEFAULT 'Não lida',
        lida_em TIMESTAMP WITH TIME ZONE,
        resposta TEXT,
        respondida_em TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Insere produtos iniciais se não existirem
    await query(`
      INSERT INTO produtos (id, nome, descricao, preco, moeda, categoria, badge, features) 
      SELECT * FROM (VALUES
        ('memorizacao_seduc_ms', 'Secretaria de Educação - MS (Docência)', 'Concurso para nível superior na carreira de docência', 1990, 'brl', 'Educação', 'Lançamento', ARRAY['Mapas mentais', 'Flashcards digitais', 'Revisão programada', 'Simulados exclusivos']),
        ('memorizacao_pm_sp', 'Polícia Militar - SP (Soldado)', 'Concurso para o cargo de Soldado da Polícia Militar', 1990, 'brl', 'Segurança', 'Destaque', ARRAY['Técnicas de associação', 'Revisão espaçada', 'Questões comentadas', 'Acompanhamento de desempenho']),
        ('memorizacao_inss', 'INSS - Instituto Nacional do Seguro Social', 'Um dos maiores concursos previstos com grande volume de vagas', 1990, 'brl', 'Federal', 'Mais Vendido', ARRAY['Resumos estratégicos', 'Áudio revisão', 'Mapas conceituais', 'Banco de questões']),
        ('memorizacao_caixa', 'Caixa Econômica Federal', 'Concurso para cargos administrativos e técnicos', 2490, 'brl', 'Bancário', '', ARRAY['Técnicas mnemônicas', 'Exercícios práticos', 'Revisão diária', 'Simulados cronometrados']),
        ('memorizacao_pf', 'Polícia Federal (Agente)', 'Concurso para o cargo de Agente da Polícia Federal', 2990, 'brl', 'Segurança', 'Premium', ARRAY['Legislação memorizada', 'Casos práticos', 'Revisão estratégica', 'Testes de fixação']),
        ('memorizacao_tj_sp', 'Tribunal de Justiça - SP (Escrevente)', 'Concurso para o cargo de Escrevente do TJ/SP', 2590, 'brl', 'Judiciário', '', ARRAY['Jurisprudência sistematizada', 'Flashcards legais', 'Revisão programada', 'Questões práticas'])
      ) AS v(id, nome, descricao, preco, moeda, categoria, badge, features)
      WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id = v.id);
    `);

    console.log('✅ Banco de dados inicializado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    return false;
  }
}

module.exports = { pool, query, testConnection, initDatabase };

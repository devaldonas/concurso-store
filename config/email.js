const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Mapeamento de produtos para suas páginas de material
const materialMap = {
    'memorizacao_seduc_ms': {
        nome: 'SEDUC/MS 2022',
        url: '/material/seduc-ms-2022/'
    },
    'memorizacao_pm_sp': {
        nome: 'PM/SP 2026',
        url: '/material/pm-sp-2026/'
    },
    'memorizacao_inss': {
        nome: 'INSS 2022',
        url: '/material/inss-2022/'
    },
    'memorizacao_caixa': {
        nome: 'Caixa Econômica Federal',
        url: '/material/caixa-2024/'
    },
    'memorizacao_pf': {
        nome: 'Polícia Federal',
        url: '/material/pf-2024/'
    },
    'memorizacao_tj_sp': {
        nome: 'TJ/SP',
        url: '/material/tj-sp-2024/'
    }
};

async function enviarMaterial(email, nomeProduto, sessionId, productId) {
    // Descobre qual material foi comprado
    const material = materialMap[productId] || materialMap['memorizacao_seduc_ms'];
    const linkMaterial = `${process.env.BASE_URL}${material.url}?session_id=${sessionId}`;
    
    console.log(`📧 Preparando e-mail para ${email} - Produto: ${material.nome} - Link: ${linkMaterial}`);
    
    const mailOptions = {
        to: email,
        from: {
            email: 'devaldo.nas@gmail.com',
            name: 'Concurso Store'
        },
        subject: `✅ Seu material - ${material.nome}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9ecef; border-radius: 12px;">
                <h2 style="color: #0f0f1a;">🎉 Pagamento Confirmado!</h2>
                <p>Olá,</p>
                <p>Seu pagamento para o <strong>${material.nome}</strong> foi confirmado com sucesso.</p>
                <p>Seu material de estudo já está disponível para acesso:</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <a href="${linkMaterial}" style="background: #e94560; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        📚 Acessar Material - ${material.nome}
                    </a>
                </div>
                <p style="color: #6c757d; font-size: 0.9rem;">🔒 Este link é pessoal e intransferível. Guarde com cuidado.</p>
                <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
                <p style="color: #6c757d; font-size: 0.8rem;">Concurso Store - Método de memorização para concursos</p>
                <p style="color: #6c757d; font-size: 0.8rem;">📧 Dúvidas? Responda a este e-mail.</p>
            </div>
        `
    };
    
    try {
        await sgMail.send(mailOptions);
        console.log(`📧 E-mail enviado com sucesso para ${email} - Produto: ${material.nome}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail:', error.message);
        if (error.response) {
            console.error('❌ Detalhes do erro:', JSON.stringify(error.response.body, null, 2));
        }
        return false;
    }
}

module.exports = { enviarMaterial };

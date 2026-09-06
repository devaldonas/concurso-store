const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function enviarMaterial(email, nomeProduto, sessionId) {
    const linkMaterial = `${process.env.BASE_URL}/flashcards/?session_id=${sessionId}`;
    
    const msg = {
        to: email,
        from: {
            email: 'devaldo.nas@gmail.com',
            name: 'Concurso Store'
        },
        subject: `Seu material - ${nomeProduto}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9ecef; border-radius: 12px;">
                <h2 style="color: #0f0f1a;">Pagamento Confirmado!</h2>
                <p>Olá,</p>
                <p>Seu pagamento para o <strong>${nomeProduto}</strong> foi confirmado com sucesso.</p>
                <p>Seu material de estudo já está disponível:</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <a href="${linkMaterial}" style="background: #e94560; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Acessar Material
                    </a>
                </div>
                <p style="color: #6c757d; font-size: 0.9rem;">Este link é pessoal e intransferível. Guarde com cuidado.</p>
                <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
                <p style="color: #6c757d; font-size: 0.8rem;">Concurso Store - Metodo de memorizacao para concursos</p>
            </div>
        `
    };
    
    try {
        await sgMail.send(msg);
        console.log(`📧 E-mail enviado com sucesso para ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail:', error.message);
        if (error.response) {
            console.error('❌ Detalhes:', JSON.stringify(error.response.body, null, 2));
        }
        return false;
    }
}

module.exports = { enviarMaterial };

const nodemailer = require('nodemailer');

// Configuração do transporte (use seu provedor de e-mail)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',  // Para Gmail
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Função para enviar e-mail com o material
async function enviarMaterial(email, nomeProduto, sessionId) {
    const linkMaterial = `${process.env.BASE_URL}/flashcards/?session_id=${sessionId}`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
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
        await transporter.sendMail(mailOptions);
        console.log(`E-mail enviado para ${email}`);
        return true;
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        return false;
    }
}

module.exports = { enviarMaterial };

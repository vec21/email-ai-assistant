const express = require('express');
const axios = require('axios');
const postmark = require('postmark');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3000;
const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:5000';

// Initialize Postmark client (only if token is provided)
let postmarkClient = null;
const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
const FROM_EMAIL = process.env.FROM_EMAIL || 'vec21@verdevive.online';

if (POSTMARK_TOKEN) {
    try {
        postmarkClient = new postmark.ServerClient(POSTMARK_TOKEN);
        console.log('✅ Postmark client initialized for email sending');
    } catch (error) {
        console.warn('⚠️  Postmark initialization failed:', error.message);
    }
} else {
    console.warn('⚠️  POSTMARK_SERVER_TOKEN not found - email sending disabled');
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        emailSending: postmarkClient ? 'enabled' : 'disabled'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Postmark Webhook Server is running', 
        status: 'ok',
        emailSending: postmarkClient ? 'enabled' : 'disabled'
    });
});

// Function to send email response
async function sendEmailResponse(toEmail, originalSubject, ragResponse, sources) {
    if (!postmarkClient) {
        console.log('📧 Email sending skipped - Postmark not configured');
        return null;
    }

    try {
        // Format subject
        const subject = originalSubject && !originalSubject.startsWith('Re:') 
            ? `Re: ${originalSubject}` 
            : originalSubject || 'Resposta da VerdeVivo';

        // Format sources for email
        const sourcesText = sources && sources.length > 0 
            ? `\n\n📋 Fontes consultadas:\n${sources.map(s => `• ${s.split('/').pop().replace('.md', '')}`).join('\n')}`
            : '';

        // Email body
        const emailBody = `Olá!

Obrigado por entrar em contato conosco. Aqui está a resposta para sua consulta:

${ragResponse}${sourcesText}

---
Este é um email automático gerado pelo nosso assistente virtual da VerdeVivo.
Se precisar de mais informações, não hesite em nos contatar.

Atenciosamente,
Equipe VerdeVivo
vec21@verdevive.online`;

        const result = await postmarkClient.sendEmail({
            From: FROM_EMAIL,
            To: toEmail,
            Subject: subject,
            TextBody: emailBody,
            MessageStream: 'outbound'
        });

        console.log(`✅ Email response sent to ${toEmail} - MessageID: ${result.MessageID}`);
        return result;

    } catch (error) {
        console.error(`❌ Failed to send email to ${toEmail}:`, error.message);
        if (error.statusCode) {
            console.error(`Postmark Error Code: ${error.statusCode}`);
        }
        throw error;
    }
}

// Webhook endpoint for Postmark inbound emails
app.post('/hook', async (req, res) => {
    try {
        console.log('Received webhook:', JSON.stringify(req.body, null, 2));
        
        // Extract email data from Postmark webhook
        const { FromFull, Subject, TextBody, HtmlBody, MessageID } = req.body;
        
        if (!FromFull || !FromFull.Email) {
            console.error('Invalid webhook payload: missing sender email');
            return res.status(200).json({ error: 'Invalid payload' });
        }
        
        const userEmail = FromFull.Email;
        const userName = FromFull.Name || userEmail;
        const emailContent = TextBody || HtmlBody || Subject || '';
        const originalSubject = Subject || 'Consulta';
        
        if (!emailContent.trim()) {
            console.error('Empty email content');
            return res.status(200).json({ error: 'Empty email content' });
        }
        
        console.log(`Processing email from: ${userName} <${userEmail}>`);
        console.log(`Subject: ${originalSubject}`);
        
        // Send to RAG API
        const ragResponse = await axios.post(`${RAG_API_URL}/process`, {
            email_content: emailContent,
            user_email: userEmail
        }, {
            timeout: 30000, // 30 second timeout
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('RAG API response:', ragResponse.data);
        
        // Send email response back to user
        let emailSent = false;
        try {
            const emailResult = await sendEmailResponse(
                userEmail, 
                originalSubject, 
                ragResponse.data.response,
                ragResponse.data.sources
            );
            
            if (emailResult) {
                emailSent = true;
                console.log(`✅ Complete workflow finished for ${userEmail}`);
            }
            
        } catch (emailError) {
            console.error('❌ Failed to send email response:', emailError.message);
            // Continue processing even if email fails
        }
        
        // Always return 200 to acknowledge receipt
        res.status(200).json({ 
            status: 'success', 
            message: emailSent ? 'Email processed and response sent' : 'Email processed (response not sent)',
            response: ragResponse.data.response,
            emailSent: emailSent,
            sentTo: emailSent ? userEmail : null
        });
        
    } catch (error) {
        console.error('Webhook processing error:', error.message);
        if (error.response) {
            console.error('RAG API error response:', error.response.data);
        }
        
        // Try to send error email if we have user email and Postmark is configured
        if (req.body.FromFull && req.body.FromFull.Email && postmarkClient) {
            try {
                await sendEmailResponse(
                    req.body.FromFull.Email,
                    req.body.Subject || 'Sua consulta',
                    'Desculpe, ocorreu um erro ao processar sua consulta. Nossa equipe foi notificada e entrará em contato em breve.\n\nObrigado pela compreensão.\n\nEquipe VerdeVivo',
                    []
                );
                console.log('✅ Error notification sent to user');
            } catch (emailError) {
                console.error('❌ Failed to send error email:', emailError.message);
            }
        }
        
        // Still return 200 to prevent retries, but log the error
        res.status(200).json({ 
            status: 'error', 
            message: 'Error processing email',
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Webhook server running on port ${PORT}`);
    console.log(`RAG API URL: ${RAG_API_URL}`);
    console.log(`From email: ${FROM_EMAIL}`);
    console.log(`Email sending: ${postmarkClient ? 'ENABLED' : 'DISABLED'}`);
});

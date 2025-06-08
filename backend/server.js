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
// ...existing code...

// Function to send email response
async function sendEmailResponse(toEmail, originalSubject, ragResponse, sources) {
    if (!postmarkClient) {
        console.log('📧 Email sending skipped - Postmark not configured');
        return null;
    }

    try {
        const subject = originalSubject && !originalSubject.startsWith('Re:') 
            ? `Re: ${originalSubject}` 
            : originalSubject || 'Response from VerdeVive';

        // Criar lista de fontes em inglês
        const sourcesText = sources && sources.length > 0 
            ? sources.map(s => `• ${s.split('/').pop().replace('.md', '')}`).join('\n')
            : '';

        // Template HTML profissional
        const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Response from VerdeVive</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f9f9f9;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #2d5a2d, #4a7c4a);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        .header .logo {
            font-size: 40px;
            margin-bottom: 10px;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            color: #2d5a2d;
            margin-bottom: 20px;
        }
        .message {
            background-color: #f8f9fa;
            padding: 20px;
            border-left: 4px solid #2d5a2d;
            margin: 20px 0;
            border-radius: 5px;
        }
        .sources {
            background-color: #e8f5e8;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            border-left: 4px solid #4caf50;
        }
        .sources h4 {
            margin: 0 0 10px 0;
            color: #2e7d32;
            font-size: 14px;
        }
        .sources ul {
            margin: 0;
            padding-left: 20px;
        }
        .sources li {
            color: #666;
            font-size: 13px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 25px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            margin: 5px 0;
            font-size: 14px;
            color: #666;
        }
        .contact-info {
            margin-top: 15px;
        }
        .contact-info a {
            color: #2d5a2d;
            text-decoration: none;
        }
        .divider {
            height: 2px;
            background: linear-gradient(to right, #2d5a2d, #4caf50);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌱</div>
            <h1>VerdeVive</h1>
            <p>Sustainable Solutions & Technology</p>
        </div>
        
        <div class="content">
            <div class="greeting">Hello!</div>
            
            <p>Thank you for contacting us. Here's the response to your inquiry:</p>
            
            <div class="message">
                ${ragResponse}
            </div>
            
            ${sourcesText ? `
            <div class="sources">
                <h4>📋 Sources Consulted:</h4>
                <ul>
                    ${sourcesText.split('\n').map(source => source ? `<li>${source.replace('• ', '')}</li>` : '').join('')}
                </ul>
            </div>
            ` : ''}
            
            <div class="divider"></div>
            
            <p>If you need further assistance or have additional questions, please don't hesitate to reach out to us.</p>
        </div>
        
        <div class="footer">
            <p><strong>This is an automated email generated by VerdeVive's virtual assistant.</strong></p>
            <p>If you need further assistance, feel free to contact us.</p>
            
            <div class="contact-info">
                <p><strong>Best regards,</strong><br>
                The VerdeVive Team</p>
                <p>📧 <a href="mailto:vec21@verdevive.online">vec21@verdevive.online</a></p>
                <p>🌐 <a href="https://www.verdevive.online">www.verdevive.online</a></p>
            </div>
        </div>
    </div>
</body>
</html>`;

        // Template texto simples para clientes que não suportam HTML
        const textBody = `Hello!

Thank you for contacting us. Here's the response to your inquiry:

${ragResponse}

${sourcesText ? `📋 Sources Consulted:
${sourcesText}` : ''}

---
This is an automated email generated by VerdeVive's virtual assistant.
If you need further assistance, feel free to contact us.

Best regards,
The VerdeVive Team
📧 vec21@verdevive.online
🌐 www.verdevive.online`;

        const result = await postmarkClient.sendEmail({
            From: FROM_EMAIL,
            To: toEmail,
            Subject: subject,
            HtmlBody: htmlBody,
            TextBody: textBody,
            MessageStream: 'outbound'
        });

        console.log(`✅ Email response sent to ${toEmail} - MessageID: ${result.MessageID}`);
        return result;

    } catch (error) {
        console.error(`❌ Failed to send email to ${toEmail}:`, error.message);
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
                    req.body.Subject || 'Your inquiry',
                    'We apologize, but an error occurred while processing your inquiry. Our team has been notified and will contact you shortly.\n\nThank you for your understanding.\n\nThe VerdeVive Team',
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

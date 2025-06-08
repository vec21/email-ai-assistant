# VerdeVive Assistant 🌱

A virtual assistant based on RAG (Retrieval Augmented Generation) that processes received emails, generates contextual responses, and automatically replies to VerdeVive customers.

## 📋 Description

VerdeVive Assistant is an automated customer service solution that uses AI technology to process customer emails and generate personalized responses based on company documentation. The system integrates with the Postmark service to receive and send emails, and uses an advanced language model (Llama3) through the Groq API to generate contextual and relevant responses.

## 🛠️ Technologies

- **Backend Webhook**: Node.js, Express
- **RAG API**: Python, Flask
- **Language Processing**: LangChain, FAISS, HuggingFace Embeddings
- **AI Model**: Llama3 via Groq API
- **Email Processing**: Postmark
- **Process Management**: PM2

## 🔍 Project Structure

```
email-ai-assistant/
├── backend/                  # Webhook server and RAG API
│   ├── error_emails/         # Stores emails with processing errors
│   ├── rag/                  # Retrieval Augmented Generation API
│   │   ├── indexador.py      # Document indexing script
│   │   ├── main.py           # Flask API for RAG processing
│   │   └── requirements.txt  # Python dependencies
│   ├── package.json          # Node.js dependencies
│   └── server.js             # Webhook server for Postmark
├── docs_empresa/             # Company knowledge base
│   └── content.md            # Company documentation in Markdown format
├── ecosystem.config.js       # PM2 configuration
├── scripts/                  # Utility scripts
│   ├── deploy.sh             # Deployment script
│   └── monitor.sh            # Monitoring script
└── README.md                 # Project documentation
```

## ⚙️ Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- Postmark account with configured server
- Groq API key
- PM2 (for process management in production)

## 🚀 Installation and Execution

### 1. Clone the repository

```bash
git clone https://github.com/vec21/email-ai-assistant.git
cd email-ai-assistant
```

### 2. Configure environment variables

Create a `.env` file in the project root with the following variables:

```
# Webhook server settings
PORT=3000
FROM_EMAIL=vec21@verdevive.online
POSTMARK_SERVER_TOKEN=your-postmark-token

# RAG API settings
RAG_API_URL=http://localhost:5000
RAG_API_PORT=5000
GROQ_API_KEY=your-groq-api-key
LLM_MODEL=llama3-8b-8192
FLASK_DEBUG=false
```

### 3. Install Node.js dependencies

```bash
cd backend
npm install
```

### 4. Install Python dependencies

```bash
cd rag
pip install -r requirements.txt
```

### 5. Index the documents

Before starting the service, you need to index the knowledge base documents:

```bash
cd backend/rag
python indexador.py
```

This command will create a `faiss_index` directory with the document vectors.

### 6. Start the services

#### Development

To start the services in development mode:

```bash
# Terminal 1 - RAG API
cd backend/rag
python main.py

# Terminal 2 - Webhook server
cd backend
node server.js
```

#### Production

For production environment, use PM2:

```bash
# In the project root
pm2 start ecosystem.config.js
```

### 7. Verification

Verify that the services are working correctly:

```bash
# Check webhook status
curl http://localhost:3000/health

# Check RAG API status
curl http://localhost:5000/health
```

## 📝 Postmark Configuration

1. Set up a server in Postmark (https://postmarkapp.com)
2. Configure a webhook to send received emails to `http://your-server.com/hook`
3. Make sure the Postmark server token is configured in the `.env` file

## 🔄 Operation Flow

1. A customer sends an email to the address configured in Postmark
2. Postmark sends a webhook to the Node.js server
3. The server extracts the email content and sends it to the RAG API
4. The RAG API queries the knowledge base and generates a contextual response
5. The server formats the response and sends it back to the customer via Postmark

## 📊 Monitoring

To monitor the services in production:

```bash
pm2 status           # View service status
pm2 logs             # View real-time logs
pm2 monit            # Advanced monitoring
```

## 🧪 Testing the System

To test the system, send an email to the address configured in Postmark and check if you receive an automatic response.

## 🔧 Troubleshooting

- **RAG API initialization error**: Check if the `faiss_index` directory was created correctly
- **Email sending error**: Check if the Postmark token is configured correctly
- **Inadequate responses**: Review and update the content in `docs_empresa/content.md`
- **Connection error**: Check if the configured ports (3000 for webhook, 5000 for RAG API) are available

## 🔒 Security

- The system uses SSL for secure communication
- Credentials are stored in environment variables, not in code
- It is recommended to configure a firewall to limit access to service ports

## 🔍 Customization

To customize the assistant's responses:
1. Edit the `docs_empresa/content.md` file with your company information
2. Run the indexer again to update the knowledge base
3. Restart the services to apply the changes

## 👥 Contributions

Contributions are welcome! Feel free to open issues or send pull requests.

## 📄 License

This project is property of VerdeVive.

## 👤 Author

Developed by Veríssimo Cassange (CEO of VerdeVive)
GitHub: [https://github.com/vec21](https://github.com/vec21)

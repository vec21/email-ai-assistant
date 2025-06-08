# VerdeVive Assistant

Uma solução de assistente virtual baseada em RAG (Retrieval Augmented Generation) para VerdeVive. O sistema processa emails recebidos, utiliza um modelo de IA para gerar respostas contextuais e responde automaticamente aos clientes.

## Estrutura do Projeto

- **/backend**: Servidor webhook para processar emails do Postmark
- **/backend/rag**: API RAG para geração de respostas contextuais
- **/data**: Conteúdo base para o RAG

## Tecnologias Utilizadas

- Python + Flask: API RAG
- Node.js: Servidor Webhook 
- Langchain + FAISS: Indexação e recuperação de documentos
- Postmark: Processamento de email
- PM2: Gerenciamento de processos

## Configuração

1. Instale as dependências do Python e Node.js
2. Configure variáveis de ambiente no arquivo `.env`
3. Inicie os serviços com PM2

## Gerenciamento

```bash
pm2 status           # Ver status dos serviços
pm2 logs             # Ver logs em tempo real
pm2 monit            # Monitoramento avançado
```

## Licença

Este projeto é propriedade de VerdeVive.

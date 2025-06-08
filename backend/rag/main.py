import os
import sys
from pathlib import Path
from typing import Optional, Dict, Tuple
import logging
from datetime import datetime
from flask import Flask, request, jsonify

# Imports atualizados
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain_groq import ChatGroq
from dotenv import load_dotenv

# Configuração inicial
load_dotenv()

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('rag_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Validação de variáveis de ambiente
groq_api_key = os.getenv("GROQ_API_KEY")
model_name = os.getenv("LLM_MODEL", "llama3-8b-8192")
faiss_index_path = "faiss_index"

if not groq_api_key:
    logger.error("GROQ_API_KEY não configurada no .env")
    raise ValueError("GROQ_API_KEY environment variable is not set.")

# Log para debug do caminho
logger.info(f"Working directory: {os.getcwd()}")
logger.info(f"FAISS index path: {faiss_index_path}")
logger.info(f"Using model: {model_name}")

# Inicialização do Flask
app = Flask(__name__)

# Global variables for services
embeddings = None
db = None
groq_chat = None
initialization_error = None

def initialize_services():
    """Inicializa os serviços na primeira requisição"""
    global embeddings, db, groq_chat, initialization_error
    
    if db is not None and groq_chat is not None:  # Already initialized successfully
        logger.info("Services already initialized")
        return True
    
    if initialization_error is not None:  # Previous initialization failed
        logger.error(f"Previous initialization failed: {initialization_error}")
        return False
        
    try:
        logger.info("Inicializando embeddings...")
        start_time = datetime.now()
        
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        logger.info(f"Carregando índice FAISS de {faiss_index_path}...")
        
        # Verifica se o diretório do índice existe
        if not os.path.exists(faiss_index_path):
            error_msg = f"FAISS index directory not found at {faiss_index_path}"
            logger.error(error_msg)
            logger.info("Execute 'python indexador.py' primeiro para criar o índice")
            logger.info(f"Current directory contents: {os.listdir('.')}")
            initialization_error = error_msg
            return False
        
        # Verifica se os arquivos necessários existem
        index_file = os.path.join(faiss_index_path, "index.faiss")
        pkl_file = os.path.join(faiss_index_path, "index.pkl")
        
        if not os.path.exists(index_file) or not os.path.exists(pkl_file):
            error_msg = f"FAISS files not found. Expected: {index_file} and {pkl_file}"
            logger.error(error_msg)
            logger.info(f"Contents of {faiss_index_path}: {os.listdir(faiss_index_path) if os.path.exists(faiss_index_path) else 'Directory does not exist'}")
            initialization_error = error_msg
            return False
            
        db = FAISS.load_local(faiss_index_path, embeddings, allow_dangerous_deserialization=True)
        
        logger.info("Configurando ChatGroq...")
        groq_chat = ChatGroq(
            temperature=0,
            model_name=model_name,
            groq_api_key=groq_api_key
        )
        
        elapsed = datetime.now() - start_time
        logger.info(f"Inicialização concluída em {elapsed.total_seconds():.2f}s")
        logger.info(f"FAISS index loaded with {db.index.ntotal} vectors")
        
        # Reset error since initialization succeeded
        initialization_error = None
        return True
    
    except Exception as e:
        error_msg = f"Erro na inicialização: {str(e)}"
        logger.error(error_msg)
        initialization_error = error_msg
        return False

@app.route('/process', methods=['POST'])
def process_email():
    """Endpoint para processamento de e-mails"""
    try:
        # Initialize services if not already done
        if not initialize_services():
            error_msg = initialization_error or "Failed to initialize services"
            logger.error(f"Cannot process email: {error_msg}")
            return jsonify({"error": error_msg}), 500
        
        # Double check that services are actually initialized
        if db is None:
            logger.error("Database is None after initialization")
            return jsonify({"error": "Database not initialized"}), 500
            
        if groq_chat is None:
            logger.error("ChatGroq is None after initialization")
            return jsonify({"error": "ChatGroq not initialized"}), 500
        
        # Validação básica do payload
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
            
        data = request.get_json()
        query = data.get('email_content')
        user_email = data.get('user_email', 'unknown')
        
        if not query:
            return jsonify({"error": "email_content is required"}), 400
        
        logger.info(f"Processando consulta de {user_email}: {query[:50]}...")
        
        # Sistema RAG
        qa = RetrievalQA.from_chain_type(
            llm=groq_chat,
            chain_type="stuff",
            retriever=db.as_retriever(search_kwargs={"k": 3}),
            return_source_documents=True
        )
        
        result = qa.invoke({"query": query})
        
        response = {
            "response": result["result"],
            "sources": [doc.metadata.get('source', '') for doc in result["source_documents"]]
        }
        
        logger.info(f"Consulta de {user_email} processada com sucesso")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Erro ao processar e-mail: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de health check"""
    try:
        # Initialize services if not already done
        if not initialize_services():
            error_msg = initialization_error or "Failed to initialize services"
            return jsonify({
                "status": "unhealthy",
                "error": error_msg
            }), 500
        
        # Check if services are properly initialized
        if db is None or groq_chat is None:
            return jsonify({
                "status": "unhealthy",
                "error": "Services not initialized properly"
            }), 500
        
        # Teste básico dos componentes
        test_query = "Teste de saúde do sistema"
        qa = RetrievalQA.from_chain_type(
            llm=groq_chat,
            chain_type="stuff",
            retriever=db.as_retriever()
        )
        qa.invoke({"query": test_query})
        
        return jsonify({
            "status": "healthy",
            "components": {
                "faiss_index": "operational",
                "groq_api": "operational",
                "vectors_count": db.index.ntotal,
                "index_path": faiss_index_path,
                "model": model_name
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv("RAG_API_PORT", 5000)),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true"
    )

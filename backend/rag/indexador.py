from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import MarkdownHeaderTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import os

def indexar_documentos():
    # Get the correct path to docs_empresa directory
    docs_path = os.path.join(os.path.dirname(__file__), '..', '..', 'docs_empresa')
    docs_path = os.path.abspath(docs_path)
    
    print(f"Looking for documents in: {docs_path}")
    
    if not os.path.exists(docs_path):
        raise FileNotFoundError(f"Directory not found: {docs_path}")
    
    # Use TextLoader instead of default UnstructuredFileLoader for .md files
    loader = DirectoryLoader(
        docs_path, 
        glob="**/*.md",
        loader_cls=TextLoader,
        loader_kwargs={'encoding': 'utf-8'}
    )
    
    try:
        documents = loader.load()
    except Exception as e:
        print(f"Error loading documents: {e}")
        return
    
    if not documents:
        print("Warning: No documents found in the directory")
        return
    
    print(f"Found {len(documents)} documents")
    
    headers_to_split_on = [("#", "Header 1"), ("##", "Header 2")]
    markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on)
    docs = []
    
    for doc in documents:
        try:
            splits = markdown_splitter.split_text(doc.page_content)
            for split in splits:
                # Preserve metadata from original document
                split.metadata.update(doc.metadata)
            docs.extend(splits)
        except Exception as e:
            print(f"Error processing document {doc.metadata.get('source', 'unknown')}: {e}")
            # If markdown splitting fails, use the document as is
            docs.append(doc)
    
    print(f"Created {len(docs)} document chunks")
    
    if not docs:
        print("No document chunks created")
        return
    
    print("Initializing embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    print("Creating FAISS index...")
    db = FAISS.from_documents(docs, embeddings)
    
    print("Saving FAISS index...")
    db.save_local("faiss_index")
    
    print("FAISS index saved successfully")
    print(f"Index contains {db.index.ntotal} vectors")
    
if __name__ == "__main__":
    indexar_documentos()

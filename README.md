# ReviewLens: Semantic Search and RAG for Product Reviews

## Overview
ReviewLens is a Retrieval-Augmented Generation (RAG) and Semantic Search application designed to seamlessly analyze, search, and answer questions based on product reviews. It enables users to perform sophisticated natural-language queries against a dataset of reviews and retrieve actionable insights.

## Architecture & Tech Stack
- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Python (Native `http.server`)
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Vector Database**: FAISS (Facebook AI Similarity Search - `IndexFlatIP`)
- **LLM for RAG Pipeline**: `google/flan-t5-base`
- **Dataset Support**: Preprocessed CSV of product reviews (`Dataset-SA GCO cleaned.csv`)

## Core Features
1. **Semantic Search**: Unlike keyword matching, this tool understands the semantic meaning of user queries to surface the most relevant product reviews.
2. **Retrieval-Augmented Generation (RAG)**: Fetches the most pertinent reviews and passes them as context to an LLM (Flan-T5) to synthesize accurate, context-aware answers.
3. **Sentiment & Rating Context**: The pipeline associates reviews with their respective sentiments and user ratings, giving a deeper analytical view.
4. **100% Local Execution**: Built to run on local hardware using open-source models (SBERT and FLAN-T5). Requires no external API calls (e.g., OpenAI) once models are downloaded.
5. **Smart Caching**: Auto-caches FAISS indices and vector embeddings locally to significantly speed up recurring backend startups.

## How it Works
1. **Startup & Indexing**: The Python backend loads the dataset. It checks for a cached FAISS index. If not found, it generates 384-dimensional embeddings for all reviews via SBERT and builds the index.
2. **Search API**: When a user inputs a query, it is vectorized. The backend queries FAISS to retrieve the top `K` most similar chunks/reviews based on Inner Product distance.
3. **RAG Context API**: For question-answering, the retrieved reviews are concatenated into a strict context prompt. The query and context are passed to `flan-t5-base`, which generates a direct, grounded answer (eliminating hallucination).

## Setup & Installation

### Prerequisites
- Node.js (v18+)
- Python 3.9+

### 1. Backend Setup
Make sure you have PyTorch and the NLP pipelines installed.

```bash
# It is recommended to use a virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install torch torchvision torchaudio  # Configure appropriately for CUDA if desired
pip install sentence-transformers transformers faiss-cpu pandas numpy
```

### 2. Frontend Setup
```bash
npm install
```

### 3. Running the Application

**Start the Python Backend:**
```bash
npm run backend
# Or manually: python backend/server.py
```
*Note: During the initial run, the models (`all-MiniLM-L6-v2` and `flan-t5-base`) will be downloaded, and the FAISS index will be built. This process may take a few minutes. Subsequent startups will be fast due to caching.*

**Start the React Development Server:**
In a new terminal:
```bash
npm run dev
```

Visit the displayed local URL (typically `http://localhost:5173`) in your browser to interact with ReviewLens.

## Project Structure
- `backend/server.py`: Core logic for API routing, FAISS indexing, Embeddings generation, and LLM inference.
- `src/`: React frontend logic and UI components.
- `app.js` / `index.html`: Main application entrypoints.
- `cache/`: (Git-ignored) Stores the serialized FAISS indices (`.index` files) and metadata.
- `models/`: (Git-ignored) Local cache for the downloaded Hugging Face models.
- `Dataset-SA GCO cleaned.csv`: (Git-ignored) Required local dataset for building vectors.

## Note on Git
Heavy files such as the cached vectors, downloaded `.bin`/`.safetensors` ML models, the `node_modules` directory, and the CSV datasets are purposely ignored in `.gitignore` to maintain repository performance.

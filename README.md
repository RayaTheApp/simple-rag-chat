# Simple RAG Chat

A minimal Retrieval-Augmented Generation (RAG) demo for answering questions about internal company documentation. Built as a simple example of how RAG systems work.

## What It Does

Ask natural language questions about company policies, benefits, procedures, and more. The system searches through markdown documents and generates answers based on the relevant content it finds.

## Architecture

### 1. EmbeddingsService (`src/embeddings-service.ts`)
- **Chunking**: Splits markdown files into 400-character chunks
- **Embedding**: Generates vector embeddings via OpenAI API
- **Caching**: Persists embeddings to disk (`.cache/embeddings.json`)
- **Search**: Cosine similarity search over cached embeddings

### 2. RAG CLI (`src/rag-cli.ts`)
- **Query generation**: Uses LLM to propose search queries
- **Multi-search**: Retrieves relevant chunks using multiple queries
- **Answer generation**: Synthesizes answers from retrieved context

### 3. Company Data (`data/company-data/`)
Sample knowledge base of 20 markdown documents covering policies, procedures, and company information.

## Quick Start

```bash
npm install
export OPENAI_API_KEY="sk-..."
npm run build
npm start
```

If the API key is not set, the CLI will prompt for it interactively.

## Usage

```
$ npm start

Hey, I'm your company docs assistant! Ask me about policies, benefits, or procedures.

> how many vacation days do I get
Employees receive 20 days of PTO per year, plus holidays.

> what's the 401k match
4% match with immediate vesting.

> exit
```

### Add a New Document

```bash
npx rag --add-file /path/to/document.md
```

### Rebuild Cache

Force rebuild of the embeddings cache:

```bash
npx rag train
```

### Debug Mode

See LLM requests/responses and search progress:

```bash
npx rag --debug
```

## How It Works

1. **Initialization**: Documents are chunked and embedded via `text-embedding-3-small`, then cached
2. **Query Processing**: User questions generate 2-4 search queries via LLM
3. **Vector Search**: Each query is embedded and compared against cached embeddings
4. **Context Assembly**: Top matching chunks are combined into context
5. **Answer Generation**: GPT-5 answers based strictly on the provided context

## Requirements

- Node.js 18+
- OpenAI API key with access to:
  - `text-embedding-3-small` model
  - `gpt-5` model

## Configuration

Key constants:
- `CHUNK_SIZE`: 400 characters per chunk (in `embeddings-service.ts`)
- Embedding model: `text-embedding-3-small`
- Chat model: `gpt-5`

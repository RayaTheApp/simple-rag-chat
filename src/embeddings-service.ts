import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const CHUNK_SIZE = 400;

export type Chunk = { source: string; content: string };

export interface EmbeddingsCache {
  chunks: Chunk[];
  embeddings: number[][];
}

interface SearchResult {
  idx: number;
  score: number;
  chunk: Chunk;
}

/**
 * Service for managing document embeddings and vector search.
 * Handles chunking, caching, and retrieval of document embeddings.
 */
export class EmbeddingsService {
  private cachePath: string;
  private docsDir: string;
  private openai: OpenAI;
  private cache?: EmbeddingsCache;

  constructor(openai: OpenAI, docsDir: string, cachePath: string) {
    this.openai = openai;
    this.docsDir = docsDir;
    this.cachePath = cachePath;
  }

  /**
   * Initialize the service by loading or creating embeddings cache
   */
  async initialize(): Promise<void> {
    const dir = path.dirname(this.cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.cachePath)) {
      this.cache = this.loadCache();
    } else {
      await this.rebuildCache();
    }
  }

  /**
   * Load the embeddings cache from disk
   */
  private loadCache(): EmbeddingsCache {
    const data = fs.readFileSync(this.cachePath, 'utf8');
    return JSON.parse(data) as EmbeddingsCache;
  }

  /**
   * Save the embeddings cache to disk
   */
  private saveCache(cache: EmbeddingsCache): void {
    fs.writeFileSync(this.cachePath, JSON.stringify(cache));
  }

  /**
   * Rebuild the entire embeddings cache from scratch
   */
  async rebuildCache(): Promise<void> {
    const chunks = this.loadMarkdownChunks();
    const embeddings = await this.embedTexts(chunks.map(c => c.content));

    this.cache = { chunks, embeddings };
    this.saveCache(this.cache);
  }

  /**
   * Load and chunk all markdown files from the docs directory
   */
  private loadMarkdownChunks(): Chunk[] {
    const chunks: Chunk[] = [];
    if (!fs.existsSync(this.docsDir)) return chunks;

    const files = this.walkFiles(this.docsDir, '.md');

    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (let i = 0; i < text.length; i += CHUNK_SIZE + 1) {
        const chunk = text.slice(i, i + CHUNK_SIZE);
        chunks.push({
          source: path.relative('.', file),
          content: chunk
        });
      }
    }

    return chunks;
  }

  /**
   * Recursively walk a directory tree to find files with a given extension
   */
  private walkFiles(dir: string, ext: string): string[] {
    let results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        results = results.concat(this.walkFiles(fullPath, ext));
      } else if (entry.isFile() && fullPath.endsWith(ext)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Generate embeddings for an array of text strings
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const resp = await this.openai.embeddings.create({
        input: text,
        model: 'text-embedding-3-small'
      });
      embeddings.push(resp.data[0].embedding);
    }

    return embeddings;
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = normA * normB;

    if (denominator === 0) return 0;
    return dotProduct / Math.sqrt(denominator);
  }

  /**
   * Search for the most relevant chunks given a query embedding
   */
  async search(queryText: string, k: number = 4): Promise<SearchResult[]> {
    if (!this.cache) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const queryEmbeddings = await this.embedTexts([queryText]);
    const queryEmbed = queryEmbeddings[0];

    const scores: SearchResult[] = [];

    const cache = this.loadCache();

    for (let i = 0; i < cache.embeddings.length; i++) {
      const score = this.cosineSimilarity(queryEmbed, cache.embeddings[i]);
      scores.push({
        idx: i,
        score: score,
        chunk: cache.chunks[i]
      });
    }

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, k);
  }

  /**
   * Search with multiple query strings and combine results
   */
  async multiSearch(queries: string[], k: number = 3): Promise<Chunk[]> {
    if (!this.cache) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const idxSet = new Set<number>();

    for (const query of queries) {
      const results = await this.search(query, k);
      results.forEach(r => idxSet.add(r.idx));
    }

    return Array.from(idxSet).map(i => this.cache!.chunks[i]);
  }

  /**
   * Get all chunks from the cache
   */
  getChunks(): Chunk[] {
    if (!this.cache) {
      throw new Error('Service not initialized. Call initialize() first.');
    }
    return this.cache.chunks;
  }

  /**
   * Get statistics about the cache
   */
  getCacheStats() {
    if (!this.cache) {
      return { chunkCount: 0, embeddingDim: 0 };
    }

    return {
      chunkCount: this.cache.chunks.length,
      embeddingDim: this.cache.embeddings[0]?.length || 0
    };
  }
}

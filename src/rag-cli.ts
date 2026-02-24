#!/usr/bin/env node
/*
 * Simple RAG CLI (backend-only) implemented in TypeScript.
 *
 * Features:
 *  - Load & chunk markdown docs from data/company-data/*.md
 *  - Cache embeddings in .cache/embeddings.json on first run
 *  - Interactive ask/answer loop (vector search + LLM)
 *  - Requires OPENAI_API_KEY environment variable
 *  - TODO stub for future `train` command
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import OpenAI from 'openai';
import { EmbeddingsService, type Chunk } from './embeddings-service.js';

const DOCS_DIR = path.resolve('data', 'company-data');
const CACHE_PATH = path.resolve('.cache', 'embeddings.json');

let openai: OpenAI;
let embeddingsService: EmbeddingsService;
let debug = false;

// -------------- LLM Wrapper ------------------

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

async function chatCompletion(messages: Message[]): Promise<string> {
  if (debug) {
    console.log('\n[DEBUG] LLM Request:');
    console.log(JSON.stringify({ model: 'gpt-5', messages }, null, 2));
  }
  const resp = await openai.chat.completions.create({
    model: 'gpt-5',
    messages
  });
  const content = resp.choices[0].message.content || '';
  if (debug) {
    console.log('\n[DEBUG] LLM Response:');
    console.log(content);
  }
  return content;
}

// -------------- Prompt helpers ---------------

const SYSTEM_QUERY_GEN = `You are an assistant that suggests concise search queries (2–4) users might run in a vector search over company documentation. Return ONLY a JSON list of strings.`;

const SYSTEM_ANSWER = `Answer the question strictly based on the provided context. If the answer is not contained, say you don't know.`;

async function proposeSearchQueries(question: string): Promise<string[]> {
  const raw = await chatCompletion([
    { role: 'system', content: SYSTEM_QUERY_GEN },
    { role: 'user', content: question }
  ]);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const queries = parsed.slice(0, 4).map(String).filter(q => q.trim().length > 0);
      if (queries.length > 0) return queries;
    }
  } catch {
    /* ignore */
  }
  const fallback = question.split(' ').filter(q => q.trim().length > 0).slice(0, 4);
  return fallback.length > 0 ? fallback : [question];
}

function buildContext(chunks: Chunk[]): string {
  return chunks
    .map((chunk) => `### Source: ${chunk.source}\n${chunk.content}`)
    .join('\n');
}

async function answerQuestion(question: string): Promise<string> {
  if (debug) console.log('\n[DEBUG] Generating search queries...');
  const queries = await proposeSearchQueries(question);
  if (debug) console.log('[DEBUG] Search queries:', queries);

  if (debug) console.log('[DEBUG] Searching embeddings...');
  const chunks = await embeddingsService.multiSearch(queries, 3);
  if (debug) console.log(`[DEBUG] Found ${chunks.length} chunks`);

  const context = buildContext(chunks);

  const response = await chatCompletion([
    { role: 'system', content: SYSTEM_ANSWER },
    { role: 'system', content: `Context:\n${context}` },
    { role: 'user', content: question }
  ]);
  return response;
}

// --------------- Spinner ---------------------

function createSpinner(message = 'Thinking') {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r${frames[i++ % frames.length]} ${message}...`);
  }, 80);
  return {
    stop() {
      clearInterval(id);
      process.stdout.write('\r' + ' '.repeat(message.length + 6) + '\r');
    }
  };
}

// --------------- CLI -------------------------

async function interactiveCLI() {
  console.log('Simple RAG CLI. Type "exit" to quit.');

  console.log('Initializing embeddings cache...');
  await embeddingsService.initialize();

  const stats = embeddingsService.getCacheStats();
  console.log(`Loaded ${stats.chunkCount} chunks (embedding dim: ${stats.embeddingDim})`);

  console.log("\nHey, I'm your company docs assistant! Ask me about policies, benefits, or procedures.");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let closed = false;

  rl.on('close', () => {
    closed = true;
  });

  const ask = (): void => {
    if (closed) return;
    rl.question('\n> ', async (line) => {
      const q = line.trim();
      if (!q || q.toLowerCase() === 'exit' || q.toLowerCase() === 'quit') {
        rl.close();
        return;
      }
      const spinner = createSpinner();
      const ans = await answerQuestion(q);
      spinner.stop();
      console.log('\n' + wrap(ans, 80));
      ask();
    });
  };

  ask();
}

function wrap(text: string, width: number): string {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (!last || last.length + word.length + 1 > width) lines.push(word);
    else lines[lines.length - 1] = last + ' ' + word;
  }
  return lines.join('\n');
}

// --------------- Main ------------------------

async function promptForAPIKey(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter your OpenAI API key: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function addFile(filePath: string): Promise<void> {
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  // Validate it's a file, not a directory
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    console.error(`Error: ${filePath} is not a file`);
    process.exit(1);
  }

  // Validate it's a markdown file
  if (!filePath.endsWith('.md')) {
    console.error('Error: Only .md (markdown) files are supported');
    process.exit(1);
  }

  // Create destination path
  const fileName = path.basename(filePath);
  const destPath = path.join(DOCS_DIR, fileName);

  // Check if file already exists
  if (fs.existsSync(destPath)) {
    console.error(`Error: File ${fileName} already exists in ${DOCS_DIR}`);
    process.exit(1);
  }

  // Copy file to company data directory
  console.log(`Adding ${fileName} to knowledge base...`);
  fs.copyFileSync(filePath, destPath);
  console.log(`✓ File copied to ${destPath}`);

  // Rebuild embeddings cache
  console.log('Rebuilding embeddings cache...');
  await embeddingsService.rebuildCache();

  const stats2 = embeddingsService.getCacheStats();
  console.log(`✓ Cache rebuilt with ${stats2.chunkCount} chunks`);
  console.log('File added successfully!');
}

(async () => {
  let apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    apiKey = await promptForAPIKey();
    if (!apiKey) {
      console.error('Error: API key is required to run this CLI.');
      process.exit(1);
    }
  }

  openai = new OpenAI({ apiKey, baseURL: 'https://very.raya.cool' });
  embeddingsService = new EmbeddingsService(openai, DOCS_DIR, CACHE_PATH);

  // Parse command line arguments
  const args = process.argv.slice(2);
  debug = args.includes('--debug');
  const filteredArgs = args.filter(a => a !== '--debug');
  const cmd = filteredArgs[0];

  if (cmd === 'train') {
    console.log('Rebuilding embeddings cache...');
    await embeddingsService.rebuildCache();
    console.log('Cache rebuilt successfully.');
    process.exit(0);
  }

  if (cmd === '--add-file') {
    const filePath = filteredArgs[1];
    if (!filePath) {
      console.error('Error: --add-file requires a file path');
      console.error('Usage: npx rag --add-file <path-to-file.md>');
      process.exit(1);
    }
    await addFile(filePath);
    process.exit(0);
  }

  // No command or unrecognized command - start interactive mode
  await interactiveCLI();
})();


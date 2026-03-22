import { GoogleGenerativeAI } from '@google/generative-ai';
import { Chunk } from './chunk-text';

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

const BATCH_SIZE = 10;
const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function embedChunks(
  chunks: Chunk[],
  apiKey: string,
  onProgress?: (done: number, total: number) => void
): Promise<EmbeddedChunk[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const embedded: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async chunk => {
        const result = await model.embedContent(chunk.content);
        return {
          ...chunk,
          embedding: result.embedding.values,
        };
      })
    );

    embedded.push(...results);
    onProgress?.(Math.min(i + BATCH_SIZE, chunks.length), chunks.length);

    // Rate limit protection
    if (i + BATCH_SIZE < chunks.length) {
      await sleep(DELAY_MS);
    }
  }

  return embedded;
}

export async function embedQuery(
  query: string,
  apiKey: string
): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(query);
  return result.embedding.values;
}
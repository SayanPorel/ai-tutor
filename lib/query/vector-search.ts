import { EmbeddedChunk } from '../ingestion/embed-chunks';

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ScoredChunk extends EmbeddedChunk {
  similarityScore: number;
}

export function vectorSearch(
  queryEmbedding: number[],
  chunks: EmbeddedChunk[],
  allowedChunkIds: string[],
  topK: number = 20
): ScoredChunk[] {
  // Only search within pruned chapters
  const filteredChunks = chunks.filter(c => allowedChunkIds.includes(c.id));

  const scored = filteredChunks.map(chunk => ({
    ...chunk,
    similarityScore: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return scored
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, topK);
}
import { ScoredChunk } from './vector-search';
import { extractKeywords } from '../ingestion/detect-chapters';

export interface RankedChunk extends ScoredChunk {
  bm25Score: number;
  finalScore: number;
}

function bm25Score(
  query: string,
  document: string,
  avgDocLength: number = 400,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const queryTerms = extractKeywords(query);
  const docWords = document.toLowerCase().split(/\s+/);
  const docLength = docWords.length;

  let score = 0;
  queryTerms.forEach(term => {
    const tf = docWords.filter(w => w.includes(term)).length;
    if (tf === 0) return;

    const idf = Math.log(1 + 1 / (0.5 + 0.5));
    const tfNorm = (tf * (k1 + 1)) /
      (tf + k1 * (1 - b + b * docLength / avgDocLength));
    score += idf * tfNorm;
  });

  return score;
}

// Strip sentences with zero keyword overlap — reduces tokens before sending
export function trimChunkToQuery(chunk: string, query: string): string {
  const queryKeywords = extractKeywords(query);
  const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 10);

  const relevant = sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return queryKeywords.some(kw => lower.includes(kw));
  });

  // Always keep at least 3 sentences even if no keyword match
  const result = relevant.length >= 3 ? relevant : sentences.slice(0, 3);
  return result.join('. ').trim();
}

export function rerankChunks(
  query: string,
  chunks: ScoredChunk[],
  topK: number = 3
): RankedChunk[] {
  const avgLength = chunks.reduce((s, c) => s + c.content.split(' ').length, 0)
    / Math.max(chunks.length, 1);

  const ranked = chunks.map(chunk => {
    const bm25 = bm25Score(query, chunk.content, avgLength);
    // Combine vector similarity (70%) with BM25 (30%)
    const finalScore = 0.7 * chunk.similarityScore + 0.3 * (bm25 / 10);
    return { ...chunk, bm25Score: bm25, finalScore };
  });

  return ranked
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK);
}
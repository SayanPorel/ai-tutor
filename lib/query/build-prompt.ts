import { RankedChunk } from './rerank';
import { trimChunkToQuery } from './rerank';

const MAX_TOKENS = 1500;
const TOKENS_PER_CHAR = 0.25;

export interface PromptResult {
  prompt: string;
  systemPrompt: string;
  tokenEstimate: number;
  chunksUsed: number;
  contextText: string;
}

export function buildPrompt(
  query: string,
  chunks: RankedChunk[],
  subject?: string,
  board?: string
): PromptResult {
  const systemPrompt = `You are an expert ${subject || 'subject'} tutor for ${board || 'Indian'} curriculum students. 
Answer questions clearly and concisely based only on the provided textbook context.
Keep your answer under 120 words. Be direct and educational.
If the answer is not in the context, say "This topic may be in a different chapter."`;

  // Trim each chunk to remove irrelevant sentences
  const trimmedChunks = chunks.map(c => ({
    ...c,
    trimmedContent: trimChunkToQuery(c.content, query),
  }));

  // Build context with token budget
  let contextText = '';
  let tokensUsed = Math.ceil(systemPrompt.length * TOKENS_PER_CHAR) + 50;
  let chunksUsed = 0;

  for (const chunk of trimmedChunks) {
    const chunkTokens = Math.ceil(chunk.trimmedContent.length * TOKENS_PER_CHAR);
    if (tokensUsed + chunkTokens > MAX_TOKENS) break;

    contextText += `\n[${chunk.chapterTitle}]\n${chunk.trimmedContent}\n`;
    tokensUsed += chunkTokens;
    chunksUsed++;
  }

  const prompt = `Context from textbook:
${contextText}

Student question: ${query}

Answer:`;

  return {
    prompt,
    systemPrompt,
    tokenEstimate: tokensUsed,
    chunksUsed,
    contextText,
  };
}

export function calculateCost(tokens: number): number {
  // Gemini Flash: $0.075 per 1M input tokens
  return (tokens / 1_000_000) * 0.075;
}

export function calculateBaselineCost(): number {
  // Baseline: 8000 tokens (naive full-context RAG)
  return (8000 / 1_000_000) * 0.075;
}
import { Chapter } from './detect-chapters';

export interface Chunk {
  id: string;
  chapterIndex: number;
  chapterTitle: string;
  content: string;
  tokenEstimate: number;
  startPos: number;
}

const CHUNK_SIZE = 500;
const OVERLAP = 50;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) chunks.push(chunk.trim());
    i += chunkSize - overlap;
  }

  return chunks;
}

export function chunkChapters(chapters: Chapter[]): Chunk[] {
  const allChunks: Chunk[] = [];

  chapters.forEach(chapter => {
    const textChunks = chunkText(chapter.content, CHUNK_SIZE, OVERLAP);

    textChunks.forEach((content, idx) => {
      allChunks.push({
        id: `ch${chapter.index}_chunk${idx}`,
        chapterIndex: chapter.index,
        chapterTitle: chapter.title,
        content,
        tokenEstimate: estimateTokens(content),
        startPos: chapter.startPos,
      });
    });
  });

  return allChunks;
}
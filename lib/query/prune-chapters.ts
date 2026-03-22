import { ChapterIndex } from '../ingestion/build-index';
import { extractKeywords } from '../ingestion/detect-chapters';

export interface PruneResult {
  matchedChapters: string[];
  matchedChunkIds: string[];
  totalChapters: number;
  prunedChapters: number;
}

export function pruneChapters(
  query: string,
  chapterIndex: ChapterIndex,
  topK: number = 2
): PruneResult {
  const queryKeywords = extractKeywords(query);
  const totalChapters = Object.keys(chapterIndex).length;

  // Score each chapter by keyword overlap
  const scores: { title: string; score: number; chunkIds: string[] }[] = [];

  Object.entries(chapterIndex).forEach(([title, data]) => {
    const overlap = queryKeywords.filter(kw =>
      data.keywords.some(ck => ck.includes(kw) || kw.includes(ck))
    ).length;

    // Also check if query words appear in chapter title
    const titleMatch = queryKeywords.filter(kw =>
      title.toLowerCase().includes(kw)
    ).length * 2; // Title matches worth double

    scores.push({
      title,
      score: overlap + titleMatch,
      chunkIds: data.chunkIds,
    });
  });

  // Sort by score, take top K
  scores.sort((a, b) => b.score - a.score);

  // Always take at least 1, at most topK chapters
  const topChapters = scores.slice(0, Math.max(1, topK));
  const matchedChapters = topChapters.map(s => s.title);
  const matchedChunkIds = topChapters.flatMap(s => s.chunkIds);

  return {
    matchedChapters,
    matchedChunkIds,
    totalChapters,
    prunedChapters: totalChapters - topChapters.length,
  };
}
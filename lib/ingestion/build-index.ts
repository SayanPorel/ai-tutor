import fs from 'fs';
import path from 'path';
import { EmbeddedChunk } from './embed-chunks';
import { Chapter } from './detect-chapters';

const INDEX_DIR = path.join(process.cwd(), 'data', 'indexes');

export interface ChapterIndex {
  [chapterTitle: string]: {
    index: number;
    keywords: string[];
    chunkIds: string[];
  };
}

export interface TextbookIndex {
  textbookId: number;
  title: string;
  chapterIndex: ChapterIndex;
  chunks: EmbeddedChunk[];
  createdAt: string;
}

export function saveIndex(
  textbookId: number,
  title: string,
  chapters: Chapter[],
  embeddedChunks: EmbeddedChunk[]
): void {
  if (!fs.existsSync(INDEX_DIR)) {
    fs.mkdirSync(INDEX_DIR, { recursive: true });
  }

  // Build chapter index
  const chapterIndex: ChapterIndex = {};
  chapters.forEach(ch => {
    const chunkIds = embeddedChunks
      .filter(c => c.chapterIndex === ch.index)
      .map(c => c.id);

    chapterIndex[ch.title] = {
      index: ch.index,
      keywords: ch.keywords,
      chunkIds,
    };
  });

  const index: TextbookIndex = {
    textbookId,
    title,
    chapterIndex,
    chunks: embeddedChunks,
    createdAt: new Date().toISOString(),
  };

  const filePath = path.join(INDEX_DIR, `textbook_${textbookId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(index), 'utf-8');
}

export function loadIndex(textbookId: number): TextbookIndex | null {
  const filePath = path.join(INDEX_DIR, `textbook_${textbookId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function indexExists(textbookId: number): boolean {
  const filePath = path.join(INDEX_DIR, `textbook_${textbookId}.json`);
  return fs.existsSync(filePath);
}
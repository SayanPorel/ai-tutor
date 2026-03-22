export interface Chapter {
  index: number;
  title: string;
  content: string;
  keywords: string[];
  startPos: number;
  endPos: number;
}

// Common chapter heading patterns in Indian textbooks
const CHAPTER_PATTERNS = [
  /^chapter\s+(\d+|[ivxlcdm]+)[:\s\-–—]+(.+)$/im,
  /^unit\s+(\d+|[ivxlcdm]+)[:\s\-–—]+(.+)$/im,
  /^\d+\.\s+([A-Z][^a-z]{3,})$/m,
  /^([A-Z][A-Z\s]{4,})$/m,
];

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for',
  'of','with','by','from','is','are','was','were','be','been',
  'have','has','had','do','does','did','will','would','could',
  'should','may','might','shall','this','that','these','those',
  'it','its','we','our','you','your','they','their','what',
  'which','who','how','when','where','why','all','each','every',
]);

export function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  // Count frequency
  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  // Return top 20 keywords by frequency
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

export function detectChapters(fullText: string): Chapter[] {
  const lines = fullText.split('\n');
  const chapterBreaks: { lineIndex: number; title: string }[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return;

    for (const pattern of CHAPTER_PATTERNS) {
      if (pattern.test(trimmed) && trimmed.length < 80) {
        chapterBreaks.push({ lineIndex: i, title: trimmed });
        break;
      }
    }
  });

  // If no chapters detected, split into equal parts
  if (chapterBreaks.length < 2) {
    return splitIntoSections(fullText);
  }

  const chapters: Chapter[] = [];
  for (let i = 0; i < chapterBreaks.length; i++) {
    const start = chapterBreaks[i].lineIndex;
    const end = i + 1 < chapterBreaks.length
      ? chapterBreaks[i + 1].lineIndex
      : lines.length;

    const content = lines.slice(start, end).join('\n').trim();
    const startPos = lines.slice(0, start).join('\n').length;
    const endPos = startPos + content.length;

    chapters.push({
      index: i,
      title: chapterBreaks[i].title,
      content,
      keywords: extractKeywords(content),
      startPos,
      endPos,
    });
  }

  return chapters;
}

function splitIntoSections(text: string): Chapter[] {
  const sectionSize = Math.ceil(text.length / 10);
  const sections: Chapter[] = [];

  for (let i = 0; i < 10; i++) {
    const start = i * sectionSize;
    const end = Math.min((i + 1) * sectionSize, text.length);
    const content = text.slice(start, end);

    sections.push({
      index: i,
      title: `Section ${i + 1}`,
      content,
      keywords: extractKeywords(content),
      startPos: start,
      endPos: end,
    });
  }

  return sections;
}
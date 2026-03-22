import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { parsePDF } from '@/lib/ingestion/parse-pdf';
import { detectChapters } from '@/lib/ingestion/detect-chapters';
import { chunkChapters } from '@/lib/ingestion/chunk-text';
import { embedChunks } from '@/lib/ingestion/embed-chunks';
import { saveIndex } from '@/lib/ingestion/build-index';
import { saveTextbook } from '@/lib/db/queries';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const subject = formData.get('subject') as string;
    const board = formData.get('board') as string;
    const apiKey = formData.get('apiKey') as string;

    if (!file || !apiKey) {
      return NextResponse.json(
        { error: 'File and API key required' },
        { status: 400 }
      );
    }

    // Save PDF to disk
    const uploadDir = path.join(process.cwd(), 'data', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Step 1: Parse PDF
    const parsed = await parsePDF(filePath);

    // Step 2: Detect chapters
    const chapters = detectChapters(parsed.fullText);

    // Step 3: Chunk text
    const chunks = chunkChapters(chapters);

    // Step 4: Embed chunks (this is the one-time cost)
    const embedded = await embedChunks(chunks, apiKey);

    // Step 5: Save textbook to DB
    const result = saveTextbook(
      title || parsed.title,
      subject,
      board,
      filePath,
      chunks.length
    );
    const textbookId = (result as any).lastInsertRowid as number;

    // Step 6: Save index to disk
    saveIndex(textbookId, title || parsed.title, chapters, embedded);

    return NextResponse.json({
      success: true,
      textbookId,
      stats: {
        pages: parsed.pageCount,
        chapters: chapters.length,
        chunks: chunks.length,
        embedded: embedded.length,
      },
    });
  } catch (err: any) {
    console.error('Ingestion error:', err);
    return NextResponse.json(
      { error: err.message || 'Ingestion failed' },
      { status: 500 }
    );
  }
}
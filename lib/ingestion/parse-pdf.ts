import fs from 'fs';

export interface ParsedPDF {
  fullText: string;
  pageCount: number;
  title: string;
}

export async function parsePDF(filePath: string): Promise<ParsedPDF> {
  const buffer = fs.readFileSync(filePath);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParseModule = await import('pdf-parse') as any;
  const pdfParse = pdfParseModule.default || pdfParseModule;
  const data = await pdfParse(buffer);
  return {
    fullText: data.text,
    pageCount: data.numpages,
    title: data.info?.Title || 'Untitled',
  };
}
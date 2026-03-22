import pdfParse from 'pdf-parse';
import fs from 'fs';

export interface ParsedPDF {
  fullText: string;
  pageCount: number;
  title: string;
}

export async function parsePDF(filePath: string): Promise<ParsedPDF> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return {
    fullText: data.text,
    pageCount: data.numpages,
    title: data.info?.Title || 'Untitled',
  };
}
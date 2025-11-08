import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import Tesseract from 'tesseract.js';
import { supabase } from '@/integrations/supabase/client';

// 使用 legacy 内置 worker，避免外部路径问题
GlobalWorkerOptions.workerSrc = '';

export interface PdfPageData {
  pageNumber: number;
  text: string;
  imageDataUrl: string;
}

export type ParsedFile = string | PdfPageData[];

// 前端解析 PDF
export const parsePdfFrontend = async (
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PdfPageData[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPageData[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const imageDataUrl = canvas.toDataURL();

    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    items.sort((a, b) => {
      const yDiff = Math.abs(a.transform[5] - b.transform[5]);
      if (yDiff > 5) return b.transform[5] - a.transform[5];
      return a.transform[4] - b.transform[4];
    });

    let lastY = -1;
    let pageText = '';
    items.forEach((item) => {
      const y = item.transform[5];
      if (lastY !== -1 && Math.abs(y - lastY) > 5) pageText += '\n';
      pageText += item.str;
      lastY = y;
    });

    let finalText = pageText.trim();
    if (finalText.length < 5) {
      const ocrResult: any = await Tesseract.recognize(
        imageDataUrl,
        'eng+chi_sim',
        { logger: (m) => console.log(`OCR页 ${i}:`, m) }
      );
      finalText = ocrResult.data.text.trim();
    }

    pages.push({ pageNumber: i, text: finalText, imageDataUrl });
    if (onProgress) onProgress(i, pdf.numPages);
  }

  return pages;
};

// 后端解析 PDF（备用）
export const parsePdfBackend = async (file: File): Promise<PdfPageData[]> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data, error } = await supabase.functions.invoke('parse-pdf', { body: formData });
  if (error) throw new Error('后端 PDF 解析失败');
  if (!data.success) throw new Error(data.error || '后端 PDF 解析失败');
  return data.pages;
};

// 主解析函数
export const parsePdfFile = async (
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PdfPageData[]> => {
  try {
    const pages = await parsePdfFrontend(file, onProgress);
    if (!pages || pages.length === 0 || pages.every(p => p.text.length < 5)) {
      return await parsePdfBackend(file);
    }
    return pages;
  } catch {
    return await parsePdfBackend(file);
  }
};

// 普通文本解析
export const parseTextFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// 自动选择解析方式
export const parseFile = async (
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<ParsedFile> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return parseTextFile(file);
  if (ext === 'pdf') return parsePdfFile(file, onProgress);
  throw new Error('Unsupported file type. Only .txt and .pdf supported.');
};

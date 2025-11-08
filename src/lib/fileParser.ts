import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PdfPageData {
  text: string;
  imageDataUrl: string;
}

export const parsePdfFile = async (file: File, onProgress?: (page: number, total: number) => void): Promise<PdfPageData[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const result: PdfPageData[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // Render page to canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const imageDataUrl = canvas.toDataURL();

    // Extract text content
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
      if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) pageText += ' ';
      pageText += item.str;
      lastY = y;
    });

    // OCR fallback if text is too short
    if (pageText.trim().length < 5) {
      console.log(`Page ${i} text too short, using OCR...`);
      const ocrResult = await Tesseract.recognize(imageDataUrl, 'eng+chi_sim', {
        logger: (m) => console.log(`OCR progress page ${i}:`, m)
      });
      pageText = ocrResult.data.text;
    }

    result.push({ text: pageText, imageDataUrl });

    if (onProgress) onProgress(i, totalPages);
  }

  return result;
};

// 普通文本文件解析
export const parseTextFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// 自动选择解析方式
export const parseFile = async (file: File, onProgress?: (page: number, total: number) => void): Promise<string | PdfPageData[]> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return parseTextFile(file);
  if (ext === 'pdf') return parsePdfFile(file, onProgress);
  throw new Error('Unsupported file type. Only .txt and .pdf supported.');
};

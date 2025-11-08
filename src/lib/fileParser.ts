import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { supabase } from '@/integrations/supabase/client';

// PDF.js worker 配置
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// 每页数据类型
export interface PdfPageData {
  pageNumber: number;
  text: string;
  imageDataUrl: string;
}

// 前端解析 PDF
const parsePdfFrontend = async (
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PdfPageData[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPageData[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // 渲染到 canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const imageDataUrl = canvas.toDataURL();

    // 提取文本
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    // 按纵向再横向排序
    items.sort((a, b) => {
      const yDiff = Math.abs(a.transform[5] - b.transform[5]);
      if (yDiff > 5) return b.transform[5] - a.transform[5];
      return a.transform[4] - b.transform[4];
    });

    // 构建文本并保留换行
    let lastY = -1;
    let pageText = '';
    items.forEach((item) => {
      const y = item.transform[5];
      if (lastY !== -1 && Math.abs(y - lastY) > 5) pageText += '\n';
      pageText += item.str;
      lastY = y;
    });

    let finalText = pageText.trim();

    // OCR fallback
    if (finalText.length < 5) {
      console.log(`第 ${i} 页文本不足，使用 OCR 解析...`);
      const ocrResult = await Tesseract.recognize(
        imageDataUrl,
        'eng+chi_sim',
        { logger: (m) => console.log(`OCR进度: 页 ${i}`, m) }
      );
      finalText = ocrResult.data.text.trim();
    }

    pages.push({ pageNumber: i, text: finalText, imageDataUrl });

    if (onProgress) onProgress(i, pdf.numPages);
  }

  return pages;
};

// 后端解析 PDF（备用）
const parsePdfBackend = async (file: File): Promise<PdfPageData[]> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data, error } = await supabase.functions.invoke('parse-pdf', { body: formData });
  if (error) throw new Error('后端 PDF 解析失败');
  if (!data.success) throw new Error(data.error || '后端 PDF 解析失败');

  // 假设后端返回每页对象 { pageNumber, text, imageDataUrl }
  return data.pages;
};

// 主解析函数
export const parsePdfFile = async (
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PdfPageData[]> => {
  try {
    console.log('尝试前端解析 PDF...');
    const pages = await parsePdfFrontend(file, onProgress);

    if (!pages || pages.length === 0 || pages.every(p => p.text.length < 5)) {
      console.log('前端解析文本不足，尝试后端解析...');
      return await parsePdfBackend(file);
    }

    console.log('前端 PDF 解析成功');
    return pages;
  } catch (err) {
    console.warn('前端解析失败，尝试后端解析...', err);
    try {
      return await parsePdfBackend(file);
    } catch (backendErr) {
      console.error('后端解析也失败了', backendErr);
      throw new Error('PDF 解析失败，请尝试其他文件或检查 PDF 是否损坏');
    }
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
): Promise<string | PdfPageData[]> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return parseTextFile(file);
  if (ext === 'pdf') return parsePdfFile(file, onProgress);
  throw new Error('Unsupported file type. Only .txt and .pdf supported.');
};

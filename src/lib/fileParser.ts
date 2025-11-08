import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { supabase } from '@/integrations/supabase/client';

// 配置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// 前端解析 PDF
const parsePdfFrontend = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // 渲染到 canvas（用于 OCR fallback）
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    const pageDataUrl = canvas.toDataURL();

    // 提取文本
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str || '').join('');

    // 如果文本过短则使用 OCR
    let finalText = pageText.trim();
    if (finalText.length < 5) {
      console.log(`第 ${i} 页文本不足，使用 OCR 解析...`);
      const ocrResult = await Tesseract.recognize(
        pageDataUrl,
        'eng+chi_sim',
        { logger: (m) => console.log('OCR进度:', m) }
      );
      finalText = ocrResult.data.text.trim();
    }

    fullText += finalText + '\n\n';
  }

  return fullText.trim();
};

// 后端解析 PDF（备用）
const parsePdfBackend = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data, error } = await supabase.functions.invoke('parse-pdf', { body: formData });
  if (error) throw new Error('后端 PDF 解析失败');
  if (!data.success) throw new Error(data.error || '后端 PDF 解析失败');

  return data.content;
};

// 主解析函数
export const parsePdfFile = async (file: File): Promise<string> => {
  try {
    console.log('尝试前端解析 PDF...');
    const text = await parsePdfFrontend(file);
    if (text.length < 10) {
      console.log('前端解析文本不足，尝试后端解析...');
      return await parsePdfBackend(file);
    }
    console.log('前端 PDF 解析成功');
    return text;
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

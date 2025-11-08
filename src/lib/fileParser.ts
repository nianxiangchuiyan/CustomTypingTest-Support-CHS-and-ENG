import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '@/integrations/supabase/client';

// Configure PDF.js worker with local fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
} catch (error) {
  console.error('Failed to load PDF.js worker:', error);
}

export const parseTextFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const parsePdfBackend = async (file: File): Promise<string> => {
  console.log('Attempting backend PDF parsing...');
  const formData = new FormData();
  formData.append('file', file);

  const { data, error } = await supabase.functions.invoke('parse-pdf', {
    body: formData,
  });

  if (error) {
    console.error('Backend parsing error:', error);
    throw new Error('后端PDF解析失败');
  }

  if (!data.success) {
    throw new Error(data.error || '后端PDF解析失败');
  }

  return data.content;
};

const parsePdfFrontend = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Sort items by vertical then horizontal position for better text flow
    const items = textContent.items as any[];
    items.sort((a, b) => {
      const yDiff = Math.abs(a.transform[5] - b.transform[5]);
      if (yDiff > 5) {
        return b.transform[5] - a.transform[5]; // Top to bottom
      }
      return a.transform[4] - b.transform[4]; // Left to right
    });

    // Build text with proper spacing
    let lastY = -1;
    let pageText = '';
    items.forEach((item) => {
      const y = item.transform[5];
      
      // Add newline if we've moved to a new line
      if (lastY !== -1 && Math.abs(y - lastY) > 5) {
        pageText += '\n';
      }
      
      // Add space if needed
      if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
        pageText += ' ';
      }
      
      pageText += item.str;
      lastY = y;
    });

    fullText += pageText + '\n\n';
  }

  return fullText.trim();
};

export const parsePdfFile = async (file: File): Promise<string> => {
  try {
    console.log('Attempting frontend PDF parsing first...');
    const text = await parsePdfFrontend(file);
    
    // Check if we got meaningful text
    if (!text || text.trim().length < 10) {
      console.log('Frontend parsing returned insufficient text, trying backend...');
      return await parsePdfBackend(file);
    }
    
    console.log('Frontend PDF parsing successful');
    return text;
  } catch (frontendError) {
    console.warn('Frontend PDF parsing failed:', frontendError);
    console.log('Falling back to backend parsing...');
    
    try {
      return await parsePdfBackend(file);
    } catch (backendError) {
      console.error('Backend PDF parsing also failed:', backendError);
      throw new Error('PDF解析失败，请确保文件未损坏或尝试其他PDF文件');
    }
  }
};

export const parseFile = async (file: File): Promise<string> => {
  const fileType = file.name.split('.').pop()?.toLowerCase();
  
  if (fileType === 'txt') {
    return parseTextFile(file);
  } else if (fileType === 'pdf') {
    return parsePdfFile(file);
  } else {
    throw new Error('Unsupported file type. Please upload a .txt or .pdf file.');
  }
};

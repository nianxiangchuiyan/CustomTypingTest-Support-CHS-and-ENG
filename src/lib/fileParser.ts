import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

export const parsePdfFile = async (file: File): Promise<string> => {
  try {
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
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('PDF解析失败，请确保文件未损坏');
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

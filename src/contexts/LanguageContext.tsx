import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  zh: {
    // 通用
    'app.title': '打字练习',
    'common.back': '返回主页',
    'common.reset': '重新开始',
    'common.progress': '进度',
    'common.delete': '删除',
    'common.practice': '练习',
    'common.copy': '抄写',
    'common.trace': '临摹',
    'common.language': '语言',
    'common.chinese': '中文',
    'common.english': 'English',
    
    // 主页
    'home.title': '打字练习',
    'home.subtitle': '提升你的打字速度和准确度',
    'home.upload.title': '上传文本文件',
    'home.upload.description': '支持 TXT、PDF 等格式',
    'home.library.title': '文本库',
    'home.library.description': '从预设文本中选择',
    'home.uploadFile': '上传文件',
    'home.selectText': '选择文本',
    'home.noTexts': '暂无保存的文本',
    
    // 文件上传
    'upload.button': '选择文件',
    'upload.parsing': '解析中，请稍候...',
    'upload.fileName': '文件名',
    'upload.startPractice': '开始练习',
    'upload.selectMode': '请选择练习模式',
    'upload.error.notFound': '文本未找到',
    'upload.error.description': '返回主页重新选择',
    
    // 临摹模式
    'trace.hint': '点击文本区域开始输入 · 支持中文输入法 · Backspace 回退 · Ctrl+Z 撤销 · Ctrl+Shift+Z 重做',
    
    // 抄写模式
    'copy.hint': '在下方输入框中输入文本内容进行抄写练习',
    'copy.placeholder': '开始输入...',
    'copy.autoScroll': '自动滚动',
    
    // 文本库
    'library.builtIn': '内置文本',
    'library.custom': '我的文本',
    'library.addCustom': '添加自定义文本',
    'library.textName': '文本名称',
    'library.textContent': '文本内容',
    'library.add': '添加',
    'library.cancel': '取消',
  },
  en: {
    // Common
    'app.title': 'Typing Practice',
    'common.back': 'Back to Home',
    'common.reset': 'Reset',
    'common.progress': 'Progress',
    'common.delete': 'Delete',
    'common.practice': 'Practice',
    'common.copy': 'Copy',
    'common.trace': 'Trace',
    'common.language': 'Language',
    'common.chinese': '中文',
    'common.english': 'English',
    
    // Home
    'home.title': 'Typing Practice',
    'home.subtitle': 'Improve your typing speed and accuracy',
    'home.upload.title': 'Upload Text File',
    'home.upload.description': 'Support TXT, PDF and more',
    'home.library.title': 'Text Library',
    'home.library.description': 'Choose from preset texts',
    'home.uploadFile': 'Upload File',
    'home.selectText': 'Select Text',
    'home.noTexts': 'No saved texts',
    
    // File Upload
    'upload.button': 'Choose File',
    'upload.parsing': 'Parsing, please wait...',
    'upload.fileName': 'File Name',
    'upload.startPractice': 'Start Practice',
    'upload.selectMode': 'Please select practice mode',
    'upload.error.notFound': 'Text not found',
    'upload.error.description': 'Return to home and select again',
    
    // Trace Mode
    'trace.hint': 'Click text area to start · IME supported · Backspace to undo · Ctrl+Z undo · Ctrl+Shift+Z redo',
    
    // Copy Mode
    'copy.hint': 'Type the text content in the input box below',
    'copy.placeholder': 'Start typing...',
    'copy.autoScroll': 'Auto Scroll',
    
    // Text Library
    'library.builtIn': 'Built-in Texts',
    'library.custom': 'My Texts',
    'library.addCustom': 'Add Custom Text',
    'library.textName': 'Text Name',
    'library.textContent': 'Text Content',
    'library.add': 'Add',
    'library.cancel': 'Cancel',
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('typing-practice-language');
    return (saved as Language) || 'zh';
  });

  useEffect(() => {
    localStorage.setItem('typing-practice-language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.zh] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export interface Progress {
  textId: string;
  mode: 'trace' | 'copy';
  position: number;
  timestamp: number;
}

export interface SavedText {
  id: string;
  name: string;
  content: string;
  timestamp: number;
}

const STORAGE_KEYS = {
  TEXTS: 'typing-practice-texts',
  PROGRESS: 'typing-practice-progress',
};

export const saveText = (name: string, content: string): string => {
  const texts = getSavedTexts();
  const id = Date.now().toString();
  const newText: SavedText = {
    id,
    name,
    content,
    timestamp: Date.now(),
  };
  
  texts.push(newText);
  localStorage.setItem(STORAGE_KEYS.TEXTS, JSON.stringify(texts));
  return id;
};

export const getSavedTexts = (): SavedText[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.TEXTS);
  return stored ? JSON.parse(stored) : [];
};

export const getTextById = (id: string): SavedText | null => {
  const texts = getSavedTexts();
  return texts.find(t => t.id === id) || null;
};

export const deleteText = (id: string): void => {
  const texts = getSavedTexts();
  const filtered = texts.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TEXTS, JSON.stringify(filtered));
  
  // Also delete associated progress
  const allProgress = getAllProgress();
  const filteredProgress = allProgress.filter(p => p.textId !== id);
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(filteredProgress));
};

export const saveProgress = (textId: string, mode: 'trace' | 'copy', position: number): void => {
  const allProgress = getAllProgress();
  const existingIndex = allProgress.findIndex(
    p => p.textId === textId && p.mode === mode
  );
  
  const progress: Progress = {
    textId,
    mode,
    position,
    timestamp: Date.now(),
  };
  
  if (existingIndex >= 0) {
    allProgress[existingIndex] = progress;
  } else {
    allProgress.push(progress);
  }
  
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProgress));
};

export const getProgress = (textId: string, mode: 'trace' | 'copy'): number => {
  const allProgress = getAllProgress();
  const progress = allProgress.find(p => p.textId === textId && p.mode === mode);
  return progress?.position || 0;
};

export const getAllProgress = (): Progress[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS);
  return stored ? JSON.parse(stored) : [];
};

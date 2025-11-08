import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { getTextById, saveProgress, getProgress } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

type CharStatus = 'untyped' | 'correct' | 'error';

interface CharacterState {
  char: string;
  status: CharStatus;
}

interface HistoryState {
  chars: CharacterState[];
  currentIndex: number;
}

const TraceMode = () => {
  const [chars, setChars] = useState<CharacterState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 初始化文本和进度
  // TraceMode 初始化
  useEffect(() => {
    if (!textId) return navigate('/');
  
    const savedText = getTextById(textId);
    if (!savedText) {
      toast({ title: '文本未找到', description: '返回主页重新选择', variant: 'destructive' });
      return navigate('/');
    }
  
    // ✅ 如果 content 是数组（PDF），合并每页文本
    let fullText = '';
    if (Array.isArray(savedText.content)) {
      fullText = savedText.content.map((p: any) => p.text || '').join('\n\n');
    } else if (typeof savedText.content === 'string') {
      fullText = savedText.content;
    } else {
      console.warn('文本内容类型异常，转为空字符串');
      fullText = '';
    }

  setText(fullText);

  const savedProgress = getProgress(textId, 'trace');
  const initialChars = fullText.replace(/\r\n/g, '\n').split('').map((char, index) => ({
    char,
    status: (index < savedProgress ? 'correct' : 'untyped') as CharStatus,
  }));

  setChars(initialChars);
  setCurrentIndex(savedProgress);
  setHistory([{ chars: structuredClone(initialChars), currentIndex: savedProgress }]);
}, [textId, navigate, toast]);


  // 自动保存
  useEffect(() => {
    const interval = setInterval(() => {
      if (textId) saveProgress(textId, 'trace', currentIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [textId, currentIndex]);

  useEffect(() => inputRef.current?.focus(), []);

  const getCharClass = (status: CharStatus) => {
    switch (status) {
      case 'correct': return 'text-correct';
      case 'error': return 'text-error';
      case 'untyped': return 'text-untyped';
    }
  };

  const pushHistory = (newChars: CharacterState[], newIndex: number) => {
    setChars(newChars);
    setCurrentIndex(newIndex);
    setHistory(prev => {
      const newHist = [...prev, { chars: structuredClone(newChars), currentIndex: newIndex }];
      if (newHist.length > 100) newHist.shift();
      return newHist;
    });
    setRedoStack([]);
  };

  const handleTypedText = (input: string) => {
    const normalizedInput = input.replace(/\r\n/g, '\n');
    let newIndex = currentIndex;
    const newChars = [...chars];

    for (let i = 0; i < normalizedInput.length && newIndex < newChars.length; i++) {
      const inputChar = normalizedInput[i];
      const isCorrect = inputChar === newChars[newIndex].char;
      newChars[newIndex].status = isCorrect ? 'correct' : 'error';
      newIndex++;
    }

    pushHistory(newChars, newIndex);
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    const composedText = e.data || '';
    if (!composedText) return;
    handleTypedText(composedText);
    e.currentTarget.value = '';
  };
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    const value = e.currentTarget.value;
    e.currentTarget.value = '';
    if (!value) return;
    handleTypedText(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;

    // Ctrl+Z 撤销
    if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (history.length > 1) {
        setHistory(prev => {
          const newHist = [...prev];
          const last = newHist.pop()!;
          setRedoStack(r => [...r, last]);
          const previous = newHist[newHist.length - 1];
          setChars(structuredClone(previous.chars));
          setCurrentIndex(previous.currentIndex);
          return newHist;
        });
      }
      return;
    }

    // Ctrl+Shift+Z 重做
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (redoStack.length > 0) {
        const next = redoStack[redoStack.length - 1];
        setRedoStack(prev => prev.slice(0, -1));
        setHistory(prev => [...prev, { chars: structuredClone(next.chars), currentIndex: next.currentIndex }]);
        setChars(structuredClone(next.chars));
        setCurrentIndex(next.currentIndex);
      }
      return;
    }

    // Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        const newChars = [...chars];
        newChars[currentIndex - 1].status = 'untyped';
        pushHistory(newChars, currentIndex - 1);
      }
    }

    // Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const newChars = [...chars];
      if (currentIndex < newChars.length) {
        newChars[currentIndex].status = newChars[currentIndex].char === '\n' ? 'correct' : 'error';
        pushHistory(newChars, currentIndex + 1);
      }
    }
  };

  const handleReset = () => {
    const resetChars: CharacterState[] = text.split('').map(char => ({ char, status: 'untyped' as CharStatus }));
    setChars(resetChars);
    setCurrentIndex(0);
    setHistory([{ chars: structuredClone(resetChars), currentIndex: 0 }]);
    setRedoStack([]);
    if (textId) saveProgress(textId, 'trace', 0);
    inputRef.current?.focus();
  };

  const progress = chars.length ? (currentIndex / chars.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> 返回主页
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              进度: {currentIndex} / {chars.length} ({progress.toFixed(1)}%)
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" /> 重新开始
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg p-8 shadow-lg relative">
          <div className="text-2xl leading-relaxed whitespace-pre-wrap font-mono" style={{ wordBreak: 'break-all' }}>
            {chars.map((c, idx) => (
              <span key={idx} className={`${getCharClass(c.status)} ${idx === currentIndex ? 'bg-accent/30' : ''}`}>
                {c.char === '\n' ? '↲\n' : c.char}
              </span>
            ))}
          </div>

          <textarea
            ref={inputRef}
            className="absolute inset-0 w-full h-full opacity-0 cursor-text resize-none outline-none"
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onInput={handleInput}
            autoFocus
          />
        </div>

        <div className="text-center text-sm text-muted-foreground">
          点击文本区域开始输入 · 支持中文输入法 · Backspace 回退 · Ctrl+Z 撤销 · Ctrl+Shift+Z 重做
        </div>
      </div>
    </div>
  );
};

export default TraceMode;

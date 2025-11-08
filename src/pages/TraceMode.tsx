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

const TraceMode = () => {
  const [history, setHistory] = useState<{ chars: CharacterState[]; currentIndex: number }[]>([]);
  const [redoStack, setRedoStack] = useState<{ chars: CharacterState[]; currentIndex: number }[]>([]); // ✅ 新增重做栈
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [text, setText] = useState<string>('');
  const [chars, setChars] = useState<CharacterState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  // 加载文本和进度
  useEffect(() => {
    if (!textId) {
      navigate('/');
      return;
    }

    const savedText = getTextById(textId);
    if (!savedText) {
      toast({
        title: '文本未找到',
        description: '返回主页重新选择',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setText(savedText.content);
    const savedProgress = getProgress(textId, 'trace');
    setCurrentIndex(savedProgress);

    const initialChars = savedText.content.split('').map((char, index) => ({
      char,
      status: index < savedProgress ? 'correct' : 'untyped',
    }));

    setChars(initialChars);
    setHistory([{ chars: structuredClone(initialChars), currentIndex: savedProgress }]); // ✅ 初始状态加入历史记录
  }, [textId, navigate, toast]);

  // 自动保存
  useEffect(() => {
    const interval = setInterval(() => {
      if (textId) saveProgress(textId, 'trace', currentIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [textId, currentIndex]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleReset = () => {
    const resetChars = text.split('').map(char => ({ char, status: 'untyped' }));
    setCurrentIndex(0);
    setChars(resetChars);
    setHistory([{ chars: structuredClone(resetChars), currentIndex: 0 }]);
    setRedoStack([]);
    if (textId) saveProgress(textId, 'trace', 0);
    inputRef.current?.focus();
  };

  const getCharClass = (status: CharStatus) => {
    switch (status) {
      case 'correct':
        return 'text-correct';
      case 'error':
        return 'text-error';
      case 'untyped':
        return 'text-untyped';
    }
  };

  const handleCompositionStart = () => setIsComposing(true);

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    const composedText = e.data?.trim() ? e.data : e.currentTarget.value;
    if (!composedText || currentIndex >= chars.length) {
      e.currentTarget.value = '';
      return;
    }

    let newIndex = currentIndex;
    const newChars = [...chars];
    for (let i = 0; i < composedText.length && newIndex < chars.length; i++) {
      const inputChar = composedText[i];
      newChars[newIndex].status =
        inputChar === newChars[newIndex].char ? 'correct' : 'error';
      newIndex++;
    }

    pushHistory(newChars, newIndex);
    setRedoStack([]); // ✅ 输入后清空重做栈

    e.currentTarget.value = '';
    if (newIndex === chars.length && textId) {
      saveProgress(textId, 'trace', newIndex);
      toast({ title: '完成练习！', description: '恭喜您完成了全部文本' });
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    const value = e.currentTarget.value;
    if (!value) return;

    const newChars = [...chars];
    let newIndex = currentIndex;
    for (let i = 0; i < value.length && newIndex < chars.length; i++) {
      const inputChar = value[i];
      newChars[newIndex].status =
        inputChar === newChars[newIndex].char ? 'correct' : 'error';
      newIndex++;
    }

    pushHistory(newChars, newIndex);
    setRedoStack([]); // ✅ 新输入后清空重做栈

    e.currentTarget.value = '';
    if (newIndex === chars.length && textId) {
      saveProgress(textId, 'trace', newIndex);
      toast({ title: '完成练习！', description: '恭喜您完成了全部文本' });
    }
  };

  /** ✅ 封装历史推入逻辑 */
  const pushHistory = (newChars: CharacterState[], newIndex: number) => {
    setHistory(prev => {
      const newHist = [...prev, { chars: structuredClone(newChars), currentIndex: newIndex }];
      if (newHist.length > 100) newHist.shift();
      return newHist;
    });
    setChars(newChars);
    setCurrentIndex(newIndex);
  };

    // ✅ Ctrl + Shift + Z 重做版本
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (isComposing) return;

  // ✅ 撤销 Ctrl + Z（不带 Shift）
  if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    if (history.length > 1) {
      setHistory(prev => {
        const newHist = [...prev];
        const last = newHist.pop()!;
        setRedoStack(r => [...r, last]); // 推入重做栈
        const previous = newHist[newHist.length - 1];
        setChars(structuredClone(previous.chars));
        setCurrentIndex(previous.currentIndex);
        return newHist;
      });
    }
    return;
  }

  // ✅ 重做 Ctrl + Shift + Z
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (redoStack.length > 0) {
      const next = redoStack[redoStack.length - 1];
      setRedoStack(prev => prev.slice(0, -1));
      setHistory(prev => [
        ...prev,
        { chars: structuredClone(next.chars), currentIndex: next.currentIndex },
      ]);
      setChars(structuredClone(next.chars));
      setCurrentIndex(next.currentIndex);
    }
    return;
  }
    // ✅ Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        const newChars = [...chars];
        newChars[currentIndex - 1].status = 'untyped';
        pushHistory(newChars, currentIndex - 1);
      }
    }
  };

  const progress = chars.length > 0 ? (currentIndex / chars.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回主页
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              进度: {currentIndex} / {chars.length} ({progress.toFixed(1)}%)
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重新开始
            </Button>
          </div>
        </div>

        {/* Typing Area */}
        <div className="bg-card rounded-lg p-8 shadow-lg relative">
          <div className="text-2xl leading-relaxed whitespace-pre-wrap font-mono" style={{ wordBreak: 'break-all' }}>
            {chars.map((char, index) => (
              <span
                key={index}
                className={`${getCharClass(char.status)} ${
                  index === currentIndex ? 'bg-accent/30' : ''
                } transition-colors`}
              >
                {/* ✅ 回车符显示为 ↩️ */}
                {char.char === '\n' ? '↩️\n' : char.char}
              </span>
            ))}
          </div>

          {/* 隐藏输入框 */}
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
          点击文本区域开始输入 · 支持中文输入法 · 使用 Backspace 回退 · Ctrl+Z 撤销 · Ctrl+Shift+Y 重做
        </div>
      </div>
    </div>
  );
};

export default TraceMode;

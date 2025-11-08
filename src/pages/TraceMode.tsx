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
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState<string>('');
  const [chars, setChars] = useState<CharacterState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComposing, setIsComposing] = useState(false);

  // 历史栈
  const [history, setHistory] = useState<{ chars: CharacterState[]; currentIndex: number }[]>([]);

  /** ---------- 初始化 ---------- **/
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

    const savedProgress = getProgress(textId, 'trace');
    const initialChars = savedText.content.split('').map((char, index) => ({
      char,
      status: index < savedProgress ? 'correct' : 'untyped',
    }));

    setText(savedText.content);
    setChars(initialChars);
    setCurrentIndex(savedProgress);

    // 初始化历史（加入初始状态）
    setHistory([{ chars: structuredClone(initialChars), currentIndex: savedProgress }]);
  }, [textId, navigate, toast]);

  /** ---------- 自动保存 ---------- **/
  useEffect(() => {
    const interval = setInterval(() => {
      if (textId) saveProgress(textId, 'trace', currentIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [textId, currentIndex]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /** ---------- 辅助函数 ---------- **/
  const getCharClass = (status: CharStatus) => {
    switch (status) {
      case 'correct': return 'text-correct';
      case 'error': return 'text-error';
      default: return 'text-untyped';
    }
  };

  const pushHistory = (newChars: CharacterState[], newIndex: number) => {
    setHistory(prev => {
      const newHist = [...prev, { chars: structuredClone(newChars), currentIndex: newIndex }];
      if (newHist.length > 100) newHist.shift(); // 限制 100 步
      return newHist;
    });
  };

  /** ---------- 输入法事件 ---------- **/
  const handleCompositionStart = () => setIsComposing(true);

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    const composedText = e.data?.trim() ?? '';
    if (!composedText || currentIndex >= chars.length) return;

    const newChars = structuredClone(chars);
    let newIndex = currentIndex;
    for (const ch of composedText) {
      if (newIndex >= newChars.length) break;
      newChars[newIndex].status = ch === newChars[newIndex].char ? 'correct' : 'error';
      newIndex++;
    }

    setChars(newChars);
    setCurrentIndex(newIndex);
    pushHistory(newChars, newIndex);

    e.currentTarget.value = '';

    if (newIndex === chars.length && textId) {
      saveProgress(textId, 'trace', newIndex);
      toast({ title: '完成练习！', description: '恭喜您完成了全部文本' });
    }
  };

  /** ---------- 普通输入 ---------- **/
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;

    const value = e.currentTarget.value;
    if (!value) return;

    const newChars = structuredClone(chars);
    let newIndex = currentIndex;
    for (const ch of value) {
      if (newIndex >= newChars.length) break;
      newChars[newIndex].status = ch === newChars[newIndex].char ? 'correct' : 'error';
      newIndex++;
    }

    setChars(newChars);
    setCurrentIndex(newIndex);
    pushHistory(newChars, newIndex);
    e.currentTarget.value = '';

    if (newIndex === chars.length && textId) {
      saveProgress(textId, 'trace', newIndex);
      toast({ title: '完成练习！', description: '恭喜您完成了全部文本' });
    }
  };

  /** ---------- 键盘事件 ---------- **/
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;

    // Ctrl + Z 撤销
    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      setHistory(prev => {
        if (prev.length <= 1) return prev; // 没有上一个状态
        const newHist = [...prev];
        newHist.pop();
        const last = newHist[newHist.length - 1];
        setChars(structuredClone(last.chars));
        setCurrentIndex(last.currentIndex);
        return newHist;
      });
      return;
    }

    // Backspace 删除一个字符
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        const newChars = structuredClone(chars);
        newChars[currentIndex - 1].status = 'untyped';
        setChars(newChars);
        setCurrentIndex(currentIndex - 1);
        pushHistory(newChars, currentIndex - 1);
      }
    }
  };

  /** ---------- 重置 ---------- **/
  const handleReset = () => {
    const resetChars = text.split('').map(char => ({ char, status: 'untyped' as CharStatus }));
    setChars(resetChars);
    setCurrentIndex(0);
    setHistory([{ chars: structuredClone(resetChars), currentIndex: 0 }]);
    if (textId) saveProgress(textId, 'trace', 0);
    inputRef.current?.focus();
  };

  const progress = chars.length ? (currentIndex / chars.length) * 100 : 0;

  /** ---------- 渲染 ---------- **/
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
            {chars.map((char, i) => (
              <span
                key={i}
                className={`${getCharClass(char.status)} ${i === currentIndex ? 'bg-accent/30' : ''} transition-colors`}
              >
                {char.char}
              </span>
            ))}
          </div>
          <textarea
            ref={inputRef}
            className="absolute inset-0 w-full h-full opacity-0 cursor-text resize-none outline-none"
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="text-center text-sm text-muted-foreground">
          点击文本区域开始输入 · 支持中文输入法 · Ctrl+Z 撤销 · Backspace 回退
        </div>
      </div>
    </div>
  );
};

export default TraceMode;

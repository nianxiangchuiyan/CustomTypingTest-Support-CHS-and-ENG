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
  const [text, setText] = useState<string>('');
  const [chars, setChars] = useState<CharacterState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const compositionRef = useRef<string>('');

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
    
    setChars(
      savedText.content.split('').map((char, index) => ({
        char,
        status: index < savedProgress ? 'correct' : 'untyped',
      }))
    );
  }, [textId, navigate, toast]);

  useEffect(() => {
    // Auto-save progress every 5 seconds
    const interval = setInterval(() => {
      if (textId) {
        saveProgress(textId, 'trace', currentIndex);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [textId, currentIndex]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionUpdate = (e: React.CompositionEvent) => {
    // Just track that composition is ongoing
  };

  const handleCompositionEnd = (e: React.CompositionEvent) => {
    setIsComposing(false);
    const composedText = e.data;
    
    if (!composedText || currentIndex >= chars.length) return;
    
    // Process each character from the composed text
    let newIndex = currentIndex;
    const newChars = [...chars];
    
    for (let i = 0; i < composedText.length && newIndex < chars.length; i++) {
      const inputChar = composedText[i];
      const isCorrect = inputChar === chars[newIndex].char;
      newChars[newIndex].status = isCorrect ? 'correct' : 'error';
      newIndex++;
    }
    
    setChars(newChars);
    setCurrentIndex(newIndex);

    if (newIndex === chars.length && textId) {
      saveProgress(textId, 'trace', newIndex);
      toast({
        title: '完成练习！',
        description: '恭喜您完成了全部文本',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Completely ignore all key events during IME composition
    if (isComposing) {
      return;
    }
    
    if (currentIndex >= chars.length) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        const newChars = [...chars];
        newChars[currentIndex - 1].status = 'untyped';
        setChars(newChars);
        setCurrentIndex(currentIndex - 1);
      }
      return;
    }

    // Only process single character keys (not during composition)
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const newChars = [...chars];
      const isCorrect = e.key === chars[currentIndex].char;
      newChars[currentIndex].status = isCorrect ? 'correct' : 'error';
      setChars(newChars);
      setCurrentIndex(currentIndex + 1);

      if (currentIndex + 1 === chars.length && textId) {
        saveProgress(textId, 'trace', currentIndex + 1);
        toast({
          title: '完成练习！',
          description: '恭喜您完成了全部文本',
        });
      }
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setChars(text.split('').map(char => ({ char, status: 'untyped' })));
    if (textId) {
      saveProgress(textId, 'trace', 0);
    }
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

  const progress = chars.length > 0 ? (currentIndex / chars.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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

        <div className="bg-card rounded-lg p-8 shadow-lg">
          <div className="bg-card rounded-lg p-8 shadow-lg">
          <div
            className="relative text-2xl leading-relaxed whitespace-pre-wrap font-mono"
            style={{ wordBreak: 'break-all' }}
          >
            {chars.map((char, index) => (
              <span
                key={index}
                className={`${getCharClass(char.status)} ${
                  index === currentIndex ? 'bg-accent/30' : ''
                } transition-colors`}
              >
                {char.char}
              </span>
            ))}
        
            {/* 隐藏的输入框，用于 IME */}
            <textarea
              ref={inputRef}
              value=""
              onChange={() => {}} // 必需但留空
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                const composedText = e.data;
                if (!composedText) return;
        
                let newIndex = currentIndex;
                const newChars = [...chars];
                for (let i = 0; i < composedText.length && newIndex < chars.length; i++) {
                  const inputChar = composedText[i];
                  const isCorrect = inputChar === chars[newIndex].char;
                  newChars[newIndex].status = isCorrect ? 'correct' : 'error';
                  newIndex++;
                }
                setChars(newChars);
                setCurrentIndex(newIndex);
              }}
              onInput={(e) => {
                // 英文直接输入的情况
                if (isComposing) return;
                const value = e.currentTarget.value.trim();
                if (!value) return;
                const newChars = [...chars];
                let newIndex = currentIndex;
                for (let i = 0; i < value.length && newIndex < chars.length; i++) {
                  const inputChar = value[i];
                  const isCorrect = inputChar === chars[newIndex].char;
                  newChars[newIndex].status = isCorrect ? 'correct' : 'error';
                  newIndex++;
                }
                setChars(newChars);
                setCurrentIndex(newIndex);
                e.currentTarget.value = ''; // 清空输入框
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-text resize-none outline-none"
              autoFocus
            />
          </div>
        </div>

            {chars.map((char, index) => (
              <span
                key={index}
                className={`${getCharClass(char.status)} ${
                  index === currentIndex ? 'bg-accent/30' : ''
                } transition-colors`}
              >
                {char.char}
              </span>
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          点击文本区域开始输入 · 使用 Backspace 回退
        </div>
      </div>
    </div>
  );
};

export default TraceMode;

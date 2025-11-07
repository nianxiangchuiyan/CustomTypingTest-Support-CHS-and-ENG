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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

    if (e.key.length === 1) {
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
          <div
            ref={inputRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="text-2xl leading-relaxed whitespace-pre-wrap outline-none cursor-text select-none font-mono"
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

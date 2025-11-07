import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { getTextById, saveProgress, getProgress } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import Draggable from 'react-draggable';

const CopyMode = () => {
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [originalText, setOriginalText] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [sourceSize, setSourceSize] = useState({ width: 400, height: 300 });
  const [inputSize, setInputSize] = useState({ width: 400, height: 300 });

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

    setOriginalText(savedText.content);
    const savedProgress = getProgress(textId, 'copy');
    setUserInput(savedText.content.substring(0, savedProgress));
  }, [textId, navigate, toast]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (textId) {
        saveProgress(textId, 'copy', userInput.length);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [textId, userInput]);

  const handleReset = () => {
    setUserInput('');
    if (textId) {
      saveProgress(textId, 'copy', 0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
  };

  const progress = originalText.length > 0 
    ? (userInput.length / originalText.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background p-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回主页
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              进度: {userInput.length} / {originalText.length} ({progress.toFixed(1)}%)
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重新开始
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          拖拽移动窗口 · 拉伸边角调整大小
        </div>
      </div>

      {/* Source Text Window */}
      <Draggable handle=".drag-handle-source" bounds="parent">
        <div
          className="absolute z-20"
          style={{
            width: sourceSize.width,
            height: sourceSize.height,
            top: 120,
            left: 80,
          }}
        >
          <Card className="h-full flex flex-col shadow-xl">
            <div className="drag-handle-source cursor-move bg-primary/10 px-4 py-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium">原文</span>
              <span className="text-xs text-muted-foreground">拖拽移动</span>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div className="text-base leading-relaxed whitespace-pre-wrap font-mono">
                {originalText}
              </div>
            </div>
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-primary/20"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = sourceSize.width;
                const startHeight = sourceSize.height;

                const handleMouseMove = (e: MouseEvent) => {
                  setSourceSize({
                    width: Math.max(300, startWidth + (e.clientX - startX)),
                    height: Math.max(200, startHeight + (e.clientY - startY)),
                  });
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </Card>
        </div>
      </Draggable>

      {/* Input Window */}
      <Draggable handle=".drag-handle-input" bounds="parent">
        <div
          className="absolute z-20"
          style={{
            width: inputSize.width,
            height: inputSize.height,
            top: 120,
            right: 80,
          }}
        >
          <Card className="h-full flex flex-col shadow-xl">
            <div className="drag-handle-input cursor-move bg-secondary/50 px-4 py-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium">输入区</span>
              <span className="text-xs text-muted-foreground">拖拽移动</span>
            </div>
            <div className="flex-1 p-4">
              <Textarea
                value={userInput}
                onChange={handleInputChange}
                className="h-full resize-none font-mono text-base"
                placeholder="在此输入..."
              />
            </div>
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-secondary/50"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = inputSize.width;
                const startHeight = inputSize.height;

                const handleMouseMove = (e: MouseEvent) => {
                  setInputSize({
                    width: Math.max(300, startWidth + (e.clientX - startX)),
                    height: Math.max(200, startHeight + (e.clientY - startY)),
                  });
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </Card>
        </div>
      </Draggable>
    </div>
  );
};

export default CopyMode;

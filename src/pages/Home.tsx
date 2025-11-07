import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUploader } from '@/components/FileUploader';
import { TextLibrary } from '@/components/TextLibrary';
import { Keyboard, PenTool } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const handleSelectMode = (mode: 'trace' | 'copy') => {
    if (selectedTextId) {
      navigate(`/${mode}/${selectedTextId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">打字练习</h1>
          <p className="text-muted-foreground">提升您的打字速度和准确度</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">1. 选择或上传文本</h2>
            <FileUploader onUploadComplete={setSelectedTextId} />
            <TextLibrary onSelectText={setSelectedTextId} />
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">2. 选择练习模式</h2>
            <Card
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedTextId
                  ? 'hover:border-primary'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => selectedTextId && handleSelectMode('trace')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Keyboard className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">临摹模式</h3>
                  <p className="text-sm text-muted-foreground">
                    屏幕上显示淡色文字，跟随输入即时反馈。正确显示绿色，错误显示红色。
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedTextId
                  ? 'hover:border-primary'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => selectedTextId && handleSelectMode('copy')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <PenTool className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">抄写模式</h3>
                  <p className="text-sm text-muted-foreground">
                    原文和输入框分离显示，可自由拖拽和调整大小，灵活布局。
                  </p>
                </div>
              </div>
            </Card>

            {!selectedTextId && (
              <p className="text-sm text-center text-muted-foreground">
                请先选择或上传文本
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

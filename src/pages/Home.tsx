import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUploader } from '@/components/FileUploader';
import { TextLibrary } from '@/components/TextLibrary';
import { Keyboard, PenTool } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const Home = () => {
  const navigate = useNavigate();
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleSelectMode = (mode: 'trace' | 'copy') => {
    if (selectedTextId) {
      navigate(`/${mode}/${selectedTextId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-start">
          <div className="text-center space-y-2 flex-1">
            <h1 className="text-4xl font-bold text-primary">{t('app.title')}</h1>
            <p className="text-muted-foreground">{t('home.subtitle')}</p>
          </div>
          <LanguageSwitcher />
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('home.uploadFile')}</h2>
            <FileUploader onUploadComplete={setSelectedTextId} />
            <TextLibrary onSelectText={setSelectedTextId} />
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('upload.selectMode')}</h2>
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
                  <h3 className="text-lg font-semibold mb-2">{t('common.trace')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('trace.hint')}
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
                  <h3 className="text-lg font-semibold mb-2">{t('common.copy')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('copy.hint')}
                  </p>
                </div>
              </div>
            </Card>

            {!selectedTextId && (
              <p className="text-sm text-center text-muted-foreground">
                {t('upload.selectMode')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

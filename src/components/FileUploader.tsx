import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';
import { parseFile, PdfPageData } from '@/lib/fileParser';
import { saveText } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface FileUploaderProps {
  onUploadComplete: (textId: string) => void;
}

export const FileUploader = ({ onUploadComplete }: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsed = await parseFile(file, (page, total) => {
        console.log(`解析进度: ${page}/${total}`);
      });
      console.log('parsed 文件内容：', parsed);
    
      // 如果是 PDF，parsed 是 PdfPageData[]，把每页文本合并
      const content =
        Array.isArray(parsed) 
          ? parsed.map(p => p.text).join('\n\n') 
          : (parsed as string);
    
      const textId = saveText(file.name, content);
    
      toast({
        title: t('upload.error.notFound'),
        description: `已保存 ${file.name}`,
      });
    
      onUploadComplete(textId);
    } catch (error) {
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '文件解析失败',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="p-8 border-2 border-dashed hover:border-primary transition-colors">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-secondary rounded-full">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{t('home.upload.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('home.upload.description')}
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          {isUploading ? t('upload.parsing') : t('upload.button')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </Card>
  );
};

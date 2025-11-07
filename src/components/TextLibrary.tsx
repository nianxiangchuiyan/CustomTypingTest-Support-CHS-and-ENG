import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Clock } from 'lucide-react';
import { getSavedTexts, deleteText } from '@/lib/storage';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TextLibraryProps {
  onSelectText: (textId: string) => void;
}

export const TextLibrary = ({ onSelectText }: TextLibraryProps) => {
  const [texts, setTexts] = useState(getSavedTexts());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteText(id);
    setTexts(getSavedTexts());
    setDeleteId(null);
  };

  if (texts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">暂无已保存的文本</p>
        <p className="text-sm text-muted-foreground mt-2">上传文件开始练习</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {texts.map((text) => (
        <Card
          key={text.id}
          className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
          onClick={() => onSelectText(text.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="font-medium truncate">{text.name}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(text.timestamp, {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(text.id);
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </Card>
      ))}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该文本及其练习进度，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

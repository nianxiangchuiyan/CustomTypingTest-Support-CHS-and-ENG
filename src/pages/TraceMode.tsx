import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { getTextById, saveProgress, getProgress } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface Char {
  char: string;
  status: "untyped" | "correct" | "incorrect";
}

interface HistoryState {
  chars: Char[];
  currentIndex: number;
}

const TraceMode: React.FC<{ text: string }> = ({ text }) => {
  const [chars, setChars] = useState<Char[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // ✅ 初始化字符数组并显示 ↲ 提示
  useEffect(() => {
    const charsArr = Array.from(text).map((c) => ({
      char: c === "\n" ? "↲" : c,
      status: "untyped" as const,
    }));
    setChars(charsArr);
    setCurrentIndex(0);
    setHistory([{ chars: structuredClone(charsArr), currentIndex: 0 }]);
  }, [text]);

  // ✅ 保存历史记录
  const pushHistory = (newChars: Char[], newIndex: number) => {
    setHistory((prev) => [
      ...prev,
      { chars: structuredClone(newChars), currentIndex: newIndex },
    ]);
    setRedoStack([]); // 清空重做栈
    setChars(newChars);
    setCurrentIndex(newIndex);
  };

  // ✅ 输入法事件处理
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    handleInput(e.data); // 中文输入结束时统一处理
  };

  // ✅ 普通输入处理逻辑
  const handleInput = (input: string) => {
    if (currentIndex >= chars.length) return;
    const newChars = [...chars];
    const expected = text[currentIndex];
    const isEnter = expected === "\n";

    // 中文输入时可能一次性输入多个字符
    for (const ch of input) {
      if (currentIndex >= newChars.length) break;
      const exp = text[currentIndex];
      const correct = ch === exp || (exp === "\n" && ch === "\n");
      newChars[currentIndex].status = correct ? "correct" : "incorrect";
      setCurrentIndex((prev) => prev + 1);
    }

    pushHistory(newChars, currentIndex + input.length);
  };

  // ✅ 键盘事件处理（包含撤销/重做/回车/退格）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;

    // 撤销 Ctrl + Z
    if (e.ctrlKey && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      if (history.length > 1) {
        setHistory((prev) => {
          const newHist = [...prev];
          const last = newHist.pop()!;
          setRedoStack((r) => [...r, last]);
          const previous = newHist[newHist.length - 1];
          setChars(structuredClone(previous.chars));
          setCurrentIndex(previous.currentIndex);
          return newHist;
        });
      }
      return;
    }

    // 重做 Ctrl + Shift + Z
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (redoStack.length > 0) {
        const next = redoStack[redoStack.length - 1];
        setRedoStack((prev) => prev.slice(0, -1));
        setHistory((prev) => [
          ...prev,
          { chars: structuredClone(next.chars), currentIndex: next.currentIndex },
        ]);
        setChars(structuredClone(next.chars));
        setCurrentIndex(next.currentIndex);
      }
      return;
    }

    // 回车
    if (e.key === "Enter") {
      e.preventDefault();
      if (text[currentIndex] === "\n") {
        const newChars = [...chars];
        newChars[currentIndex].status = "correct";
        pushHistory(newChars, currentIndex + 1);
      } else {
        const newChars = [...chars];
        newChars[currentIndex].status = "incorrect";
        pushHistory(newChars, currentIndex + 1);
      }
      return;
    }

    // Backspace 回退
    if (e.key === "Backspace") {
      e.preventDefault();
      if (currentIndex > 0) {
        const newChars = [...chars];
        newChars[currentIndex - 1].status = "untyped";
        pushHistory(newChars, currentIndex - 1);
      }
    }
  };

  // ✅ 焦点控制
  const focusInput = () => textAreaRef.current?.focus();

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4">
      <div
        className="p-4 rounded-xl border w-full max-w-2xl min-h-[200px] cursor-text leading-relaxed text-lg"
        onClick={focusInput}
      >
        {chars.map((c, i) => (
          <span
            key={i}
            className={
              c.status === "correct"
                ? "text-green-600"
                : c.status === "incorrect"
                ? "text-red-600"
                : i === currentIndex
                ? "bg-yellow-200"
                : ""
            }
          >
            {c.char}
          </span>
        ))}
      </div>

      <textarea
        ref={textAreaRef}
        className="opacity-0 absolute"
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onInput={(e) => handleInput(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="text-center text-sm text-muted-foreground">
        点击上方文本开始输入 · 支持中文输入法  
        <br />
        Backspace 回退 · Ctrl+Z 撤销 · Ctrl+Shift+Z 重做  
        <br />
        ↲ 表示需要输入回车
      </div>
    </div>
  );
};

export default TraceMode;

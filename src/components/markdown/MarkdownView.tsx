import { useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { markdownComponents } from './markdownComponents';

export type ViewMode = 'edit' | 'preview' | 'read';

interface MarkdownViewProps {
  content: string;
  onChange?: (content: string) => void;
  mode: ViewMode;
}

export function MarkdownView({ content, onChange, mode }: MarkdownViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === 'edit' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [mode]);

  if (mode === 'edit') {
    return (
      <textarea
        ref={textareaRef}
        className="w-full h-full p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none bg-transparent text-text placeholder:text-text/30"
        value={content}
        onChange={e => onChange?.(e.target.value)}
        placeholder="开始编辑 Markdown..."
        spellCheck={false}
      />
    );
  }

  if (mode === 'read') {
    return (
      <div className="min-h-full py-8 px-4">
        <article className="max-w-2xl mx-auto font-serif text-lg leading-loose">
          <Markdown components={markdownComponents}>{content}</Markdown>
        </article>
      </div>
    );
  }

  return (
    <div className="p-4 text-sm text-text/90 max-w-prose">
      <Markdown components={markdownComponents}>{content}</Markdown>
    </div>
  );
}

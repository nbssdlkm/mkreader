import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Eye, Pencil, BookOpen, Save, Share2 } from 'lucide-react';
import { MarkdownView, type ViewMode } from '../components/markdown/MarkdownView';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useFileSystem } from '../hooks/useFileSystem';
import { useRecentFiles } from '../hooks/useRecentFiles';
import { Share } from '@capacitor/share';

interface EditorProps {
  fileUri: string;
  fileName: string;
  onBack: () => void;
}

export function Editor({ fileUri, fileName, onBack }: EditorProps) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [mode, setMode] = useState<ViewMode>('edit');
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { readFile, writeFile } = useFileSystem();
  const { addRecent } = useRecentFiles();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readFile(fileUri)
      .then(text => {
        if (cancelled) return;
        setContent(text);
        setOriginalContent(text);
        setReadError(null);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setReadError(`无法读取文件: ${msg}`);
        setContent('');
        setOriginalContent('');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fileUri, readFile]);

  const isDirty = content !== originalContent;

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      await writeFile(fileUri, content);
      setOriginalContent(content);
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 2000);
      addRecent({ uri: fileUri, name: fileName, lastOpened: Date.now() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(`保存失败: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [isDirty, content, fileUri, fileName, writeFile, addRecent]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: fileName,
        text: content,
        dialogTitle: '分享 Markdown',
      });
    } catch {
      // User cancelled or share not available — no action needed
    }
  }, [fileName, content]);

  const isReadMode = mode === 'read';

  if (loading) {
    return (
      <div className="app-height flex items-center justify-center bg-background">
        <Spinner size="lg" className="text-accent" />
      </div>
    );
  }

  if (readError) {
    return (
      <div className="app-height flex flex-col bg-background">
        <header className="safe-area-top shrink-0 border-b border-black/10 bg-surface/90 px-3 h-11 flex items-center dark:border-white/10">
          <Button tone="neutral" fill="plain" size="sm" className="px-2" onClick={onBack}>
            <ArrowLeft size={16} />
          </Button>
          <span className="text-sm font-medium text-text ml-2">{fileName}</span>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-error text-sm mb-2">{readError}</p>
            <Button tone="neutral" fill="outline" size="sm" onClick={onBack}>返回</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-height flex flex-col bg-background">
      {/* Header */}
      <header className={`safe-area-top shrink-0 border-b border-black/10 bg-surface/90 backdrop-blur dark:border-white/10 ${isReadMode ? 'opacity-0 hover:opacity-100 transition-opacity' : ''}`}>
        <div className="flex items-center justify-between px-3 h-11">
          <div className="flex items-center gap-2 min-w-0">
            <Button tone="neutral" fill="plain" size="sm" className="px-2" onClick={onBack}>
              <ArrowLeft size={16} />
            </Button>
            <span className="truncate text-sm font-medium text-text">{fileName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              tone="neutral"
              fill="plain"
              size="sm"
              className="px-2"
              onClick={handleShare}
              title="分享"
            >
              <Share2 size={16} />
            </Button>
            <Button
              tone="neutral"
              fill="plain"
              size="sm"
              className="px-2"
              onClick={handleSave}
              disabled={!isDirty || saving}
            >
              {saving ? <Spinner size="sm" /> : saved ? <span className="text-success text-xs">已保存</span> : <Save size={16} />}
            </Button>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center gap-1 px-3 pb-2">
          <div className="inline-flex rounded-md border border-black/10 bg-surface/60 p-0.5 dark:border-white/10">
            <button
              className={`flex min-h-[36px] items-center gap-1 rounded px-3 py-1 text-sm transition-colors ${mode === 'edit' ? 'bg-accent text-white' : 'text-text/70 hover:text-text'}`}
              onClick={() => setMode('edit')}
            >
              <Pencil size={14} /> 编辑
            </button>
            <button
              className={`flex min-h-[36px] items-center gap-1 rounded px-3 py-1 text-sm transition-colors ${mode === 'preview' ? 'bg-accent text-white' : 'text-text/70 hover:text-text'}`}
              onClick={() => setMode('preview')}
            >
              <Eye size={14} /> 预览
            </button>
            <button
              className={`flex min-h-[36px] items-center gap-1 rounded px-3 py-1 text-sm transition-colors ${mode === 'read' ? 'bg-accent text-white' : 'text-text/70 hover:text-text'}`}
              onClick={() => setMode('read')}
            >
              <BookOpen size={14} /> 阅读
            </button>
          </div>
        </div>
      </header>

      {saveError && (
        <div className="mx-3 mt-2 rounded-md bg-error/10 px-3 py-2 text-xs text-error">
          {saveError}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <MarkdownView content={content} onChange={setContent} mode={mode} />
        </div>
      </div>
    </div>
  );
}

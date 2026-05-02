import { useState, useCallback, useEffect } from 'react';
import { FolderOpen, Clock, Settings, FileText, Search, Trash2, Share2 } from 'lucide-react';
import { useFileSystem } from '../hooks/useFileSystem';
import { useRecentFiles } from '../hooks/useRecentFiles';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Share } from '@capacitor/share';

interface FileListProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onFileSelect: (uri: string, name: string) => void;
}

type TabId = 'files' | 'recent' | 'settings';

export function FileList({ isDark, onToggleTheme, onFileSelect }: FileListProps) {
  const [activeTab, setActiveTab] = useState<TabId>('files');
  const { files: recentFiles, loaded: recentLoaded, clearRecent } = useRecentFiles();
  const { listDirectory, loading: dirLoading, readFile } = useFileSystem();
  const [dirFiles, setDirFiles] = useState<{ name: string; uri: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'files') {
      listDirectory('').then(files => {
        setDirFiles(files.filter(f => !f.isDirectory).map(f => ({ name: f.name, uri: f.uri })));
      }).catch(() => {});
    }
  }, [activeTab, listDirectory]);

  const handleOpenFile = useCallback((uri: string, name: string) => {
    onFileSelect(uri, name);
  }, [onFileSelect]);

  const handleShareFile = useCallback(async (uri: string, name: string) => {
    try {
      const text = await readFile(uri);
      await Share.share({ title: name, text, dialogTitle: '分享文件' });
    } catch {
      // user cancelled or unavailable
    }
  }, [readFile]);

  const filteredDir = dirFiles.filter(f =>
    !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecent = recentFiles.filter(f =>
    !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return isToday ? `今天 ${time}` : d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + time;
  };

  const tabs = [
    { id: 'files' as TabId, icon: FolderOpen, label: '文件' },
    { id: 'recent' as TabId, icon: Clock, label: '最近' },
    { id: 'settings' as TabId, icon: Settings, label: '设置' },
  ];

  return (
    <div className="app-height flex flex-col bg-background">
      {/* Header */}
      <header className="safe-area-top shrink-0 border-b border-black/10 bg-surface/90 backdrop-blur px-4 py-3 dark:border-white/10">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-xl font-bold text-text">MkReader</h1>
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-2.5 text-text/40" size={16} />
          <Input
            className="pl-10"
            placeholder="搜索文件..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-24">
        {activeTab === 'files' && (
          <div className="p-4">
            {dirLoading ? (
              <div className="flex justify-center py-12"><Spinner size="lg" className="text-accent" /></div>
            ) : filteredDir.length === 0 ? (
              <EmptyState
                icon={<FileText size={40} />}
                title="暂无 Markdown 文件"
                description="将 .md 文件放入应用目录即可在此查看"
              />
            ) : (
              <div className="space-y-2">
                {filteredDir.map(f => (
                  <div
                    key={f.uri}
                    className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-surface/35 px-4 py-3 transition-colors hover:bg-surface/60 dark:border-white/10"
                  >
                    <button onClick={() => handleOpenFile(f.uri, f.name)} className="flex flex-1 items-center gap-3 min-w-0 text-left">
                      <FileText size={18} className="text-accent shrink-0" />
                      <span className="truncate text-sm font-medium text-text">{f.name}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShareFile(f.uri, f.name); }}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text/30 hover:text-accent transition-colors"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="p-4">
            {!recentLoaded ? (
              <div className="flex justify-center py-12"><Spinner size="lg" className="text-accent" /></div>
            ) : filteredRecent.length === 0 ? (
              <EmptyState
                icon={<Clock size={40} />}
                title="暂无最近打开的文件"
                description="打开过的 Markdown 文件会出现在这里"
              />
            ) : (
              <>
                <div className="space-y-2">
                  {filteredRecent.map(f => (
                    <div
                      key={f.uri}
                      className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-surface/35 px-4 py-3 transition-colors hover:bg-surface/60 dark:border-white/10"
                    >
                      <button onClick={() => handleOpenFile(f.uri, f.name)} className="flex flex-1 items-center gap-3 min-w-0 text-left">
                        <FileText size={18} className="text-accent shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">{f.name}</p>
                          <p className="text-xs text-text/40">{formatTime(f.lastOpened)}</p>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShareFile(f.uri, f.name); }}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text/30 hover:text-accent transition-colors"
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                {recentFiles.length > 0 && (
                  <button
                    onClick={clearRecent}
                    className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg text-sm text-text/40 hover:text-error transition-colors"
                  >
                    <Trash2 size={14} />
                    清除全部记录
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-black/10 bg-surface/35 p-4 dark:border-white/10">
              <p className="text-sm font-medium text-text mb-2">关于 MkReader</p>
              <p className="text-xs text-text/50 leading-relaxed">
                MkReader v0.1.0<br />
                基于 React + Capacitor 构建的 Android Markdown 阅读编辑应用。<br />
                支持从微信等应用直接打开 .md 文件。
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-surface/35 p-4 dark:border-white/10">
              <p className="text-sm font-medium text-text mb-2">快捷键</p>
              <ul className="text-xs text-text/50 space-y-1">
                <li>编辑模式 — 直接编辑 Markdown 源码</li>
                <li>预览模式 — 渲染查看效果</li>
                <li>阅读模式 — 沉浸式阅读体验</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-surface/95 backdrop-blur dark:border-white/10">
        <div className="grid grid-cols-3 gap-1 px-2 py-2">
          {tabs.map(({ id, icon: Icon, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-accent text-white shadow-subtle'
                    : 'text-text/50 hover:bg-black/5 hover:text-text dark:hover:bg-white/5'
                }`}
              >
                <Icon size={18} className="mb-1" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

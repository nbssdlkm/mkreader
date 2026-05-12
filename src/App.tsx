import { useState, useEffect, useCallback } from 'react';
import { FileList } from './pages/FileList';
import { Editor } from './pages/Editor';
import { useTheme } from './hooks/useTheme';
import { useRecentFiles } from './hooks/useRecentFiles';
import { setupFileReceiver, type FileOpenEvent } from './utils/fileReceiver';
import './App.css';

type Page = 'home' | 'editor';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [currentFile, setCurrentFile] = useState<{ uri: string; name: string } | null>(null);
  const { isDark, loaded: themeLoaded, toggle: toggleTheme } = useTheme();
  const { addRecent } = useRecentFiles();

  const handleFileSelect = useCallback((uri: string, name: string) => {
    setCurrentFile({ uri, name });
    setPage('editor');
    addRecent({ uri, name, lastOpened: Date.now() });
  }, [addRecent]);

  const handleBack = useCallback(() => {
    setPage('home');
  }, []);

  // visualViewport dynamic height for Android keyboard
  useEffect(() => {
    const updateHeight = () => {
      document.documentElement.style.setProperty(
        '--app-height',
        `${window.visualViewport?.height ?? window.innerHeight}px`
      );
    };
    updateHeight();
    window.visualViewport?.addEventListener('resize', updateHeight);
    window.addEventListener('resize', updateHeight);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateHeight);
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Listen for files opened via Android Intent (WeChat, file manager, etc.)
  useEffect(() => {
    return setupFileReceiver((event: FileOpenEvent) => {
      handleFileSelect(event.uri, event.name);
    });
  }, [handleFileSelect]);

  return (
    <div className={themeLoaded && isDark ? 'theme-night' : ''}>
      {!themeLoaded ? (
        <div className="app-height bg-background" />
      ) : page === 'home' ? (
        <FileList
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onFileSelect={handleFileSelect}
        />
      ) : page === 'editor' && currentFile ? (
        <Editor
          fileUri={currentFile.uri}
          fileName={currentFile.name}
          onBack={handleBack}
        />
      ) : (
        <div className="app-height bg-background" />
      )}
    </div>
  );
}

export default App;

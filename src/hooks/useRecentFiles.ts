import { useState, useCallback, useEffect, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';

export interface RecentFile {
  uri: string;
  name: string;
  lastOpened: number;
}

const RECENT_KEY = 'recent_files';
const MAX_RECENT = 20;

export function useRecentFiles() {
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const filesRef = useRef<RecentFile[]>([]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const { value } = await Preferences.get({ key: RECENT_KEY });
      if (value) {
        const parsed: RecentFile[] = JSON.parse(value);
        setFiles(parsed);
        filesRef.current = parsed;
      }
    } catch {}
    setLoaded(true);
  }, []);

  const addRecent = useCallback(async (file: RecentFile) => {
    // Update state first (optimistic UI)
    setFiles(prev => {
      const filtered = prev.filter(f => f.uri !== file.uri);
      return [{ ...file, lastOpened: Date.now() }, ...filtered].slice(0, MAX_RECENT);
    });

    // Persist from ref to avoid race conditions between rapid calls
    const current = filesRef.current;
    const filtered = current.filter(f => f.uri !== file.uri);
    const updated = [{ ...file, lastOpened: Date.now() }, ...filtered].slice(0, MAX_RECENT);
    try {
      await Preferences.set({ key: RECENT_KEY, value: JSON.stringify(updated) });
    } catch {}
  }, []);

  const clearRecent = useCallback(async () => {
    await Preferences.remove({ key: RECENT_KEY });
    setFiles([]);
    filesRef.current = [];
  }, []);

  return { files, loaded, addRecent, clearRecent };
}

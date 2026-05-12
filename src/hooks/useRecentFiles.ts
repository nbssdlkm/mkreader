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
    // Read the current persisted value FIRST to avoid race conditions
    // where loadRecent hasn't completed yet (e.g. cold start via Intent).
    let persisted: RecentFile[] = [];
    try {
      const { value } = await Preferences.get({ key: RECENT_KEY });
      if (value) persisted = JSON.parse(value);
    } catch {}

    const filtered = persisted.filter(f => f.uri !== file.uri);
    const updated = [{ ...file, lastOpened: Date.now() }, ...filtered].slice(0, MAX_RECENT);

    // Update state (may be redundant with loadRecent that follows, but ensures UI freshness)
    setFiles(updated);
    filesRef.current = updated;

    try {
      await Preferences.set({ key: RECENT_KEY, value: JSON.stringify(updated) });
    } catch {}
  }, []);

  const clearRecent = useCallback(async () => {
    await Preferences.remove({ key: RECENT_KEY });
    setFiles([]);
    filesRef.current = [];
  }, []);

  const removeRecent = useCallback(async (uri: string) => {
    // Read persisted state to avoid race conditions
    let persisted: RecentFile[] = [];
    try {
      const { value } = await Preferences.get({ key: RECENT_KEY });
      if (value) persisted = JSON.parse(value);
    } catch {}
    const updated = persisted.filter(f => f.uri !== uri);
    setFiles(updated);
    filesRef.current = updated;
    try {
      await Preferences.set({ key: RECENT_KEY, value: JSON.stringify(updated) });
    } catch {}
  }, []);

  return { files, loaded, addRecent, removeRecent, clearRecent };
}

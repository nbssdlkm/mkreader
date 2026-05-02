import { useState, useCallback } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface FileInfo {
  name: string;
  uri: string;
  isDirectory: boolean;
  size?: number;
}

const LARGE_FILE_THRESHOLD = 500 * 1024; // 500KB

/**
 * Capacitor's Android Filesystem plugin defaults to Directory.DATA for path
 * resolution when no directory is specified. Absolute paths (e.g. from
 * FileReceiverPlugin) would be double-resolved: {DATA_ROOT}/data/data/...
 *
 * Fix: prepend file:// to absolute paths so Capacitor treats them as
 * raw file system paths rather than resolving them relative to DATA.
 */
function normalizePath(path: string): string {
  if (path.startsWith('/') && !path.startsWith('file://')) {
    return `file://${path}`;
  }
  return path;
}

export function useFileSystem() {
  const [loading, setLoading] = useState(false);

  const readFile = useCallback(async (path: string): Promise<string> => {
    setLoading(true);
    try {
      const normalized = normalizePath(path);

      // Try stat first to check file size for large file awareness
      let fileSize = 0;
      try {
        const stat = await Filesystem.stat({ path: normalized });
        fileSize = stat.size;
      } catch {
        // stat may fail for some URIs, fall through
      }

      const result = await Filesystem.readFile({ path: normalized });

      if (fileSize > LARGE_FILE_THRESHOLD) {
        console.warn(`MkReader: large file loaded (${(fileSize / 1024).toFixed(1)}KB)`);
      }

      return result.data as string;
    } finally {
      setLoading(false);
    }
  }, []);

  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    await Filesystem.writeFile({ path: normalizePath(path), data: content });
  }, []);

  const listDirectory = useCallback(async (path: string): Promise<FileInfo[]> => {
    setLoading(true);
    try {
      const result = await Filesystem.readdir({
        path: path || '.',
        directory: path ? undefined : Directory.Documents,
      });
      return (result.files as Array<{ name: string; uri: string; type: string; size?: number }>)
        .filter((f) => f.name.endsWith('.md') || f.type === 'directory')
        .map((f) => ({
          name: f.name,
          uri: f.uri,
          isDirectory: f.type === 'directory',
          size: f.size,
        }));
    } finally {
      setLoading(false);
    }
  }, []);

  return { readFile, writeFile, listDirectory, loading };
}

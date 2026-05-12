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
 * Normalize a URI to a plain absolute filesystem path.
 *
 * Sources and their formats:
 *   - FileReceiverPlugin  → /data/data/com.mkreader.app/files/foo.md
 *   - createFile stat.uri → /data/data/com.mkreader.app/files/foo.md
 *   - listDirectory f.uri → file:///data/data/com.mkreader.app/files/foo.md
 *
 * Stripping the file:// prefix ensures all paths are consistent,
 * preventing duplicate recent-file entries and possible delete failures.
 */
function normalizeUri(uri: string): string {
  if (uri.startsWith('file://')) return uri.substring(7);
  return uri;
}

/** Alias kept for clarity — same normalization. */
function asPath(path: string): string {
  return normalizeUri(path);
}

export function useFileSystem() {
  const [loading, setLoading] = useState(false);

  const readFile = useCallback(async (path: string): Promise<string> => {
    setLoading(true);
    try {
      // stat first for large-file awareness
      let fileSize = 0;
      try {
        const stat = await Filesystem.stat({ path: asPath(path) });
        fileSize = stat.size;
      } catch {
        // stat may fail for some URIs
      }

      const result = await Filesystem.readFile({ path: asPath(path) });

      if (fileSize > LARGE_FILE_THRESHOLD) {
        console.warn(`MkReader: large file loaded (${(fileSize / 1024).toFixed(1)}KB)`);
      }

      return result.data as string;
    } finally {
      setLoading(false);
    }
  }, []);

  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    // Primary: use absolute path (same as readFile, verified working).
    try {
      await Filesystem.writeFile({ path: asPath(path), data: content });
      return;
    } catch {
      // Fallback: extract filename and use directory (for edge cases like
      // URIs from readdir that might differ from absolute paths).
    }
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash >= 0) {
      const fileName = path.substring(lastSlash + 1);
      await Filesystem.writeFile({ path: fileName, data: content, directory: Directory.Data });
    } else {
      await Filesystem.writeFile({ path, data: content });
    }
  }, []);

  const listDirectory = useCallback(async (): Promise<FileInfo[]> => {
    setLoading(true);
    try {
      const result = await Filesystem.readdir({
        path: '.',
        directory: Directory.Data,
      });
      return (result.files as Array<{ name: string; uri: string; type: string; size?: number }>)
        .filter((f) => f.name.endsWith('.md') || f.type === 'directory')
        .map((f) => ({
          name: f.name,
          uri: normalizeUri(f.uri),
          isDirectory: f.type === 'directory',
          size: f.size,
        }));
    } finally {
      setLoading(false);
    }
  }, []);

  const createFile = useCallback(async (name: string): Promise<string> => {
    const fileName = name.endsWith('.md') ? name : `${name}.md`;

    // Check if file already exists to prevent accidental overwrite
    try {
      await Filesystem.stat({ path: fileName, directory: Directory.Data });
      throw new Error(`文件 "${fileName}" 已存在`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('文件 "')) throw e;
      // stat failed = file doesn't exist, safe to create
    }

    await Filesystem.writeFile({
      path: fileName,
      data: '',
      directory: Directory.Data,
    });
    const stat = await Filesystem.stat({
      path: fileName,
      directory: Directory.Data,
    });
    return normalizeUri(stat.uri);
  }, []);

  const deleteFile = useCallback(async (path: string): Promise<void> => {
    await Filesystem.deleteFile({ path: asPath(path) });
  }, []);

  return { readFile, writeFile, listDirectory, createFile, deleteFile, loading };
}

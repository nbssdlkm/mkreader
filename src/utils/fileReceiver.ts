/**
 * FileReceiver Capacitor Plugin — TypeScript interface.
 *
 * Receives file open events from Android Intent (WeChat, file managers, etc.)
 * via the custom FileReceiverPlugin.java
 *
 * Two strategies for robustness:
 * 1. Live listener via addListener('fileOpen') — works when app is already running
 * 2. Cold-start polling via checkPendingFile() — for when app was launched by Intent
 *
 * Uses Capacitor's registerPlugin() API instead of window.FileReceiver to
 * avoid timing issues where window.* proxies aren't ready during cold start.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Plugin, PluginListenerHandle } from '@capacitor/core';

export interface FileOpenEvent {
  uri: string;
  name: string;
  size: number;
}

export interface FileReceiverPlugin extends Plugin {
  addListener(
    eventName: 'fileOpen',
    listenerFunc: (data: FileOpenEvent) => void,
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
  checkPendingFile(): Promise<FileOpenEvent | null>;
  shareFile(options: { path: string; name: string }): Promise<void>;
}

const FileReceiver = registerPlugin<FileReceiverPlugin>('FileReceiver');

export function setupFileReceiver(onFileOpen: (event: FileOpenEvent) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let cancelled = false;

  // Cold-start: check if a file was already opened (e.g. app launched via Intent).
  // The native plugin may have saved metadata to pending_intent.json before the
  // WebView was ready, so we poll for it here.
  FileReceiver.checkPendingFile().then(result => {
    if (!cancelled && result && result.uri) {
      onFileOpen(result);
    }
  }).catch(() => {});

  // Live: listen for future file open events (warm start scenario)
  const cleanup = FileReceiver.addListener('fileOpen', onFileOpen);

  return () => {
    cancelled = true;
    FileReceiver.removeAllListeners();
    cleanup.then(h => h.remove()).catch(() => {});
  };
}

/**
 * Share a file stored in the app's private directory via Android's FileProvider.
 * Generates a content:// URI and launches the system share sheet.
 */
export function shareMarkdownFile(path: string, name: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  return FileReceiver.shareFile({ path, name });
}

/**
 * FileReceiver Capacitor Plugin — TypeScript interface.
 *
 * Receives file open events from Android Intent (WeChat, file managers, etc.)
 * via the custom FileReceiverPlugin.java
 *
 * Two strategies for robustness:
 * 1. Live listener via addListener('fileOpen') — works when app is already running
 * 2. Cold-start polling via checkPendingFile() — for when app was launched by Intent
 */

import { Capacitor } from '@capacitor/core';

export interface FileOpenEvent {
  uri: string;
  name: string;
  size: number;
}

declare global {
  interface Window {
    FileReceiver: {
      addListener(event: 'fileOpen', callback: (data: FileOpenEvent) => void): void;
      removeAllListeners(): void;
      checkPendingFile(): Promise<FileOpenEvent | null>;
    };
  }
}

export function setupFileReceiver(onFileOpen: (event: FileOpenEvent) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  if (!window.FileReceiver) return () => {};

  // Cold-start: check if a file was already opened (e.g. app launched via Intent)
  window.FileReceiver.checkPendingFile().then(result => {
    if (result && result.uri) {
      onFileOpen(result);
    }
  }).catch(() => {});

  // Live: listen for future file open events
  window.FileReceiver.addListener('fileOpen', onFileOpen);

  return () => {
    window.FileReceiver.removeAllListeners();
  };
}

import { useState, useCallback } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('mkreader-theme') === 'dark';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      try { localStorage.setItem('mkreader-theme', next ? 'dark' : 'light'); } catch {}
      return next;
    });
  }, []);

  return { isDark, toggle };
}

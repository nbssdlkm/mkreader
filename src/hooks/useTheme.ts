import { useState, useCallback, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

const THEME_KEY = 'theme';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Preferences.get({ key: THEME_KEY })
      .then(({ value }) => {
        if (value === 'dark' || value === 'light') {
          setIsDark(value === 'dark');
        }
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      Preferences.set({ key: THEME_KEY, value: next ? 'dark' : 'light' }).catch(() => {});
      return next;
    });
  }, []);

  return { isDark, loaded, toggle };
}

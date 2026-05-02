import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text/50 hover:text-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      aria-label={isDark ? '切换浅色模式' : '切换深色模式'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors relative flex items-center justify-center h-9 w-9"
      aria-label="Toggle theme"
    >
      {theme === 'light' && <Sun className="w-4 h-4 absolute" />}
      {theme === 'dark' && <Moon className="w-4 h-4 absolute" />}
      {theme === 'system' && <Monitor className="w-4 h-4 absolute" />}
    </button>
  );
}

import { Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';

const DarkModeToggle = () => {
  const { themeMode, setThemeMode } = useSettingsStore();

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 bg-accent-green-500/10 rounded-full flex items-center justify-center border border-accent-green-500/20 hover:bg-theme-elevated transition-colors"
      title={`Zu ${themeMode === 'dark' ? 'hellem' : 'dunklem'} Modus wechseln`}
      aria-label={`Zu ${themeMode === 'dark' ? 'hellem' : 'dunklem'} Modus wechseln`}
    >
      {themeMode === 'dark' ? (
        <Sun className="w-4 h-4 text-theme-text-primary" />
      ) : (
        <Moon className="w-4 h-4 text-theme-text-primary" />
      )}
    </button>
  );
};

export default DarkModeToggle;

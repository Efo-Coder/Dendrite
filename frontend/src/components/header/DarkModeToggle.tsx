import { Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

const DarkModeToggle = () => {
  const { themeMode, setThemeMode } = useSettingsStore();

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 bg-accent-500/10 rounded-full flex items-center justify-center border border-accent-300 hover:bg-accent-200 transition-colors"
      title={`Zu ${themeMode === 'dark' ? 'hellem' : 'dunklem'} Modus wechseln`}
      aria-label={`Zu ${themeMode === 'dark' ? 'hellem' : 'dunklem'} Modus wechseln`}
    >
      {themeMode === 'dark' ? (
        <Sun className="w-4 h-4 text-theme-icon" />
      ) : (
        <Moon className="w-4 h-4 text-theme-icon" />
      )}
    </button>
  );
};

export default DarkModeToggle;

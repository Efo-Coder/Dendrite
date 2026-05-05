import { Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

interface DarkModeToggleProps {
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const DarkModeToggle = ({ onMouseEnter }: DarkModeToggleProps) => {
  const { themeMode, setThemeMode } = useSettingsStore();

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      onMouseEnter={onMouseEnter}
      className="w-8 h-8 rounded-full flex items-center justify-center hover-text-themed transition-colors relative z-10"
      title={`Zu ${themeMode === 'dark' ? 'hellem' : 'dunklem'} Modus wechseln`}
      aria-label={`Zu ${themeMode === 'dark' ? 'hellem' : 'dunklem'} Modus wechseln`}
    >
      {themeMode === 'dark' ? (
        <Sun className="w-4 h-4 text-accent-subtle transition-colors" />
      ) : (
        <Moon className="w-4 h-4 text-accent-subtle transition-colors" />
      )}
    </button>
  );
};

export default DarkModeToggle;

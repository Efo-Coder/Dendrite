import { Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

interface DarkModeToggleProps {
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

const DarkModeToggle = ({ onMouseEnter, onMouseLeave, className }: DarkModeToggleProps) => {
  const { themeMode, setThemeMode } = useSettingsStore();

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={className ?? "icon-btn-md rounded-full flex items-center justify-center transition-colors text-(--ink)"}
      title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
    >
      {themeMode === 'dark' ? (
        <Sun className="w-4 h-4 text-current transition-colors" />
      ) : (
        <Moon className="w-4 h-4 text-current transition-colors" />
      )}
    </button>
  );
};

export default DarkModeToggle;

import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { themes } from '../themes/themes';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { theme: themeId, themeMode } = useSettingsStore();

  useEffect(() => {
    // Wähle Dark-Variante wenn Dark Mode aktiv ist
    const selectedThemeId = themeMode === 'dark' ? `${themeId}Dark` : themeId;
    const theme = themes[selectedThemeId];
    if (!theme) return;

    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    root.style.colorScheme = themeMode;

    // Apply theme colors as CSS custom properties
    root.style.setProperty('--color-icon', theme.colors.iconColor);
    root.style.setProperty('--color-accent-50', theme.colors.accent50);
    root.style.setProperty('--color-accent-100', theme.colors.accent100);
    root.style.setProperty('--color-accent-200', theme.colors.accent200);
    root.style.setProperty('--color-accent-300', theme.colors.accent300);
    root.style.setProperty('--color-accent-400', theme.colors.accent400);
    root.style.setProperty('--color-accent-500', theme.colors.accent500);
    root.style.setProperty('--color-accent-600', theme.colors.accent600);
    root.style.setProperty('--color-accent-700', theme.colors.accent700);
    root.style.setProperty('--color-accent-800', theme.colors.accent800);
    root.style.setProperty('--color-accent-900', theme.colors.accent900);
  }, [themeId, themeMode]);

  return <>{children}</>;
};

export default ThemeProvider;

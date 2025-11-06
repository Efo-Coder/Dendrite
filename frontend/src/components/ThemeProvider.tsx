import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { themes } from '../themes/themes';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { theme: themeId } = useSettingsStore();

  useEffect(() => {
    const theme = themes[themeId];
    if (!theme) return;

    const root = document.documentElement;

    // Apply theme colors as CSS custom properties
    root.style.setProperty('--color-bg', theme.colors.bg);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-elevated', theme.colors.elevated);
    root.style.setProperty('--color-textarea', theme.colors.textarea);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-text-primary', theme.colors.textPrimary);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-text-muted', theme.colors.textMuted);
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
  }, [themeId]);

  return <>{children}</>;
};

export default ThemeProvider;

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
    root.style.setProperty('--color-accent-bg', theme.colors.accentBg);
    root.style.setProperty('--color-accent-surface', theme.colors.accentSurface);
    root.style.setProperty('--color-accent-elevated', theme.colors.accentElevated);
    root.style.setProperty('--color-accent-border', theme.colors.accentBorder);
    root.style.setProperty('--color-accent-muted', theme.colors.accentMuted);
    root.style.setProperty('--color-accent-brand', theme.colors.accentBrand);
    root.style.setProperty('--color-accent-brand-dim', theme.colors.accentBrandDim);
    root.style.setProperty('--color-accent-subtle', theme.colors.accentSubtle);
    root.style.setProperty('--color-accent-secondary', theme.colors.accentSecondary);
    root.style.setProperty('--color-accent-fg', theme.colors.accentFg);
  }, [themeId, themeMode]);

  return <>{children}</>;
};

export default ThemeProvider;

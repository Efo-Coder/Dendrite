import { useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { themes } from '../../themes/themes';
import { applyFont } from '../../hooks/useGoogleFonts';
import { APP_FONT_FAMILY } from '../../config';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { theme: themeId, themeMode } = useSettingsStore();

  useEffect(() => {
    applyFont(APP_FONT_FAMILY);
  }, []);

  useEffect(() => {
    // Wähle Dark-Variante wenn Dark Mode aktiv ist
    const selectedThemeId = themeMode === 'dark' ? `${themeId}Dark` : themeId;
    const theme = themes[selectedThemeId];
    if (!theme) return;

    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    root.style.colorScheme = themeMode;

    // Apply theme colors as CSS custom properties
    root.style.setProperty('--color-icon-primary', theme.colors.iconPrimary);
    root.style.setProperty('--color-icon-secondary', theme.colors.iconSecondary);
    
    root.style.setProperty('--color-bg-primary', theme.colors.bgPrimary);
    root.style.setProperty('--color-bg-primary-variant', theme.colors.bgPrimaryVariant);
    root.style.setProperty('--color-bg-primary-surface', theme.colors.bgPrimarySurface);
    root.style.setProperty('--color-bg-secondary', theme.colors.bgSecondary);
    root.style.setProperty('--color-bg-header', theme.colors.bgHeader);
    root.style.setProperty('--color-bg-input', theme.colors.bgInput);
    root.style.setProperty('--color-bg-elevated', theme.colors.bgElevated);

    root.style.setProperty('--color-border-default', theme.colors.borderDefault);

    root.style.setProperty('--color-text-primary', theme.colors.textPrimary);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-text-muted', theme.colors.textMuted);
    root.style.setProperty('--color-text-accent', theme.colors.textAccent);
    root.style.setProperty('--color-text-hyperlink', theme.colors.textHyperlink);

    root.style.setProperty('--color-brand-primary', theme.colors.brandPrimary);
    root.style.setProperty('--color-brand-500', theme.colors.brand500);
    root.style.setProperty('--color-brand-600', theme.colors.brand600);
    root.style.setProperty('--color-brand-700', theme.colors.brand700);
    root.style.setProperty('--color-brand-800', theme.colors.brand800);

  }, [themeId, themeMode]);

  return <>{children}</>;
};

export default ThemeProvider;

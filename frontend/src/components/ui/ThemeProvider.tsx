import { useLayoutEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { injectFontLink } from '../../hooks/useGoogleFonts';

const DENSITY = { compact: 0.85, regular: 1, comfy: 1.15 };

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { palette, themeMode, font, fontSize, density, cursorStyle } = useSettingsStore();

  // useLayoutEffect (not useEffect) so flushSync inside the View Transition applies the
  // theme attributes synchronously — the transition's "after" snapshot must see them.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', palette);
    root.setAttribute('data-theme', themeMode);
    root.setAttribute('data-cursor-style', cursorStyle);
    root.style.colorScheme = themeMode;

    // Typeface setting only restyles the note editor title + body, not the whole app.
    // null falls back to the CSS-default serifs; otherwise load + apply the chosen family.
    if (font) {
      injectFontLink(font);
      root.style.setProperty('--editor-display', `'${font}', serif`);
      root.style.setProperty('--editor-body', `'${font}', serif`);
    } else {
      root.style.removeProperty('--editor-display');
      root.style.removeProperty('--editor-body');
    }
    root.style.setProperty('--editor-fs', `${fontSize}px`);
    root.style.setProperty('--density', String(DENSITY[density] ?? 1));
  }, [palette, themeMode, font, fontSize, density, cursorStyle]);

  return <>{children}</>;
};

export default ThemeProvider;

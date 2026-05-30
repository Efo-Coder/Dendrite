import { useLayoutEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';

const FONTS = {
  'cormorant':   { display: "'Cormorant Garamond', serif", body: "'EB Garamond', serif" },
  'eb-garamond': { display: "'EB Garamond', serif",        body: "'EB Garamond', serif" },
  'mixed':       { display: "'Cormorant Garamond', serif", body: "'JetBrains Mono', monospace" },
};

const DENSITY = { compact: 0.85, regular: 1, comfy: 1.15 };

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { palette, themeMode, font, fontSize, dropCap, density, cursorStyle } = useSettingsStore();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', palette);
    root.setAttribute('data-theme', themeMode);
    root.setAttribute('data-cursor-style', cursorStyle);
    root.style.colorScheme = themeMode;

    const f = FONTS[font] || FONTS.cormorant;
    root.style.setProperty('--serif-display', f.display);
    root.style.setProperty('--serif-body', f.body);
    root.style.setProperty('--editor-fs', `${fontSize}px`);
    root.style.setProperty('--density', String(DENSITY[density] ?? 1));
    root.classList.toggle('drop-cap', dropCap);
  }, [palette, themeMode, font, fontSize, dropCap, density, cursorStyle]);

  return <>{children}</>;
};

export default ThemeProvider;

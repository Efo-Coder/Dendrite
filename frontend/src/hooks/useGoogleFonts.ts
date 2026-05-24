import { useState, useEffect } from 'react';

export interface GoogleFont {
  family: string;
  category: string;
}

const API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY;

const PINNED_FONTS: GoogleFont[] = [
  { family: 'Cormorant Garamond', category: 'serif' },
];

let fontCache: GoogleFont[] | null = null;
let fetchPromise: Promise<GoogleFont[]> | null = null;

function injectAllFontsLink(families: string[]): void {
  const id = 'gfont-all';
  if (document.getElementById(id)) return;
  const params = families.map((f) => `family=${f.replace(/ /g, '+')}`).join('&');
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
  document.head.appendChild(link);
}

async function fetchFonts(): Promise<GoogleFont[]> {
  if (fontCache) return fontCache;
  if (!fetchPromise) {
    fetchPromise = fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const isTextFont = (f: { family: string; category: string }) =>
          !/(icons|symbols|emoji)/i.test(f.family) && f.category !== 'display';

        const top100: GoogleFont[] = ((data.items as any[]) || [])
          .filter(isTextFont)
          .slice(0, 100)
          .map((f) => ({ family: f.family as string, category: f.category as string }));
        const pinnedFamilies = new Set(PINNED_FONTS.map((f) => f.family));
        fontCache = [
          ...PINNED_FONTS,
          ...top100.filter((f) => !pinnedFamilies.has(f.family)),
        ];
        injectAllFontsLink(fontCache.map((f) => f.family));
        return fontCache;
      });
  }
  return fetchPromise;
}

export function injectFontLink(family: string): void {
  const id = `gfont-${family.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function applyFont(family: string | null): void {
  const root = document.documentElement;
  if (family) {
    injectFontLink(family);
    root.style.setProperty('--font-user', `'${family}', sans-serif`);
    root.style.setProperty('--font-display', `'${family}', serif`);
  } else {
    root.style.removeProperty('--font-user');
    root.style.removeProperty('--font-display');
  }
}

export function useGoogleFonts() {
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFonts()
      .then(setFonts)
      .catch(() => setError('Fonts konnten nicht geladen werden'))
      .finally(() => setLoading(false));
  }, []);

  return { fonts, loading, error };
}

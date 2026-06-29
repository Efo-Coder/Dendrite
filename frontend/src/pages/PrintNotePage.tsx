import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LexicalEditorWrapper from '../components/editor/LexicalEditorWrapper';
import { injectFontLink } from '../hooks/useGoogleFonts';
import { DENSITY } from '../store/useSettingsStore';

// The PDF exporter (Puppeteer) injects the note payload before any app script runs,
// so this page makes no API calls — no auth, no CORS, no second DB read.
declare global {
  interface Window {
    __PRINT_NOTE__?: { title: string; content: string };
  }
}

// Standalone render target for the PDF exporter. Renders the note read-only with the
// exact editor CSS/fonts, then sets `data-print-ready` once webfonts settle so the
// headless browser prints a fully laid-out page. Appearance comes from query params
// (the headless browser has no settings store) — theme defaults to light.
const PrintNotePage = () => {
  const [params] = useSearchParams();
  const [note] = useState(() => window.__PRINT_NOTE__ ?? null);

  // Runs after ThemeProvider's layout effect, so these query values win over the
  // (empty) settings-store defaults the provider applied on mount.
  useEffect(() => {
    const root = document.documentElement;
    const theme = params.get('theme');
    root.setAttribute('data-print', 'true');
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    root.setAttribute('data-palette', params.get('palette') || 'onyx');
    // 'white' keeps the light theme's ink + accents but forces plain white paper.
    if (theme === 'white') root.style.setProperty('--bg', '#ffffff');

    const fontSize = params.get('fontSize');
    if (fontSize) root.style.setProperty('--editor-fs', `${fontSize}px`);

    const density = params.get('density') as keyof typeof DENSITY | null;
    if (density && DENSITY[density]) root.style.setProperty('--density', String(DENSITY[density]));

    const font = params.get('font');
    if (font) {
      injectFontLink(font);
      root.style.setProperty('--editor-display', `'${font}', serif`);
      root.style.setProperty('--editor-body', `'${font}', serif`);
    }

    return () => root.removeAttribute('data-print');
  }, [params]);

  // Flag readiness once content is mounted and webfonts are ready, so the PDF never
  // captures a fallback-font flash. Two rAFs give Lexical a frame to lay out.
  useEffect(() => {
    if (!note) {
      document.documentElement.setAttribute('data-print-ready', 'true');
      return;
    }
    document.fonts.ready.then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => document.documentElement.setAttribute('data-print-ready', 'true')),
      ),
    );
  }, [note]);

  if (!note) {
    return (
      <div data-print-error="true" style={{ padding: 40 }}>
        No note data
      </div>
    );
  }

  return (
    <div className="win print-root">
      <LexicalEditorWrapper
        content={note.content ?? ''}
        onChange={() => {}}
        disabled
        headerSlot={<h1 className="editor-title">{note.title || 'Untitled'}</h1>}
      />
    </div>
  );
};

export default PrintNotePage;

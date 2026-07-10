// Session-scoped persistence so a browser reload returns to the same view, open
// note and scroll position. Scroll is only restored for the first view after a
// reload (before any in-app navigation) — switching views in-app starts at the top.

import type { Note } from '../types';

export interface NavState {
  appView: string;
  category: string;
  stack: { kind: 'space' | 'folder'; id: string; name: string }[];
  containerReturn: string;
  profileUserId: string | null;
  openNoteId: string | null;
}

const NAV_KEY = 'dendrite:nav';
const SCROLL_KEY = 'dendrite:scroll';
const OPEN_NOTE_KEY = 'dendrite:openNote';

function readJSON<T>(key: string): T | null {
  try {
    const v = sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export const loadNav = (): NavState | null => readJSON<NavState>(NAV_KEY);
export const saveNav = (s: NavState): void => {
  try {
    sessionStorage.setItem(NAV_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota/serialization errors */
  }
};

// The full open note is cached so the editor overlay can mount with the very
// first frame after a reload (a fresh fetch then replaces it in the background)
// — without it, Home is visible underneath until that fetch lands.
export const saveOpenNote = (note: Note | null): void => {
  try {
    if (note) sessionStorage.setItem(OPEN_NOTE_KEY, JSON.stringify(note));
    else sessionStorage.removeItem(OPEN_NOTE_KEY);
  } catch {
    /* ignore quota/serialization errors */
  }
};
// Only valid while it matches the nav's open note — anything else is stale.
export const loadOpenNote = (): Note | null => {
  const note = readJSON<Note>(OPEN_NOTE_KEY);
  return note && readJSON<NavState>(NAV_KEY)?.openNoteId === note.id ? note : null;
};

// Scroll positions live in memory during the session and are flushed to
// sessionStorage right before the page unloads (cheaper than writing on every scroll).
const scrollMap: Record<string, number> = readJSON<Record<string, number>>(SCROLL_KEY) ?? {};
export const getScroll = (key: string): number => scrollMap[key] ?? 0;
export const setScroll = (key: string, y: number): void => {
  scrollMap[key] = y;
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify(scrollMap));
    } catch {
      /* ignore */
    }
  });
}

// Scroll is restored only until the first in-app navigation after a reload.
let navigated = false;
export const markNavigated = (): void => {
  navigated = true;
};
export const isInitialLoad = (): boolean => !navigated;

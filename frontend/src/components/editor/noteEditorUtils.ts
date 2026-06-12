import { useLayoutEffect, type RefObject } from 'react';
import TurndownService from 'turndown';

const CURSOR_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

// Stable per-user color so collaboration cursors stay consistent across sessions
export function userCursorColor(userId: string): string {
  let h = 0;
  for (const c of userId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CURSOR_PALETTE[h % CURSOR_PALETTE.length];
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (dateOnly.getTime() === today.getTime()) return `Today, ${timeStr}`;
  if (dateOnly.getTime() === yesterday.getTime()) return `Yesterday, ${timeStr}`;
  return `${date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${timeStr}`;
}

export function downloadFile(filename: string, data: string, mimeType: string) {
  const blob = new Blob([data], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const makeTurndown = () =>
  new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });

export type MenuPos = { x: number; y: number; anchorTop: number };

const MENU_MARGIN = 8;

// Keeps a fixed-position menu inside the viewport; flips above the anchor
// when it would overflow the bottom edge.
export function useMenuClamp(pos: MenuPos | null, ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    if (!pos || !ref.current) return;
    const menu = ref.current;
    const { width, height } = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const finalY = pos.y + height > vh - MENU_MARGIN
      ? Math.max(MENU_MARGIN, pos.anchorTop - height - 4)
      : pos.y;
    const finalX = pos.x + width > vw - MENU_MARGIN
      ? Math.max(MENU_MARGIN, vw - MENU_MARGIN - width)
      : Math.max(MENU_MARGIN, pos.x);
    menu.style.top = `${finalY}px`;
    menu.style.left = `${finalX}px`;
  }, [pos, ref]);
}

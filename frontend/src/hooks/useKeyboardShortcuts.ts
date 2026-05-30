import { useEffect } from 'react';
import { isMac } from '../lib/platform';

type Handlers = {
  onNewNote?: () => void;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onPinNote?: () => void;
  onFocusSearch?: () => void;
};

export function useKeyboardShortcuts({
  onNewNote,
  onToggleSidebar,
  onOpenSettings,
  onPinNote,
  onFocusSearch,
}: Handlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = isMac() ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      const inEditor = !!(e.target as HTMLElement).closest('[contenteditable="true"]');

      switch (e.key) {
        case 'n':
          if (!inEditor) { e.preventDefault(); onNewNote?.(); }
          break;
        case '\\':
          e.preventDefault();
          onToggleSidebar?.();
          break;
        case ',':
          e.preventDefault();
          onOpenSettings?.();
          break;
        case 'p':
          if (!inEditor) { e.preventDefault(); onPinNote?.(); }
          break;
        case 'f':
          if (!inEditor) { e.preventDefault(); onFocusSearch?.(); }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNewNote, onToggleSidebar, onOpenSettings, onPinNote, onFocusSearch]);
}

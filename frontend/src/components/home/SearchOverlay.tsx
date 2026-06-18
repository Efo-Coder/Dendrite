import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileText, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNoteStore } from '../../store/useNoteStore';
import { useFolderStore } from '../../store/useFolderStore';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { noteLabel } from '../../lib/noteText';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNote: (id: string) => void;
  onOpenSpace: (id: string) => void;
}

const SearchOverlay = ({ isOpen, onClose, onOpenNote, onOpenSpace }: SearchOverlayProps) => {
  const notes = useNoteStore((s) => s.notes);
  const folders = useFolderStore((s) => s.folders);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // Focus after the enter animation begins so the caret lands reliably.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const q = query.trim().toLowerCase();

  const noteHits = useMemo(() => {
    if (!q) return [];
    return notes
      .filter((n) => noteLabel(n).toLowerCase().includes(q) || n.content?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [q, notes]);

  const spaceHits = useMemo(() => {
    if (!q) return [];
    return folders.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 6);
  }, [q, folders]);

  const hasResults = noteHits.length > 0 || spaceHits.length > 0;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onMouseDown={onClose}
        >
          <motion.div
            className="search-panel"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="search-field">
              <Search size={18} className="search-field-icon" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search thoughts, spaces, or anything…"
                className="search-field-input"
              />
            </div>

            {q && (
              <div className="search-results">
                {!hasResults && <p className="search-empty">Nothing found for “{query}”.</p>}

                {spaceHits.length > 0 && (
                  <div className="search-group">
                    <span className="search-group-label">Spaces</span>
                    {spaceHits.map((f) => (
                      <button key={f.id} type="button" className="search-result" onClick={() => { onOpenSpace(f.id); onClose(); }}>
                        <Layers size={15} className="search-result-icon" />
                        <span className="search-result-label">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {noteHits.length > 0 && (
                  <div className="search-group">
                    <span className="search-group-label">Thoughts</span>
                    {noteHits.map((n) => (
                      <button key={n.id} type="button" className="search-result" onClick={() => { onOpenNote(n.id); onClose(); }}>
                        <FileText size={15} className="search-result-icon" />
                        <span className="search-result-label">{noteLabel(n)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    getModalPortalRoot(),
  );
};

export default SearchOverlay;

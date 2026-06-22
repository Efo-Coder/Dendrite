import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Search, FileText, Layers } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { noteLabel } from '../../lib/noteText';

interface HomeSearchProps {
  onOpenNote: (id: string) => void;
  onOpenSpace: (id: string, name: string) => void;
}

// The dashboard search bar is itself the input — results drop down inline
// beneath it (no modal).
const HomeSearch = ({ onOpenNote, onOpenSpace }: HomeSearchProps) => {
  const notes = useNoteStore((s) => s.notes);
  const spaces = useSpaceStore((s) => s.spaces);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const noteHits = useMemo(
    () => (q ? notes.filter((n) => noteLabel(n).toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)).slice(0, 6) : []),
    [q, notes],
  );
  const spaceHits = useMemo(
    () => (q ? spaces.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6) : []),
    [q, spaces],
  );
  const hasResults = noteHits.length > 0 || spaceHits.length > 0;

  // Smoothly animate the dropdown's height when it opens and when the number of
  // results changes — same FLIP technique as the image-insert modal.
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevHeight = useRef(0);

  useLayoutEffect(() => {
    const el = dropdownRef.current;
    if (!el) {
      prevHeight.current = 0; // closed — next open grows from zero
      return;
    }
    const from = prevHeight.current;
    const to = el.scrollHeight;
    prevHeight.current = to;
    if (Math.abs(to - from) < 1) return;
    el.style.transition = 'none';
    el.style.height = `${from}px`;
    void el.offsetHeight; // force the start height to apply before transitioning
    requestAnimationFrame(() => {
      el.style.transition = 'height .26s cubic-bezier(.2, .8, .2, 1)';
      el.style.height = `${to}px`;
    });
  }, [q, noteHits.length, spaceHits.length]);

  // After the height settles, release to auto so dynamic content can resize freely.
  const handleHeightEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.propertyName === 'height' && dropdownRef.current) {
      dropdownRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="home-search-wrap">
      <div className={`home-search${q ? ' open' : ''}`}>
        <Search size={18} className="home-search-icon" />
        <input
          className="home-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search thoughts, spaces, or anything…"
        />
      </div>

      {q && (
        <div ref={dropdownRef} className="home-search-dropdown" onTransitionEnd={handleHeightEnd}>
          {!hasResults && <p className="search-empty">Nothing found for “{query}”.</p>}

          {spaceHits.length > 0 && (
            <div className="search-group">
              <span className="search-group-label">Spaces</span>
              {spaceHits.map((s) => (
                <button key={s.id} type="button" className="search-result" onClick={() => onOpenSpace(s.id, s.name)}>
                  <Layers size={15} className="search-result-icon" />
                  <span className="search-result-label">{s.name}</span>
                </button>
              ))}
            </div>
          )}

          {noteHits.length > 0 && (
            <div className="search-group">
              <span className="search-group-label">Thoughts</span>
              {noteHits.map((n) => (
                <button key={n.id} type="button" className="search-result" onClick={() => onOpenNote(n.id)}>
                  <FileText size={15} className="search-result-icon" />
                  <span className="search-result-label">{noteLabel(n)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomeSearch;

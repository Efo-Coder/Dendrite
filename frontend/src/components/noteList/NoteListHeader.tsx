import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useMotionTemplate, animate } from 'motion/react';
import { Search, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';
import { useNoteStore } from '../../store/useNoteStore';
import { useMagicHover } from '../../hooks/useMagicHover';
import { useSmartPopupStyle, type PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import type { SortOption } from './noteListUtils';

export type ListTab = 'all' | 'today' | 'week' | 'month';

interface NoteListHeaderProps {
  viewLabel?: string;
  count: number;
  isTrash?: boolean;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: SortOption, sortOrder: 'asc' | 'desc') => void;
  // Called when the search box is cleared/submitted empty — parent refetches the view
  onSearchCleared?: () => void;
  listTab: ListTab;
  onListTabChange: (tab: ListTab) => void;
  focusSearchTrigger?: number;
}

const sortLabels: Partial<Record<SortOption, string>> = {
  createdAt: 'Created',
  updatedAt: 'Updated',
  title: 'Title',
  manual: 'Manual',
};

const listTabs: { id: ListTab; label: string }[] = [
  { id: 'all',   label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

// List head: title + count, search field with glow, sort menu and time-range tabs
const NoteListHeader = ({
  viewLabel, count, isTrash,
  sortBy, sortOrder, onSortChange, onSearchCleared,
  listTab, onListTabChange, focusSearchTrigger,
}: NoteListHeaderProps) => {
  const searchNotes = useNoteStore((s) => s.searchNotes);

  const [searchQuery, setSearchQuery] = useState('');
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const { onItemEnter: onTabEnter, onItemLeave: onTabLeave, Indicator: TabIndicator } = useMagicHover({ mode: 'free', borderRadius: 20, ref: tabContainerRef });

  const sortMenuInnerRef = useRef<HTMLDivElement>(null);
  const { onItemEnter: onSortEnter, onItemLeave: onSortLeave, Indicator: SortIndicator } = useMagicHover({ mode: 'free', borderRadius: 6, ref: sortMenuInnerRef });
  const [sortFieldMenuOpen, setSortFieldMenuOpen] = useState(false);
  const [sortMenuAnchor, setSortMenuAnchor] = useState<PopupAnchor | null>(null);

  const [searchHovered, setSearchHovered] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchMouseX = useMotionValue(0);
  const searchMouseY = useMotionValue(0);
  const searchGradient = useMotionTemplate`radial-gradient(120px circle at ${searchMouseX}px ${searchMouseY}px, var(--accent), transparent 80%)`;
  const searchGlowActive = searchHovered && !searchFocused;
  const searchGlowOpacity = useMotionValue(0);
  useEffect(() => {
    animate(searchGlowOpacity, searchGlowActive ? 1 : 0, { duration: searchGlowActive ? 0.25 : 0.55, ease: 'easeOut' });
  }, [searchGlowActive]);

  const listSearchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortPopupRef = useRef<HTMLDivElement | null>(null);
  const { style: sortPopupStyle } = useSmartPopupStyle(sortMenuAnchor, sortPopupRef, 0);

  useLayoutEffect(() => {
    const idx = listTabs.findIndex(t => t.id === listTab);
    const el = tabRefs.current[idx];
    if (el) setPillStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [listTab]);

  // Close sort popup on outside click
  useEffect(() => {
    if (!sortFieldMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (listSearchRef.current?.contains(target)) return;
      if (sortPopupRef.current?.contains(target)) return;
      setSortFieldMenuOpen(false);
      setSortMenuAnchor(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [sortFieldMenuOpen]);

  // Focus search input when triggered externally (e.g. keyboard shortcut)
  useEffect(() => {
    if (focusSearchTrigger) searchInputRef.current?.focus();
  }, [focusSearchTrigger]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchNotes(searchQuery);
    } else {
      onSearchCleared?.();
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) onSearchCleared?.();
  };

  const handleSortToggle = () => {
    if (sortFieldMenuOpen) {
      setSortFieldMenuOpen(false);
      setSortMenuAnchor(null);
      return;
    }
    if (listSearchRef.current) {
      const rect = listSearchRef.current.getBoundingClientRect();
      setSortMenuAnchor({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
    }
    setSortFieldMenuOpen(true);
  };

  return (
    <>
      <div className="notelist-head">
        <div className="notelist-head-row">
          <div className="notelist-title">{viewLabel || 'All Notes'}</div>
          <span className="notelist-count">{count} {count === 1 ? 'note' : 'notes'}</span>
        </div>
        <div
          style={{ position: 'relative', borderRadius: sortFieldMenuOpen ? '9px 9px 0 0' : '9px' }}
          onMouseMove={({ currentTarget, clientX, clientY }) => { const { left, top } = currentTarget.getBoundingClientRect(); searchMouseX.set(clientX - left); searchMouseY.set(clientY - top); }}
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
          onFocusCapture={() => setSearchFocused(true)}
          onBlurCapture={() => setSearchFocused(false)}
          className="p-px notelist-search-wrapper"
        >
          <motion.div
            style={{ position: 'absolute', inset: 0, background: searchGradient, borderRadius: 'inherit', pointerEvents: 'none', opacity: searchGlowOpacity }}
          />
        <div
          ref={listSearchRef}
          className="notelist-search"
          style={sortFieldMenuOpen ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : undefined}
        >
          <Search className="search-icon w-3.5 h-3.5" />
          <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 0 }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search notes…"
            />
          </form>
          {sortBy !== 'manual' && (
            <button
              type="button"
              onClick={() => onSortChange(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
              style={{ padding: '4px', flexShrink: 0 }}
              title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
            >
              {sortOrder === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={handleSortToggle}
            style={{ padding: '4px', flexShrink: 0, color: sortFieldMenuOpen ? 'var(--accent)' : undefined }}
            title="Sort"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
        </div>
        {!isTrash && (
          <div style={{ position: 'relative', marginTop: '10px' }}>
            <div ref={tabContainerRef} style={{ position: 'relative', display: 'flex', gap: '4px' }}>
              {TabIndicator}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: pillStyle.left,
                  width: pillStyle.width,
                  background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                  border: '0.5px solid color-mix(in oklch, var(--accent) 40%, transparent)',
                  borderRadius: '20px',
                  transition: 'left 0.22s cubic-bezier(0.23, 1, 0.32, 1), width 0.22s cubic-bezier(0.23, 1, 0.32, 1)',
                  pointerEvents: 'none',
                }}
              />
              {listTabs.map((t, i) => (
                <button
                  key={t.id}
                  ref={el => { tabRefs.current[i] = el; }}
                  type="button"
                  onClick={() => onListTabChange(t.id)}
                  onMouseEnter={onTabEnter}
                  onMouseLeave={onTabLeave}
                  className="notelist-tab-btn"
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '9px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase' as const,
                    padding: '3px 10px',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                    color: listTab === t.id ? 'var(--accent)' : 'var(--ink-low)',
                    transition: 'color 0.22s, background 0.15s',
                    background: 'transparent',
                    border: '0.5px solid color-mix(in oklch, var(--ink-low) 40%, transparent)',
                    borderRadius: '20px',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {sortFieldMenuOpen && sortMenuAnchor && (
            <motion.div
              key="sort-popup"
              ref={sortPopupRef}
              className="fixed overflow-hidden z-3 border border-(--line) border-t-0"
              style={{
                ...sortPopupStyle,
                background: 'transparent',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '0 0 8px 8px',
                clipPath: 'inset(0 round 0 0 8px 8px)',
                transformOrigin: 'center top',
              }}
              initial={{ opacity: 0, scaleY: 0.96, y: -4 }}
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              exit={{ opacity: 0, scaleY: 0.96, y: -4, transition: { duration: 0.1 } }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }}
            >
              <div ref={sortMenuInnerRef} className="pt-2 pb-4 relative">
                {SortIndicator}
                {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { onSortChange(value, sortOrder); setSortFieldMenuOpen(false); setSortMenuAnchor(null); }}
                    onMouseEnter={onSortEnter}
                    onMouseLeave={onSortLeave}
                    className={clsx('w-full px-3 py-2 text-left text-sm relative z-1', sortBy === value ? 'text-(--accent)' : '')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        getModalPortalRoot()
      )}
    </>
  );
};

export default NoteListHeader;

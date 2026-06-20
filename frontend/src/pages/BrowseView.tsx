import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { Note, PublishedNote } from '../types';
import { publishedService } from '../services/published.service';
import { BROWSE_TOPICS } from '../lib/browseTopics';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { PAGE_FADE } from '../lib/pageMotion';
import { usePublishedCopy } from '../components/browse/usePublishedCopy';
import { MagicInput } from '../components/ui/MagicInput';
import FilterDropdown from '../components/browse/FilterDropdown';
import PublishedNoteCard from '../components/browse/PublishedNoteCard';
import PublishedNoteReader from '../components/browse/PublishedNoteReader';

interface BrowseViewProps {
  onOpenInline: (note: Note) => void;
  onOpenProfile: (userId: string) => void;
}

const chipClass = (active: boolean) =>
  clsx(
    'inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs leading-none transition-colors',
    active ? 'border-(--accent) text-(--accent)' : 'border-(--line) text-(--ink-mid) hover:text-(--ink)',
  );

const BrowseView = ({ onOpenInline, onOpenProfile }: BrowseViewProps) => {
  const [items, setItems] = useState<PublishedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [days, setDays] = useState<number | undefined>(undefined);
  const [maxReadingTime, setMaxReadingTime] = useState<number | undefined>(undefined);
  const [readingId, setReadingId] = useState<string | null>(null);
  const { copyingId, copy } = usePublishedCopy(onOpenInline);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    publishedService
      .list({ q: debouncedQ || undefined, topic: topic || undefined, days, maxReadingTime })
      .then((res) => setItems(res.items))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setFirstLoad(false);
      });
  }, [debouncedQ, topic, days, maxReadingTime]);

  const filtering =
    debouncedQ !== '' || topic !== null || days !== undefined || maxReadingTime !== undefined;

  // Same shared PAGE_FADE + mode="wait" as the app shell, so opening a note and
  // returning to the grid fades consistently instead of snapping.
  return (
    <AnimatePresence mode="wait">
      {readingId ? (
        <motion.div key="reader" className="flex min-h-0 flex-1 flex-col" {...PAGE_FADE}>
          <PublishedNoteReader
            id={readingId}
            onBack={() => setReadingId(null)}
            onCopy={copy}
            onOpenAuthor={onOpenProfile}
            copying={copyingId !== null}
          />
        </motion.div>
      ) : (
        <motion.div key="list" className="flex min-h-0 flex-1 flex-col" {...PAGE_FADE}>
          <main ref={scrollRef} className="home-main">
            <div ref={contentRef} className="home-content">
              <header className="home-header">
                <p className="home-greeting">Browse</p>
                <h1 className="home-headline">A library of shared thinking.</h1>
              </header>

              <div className="relative mb-5 max-w-xl">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-2 -translate-y-1/2 text-(--ink-dim)"
                />
                <MagicInput
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, tags, authors…"
                  className="w-full rounded-xl border border-(--line) bg-(--surface) py-3 pl-11 pr-4 text-sm text-(--ink) placeholder:text-(--ink-dim) focus:outline-none focus:border-(--accent)"
                />
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setTopic(null)} className={chipClass(topic === null)}>
                  All
                </button>
                {BROWSE_TOPICS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic((cur) => (cur === t ? null : t))}
                    className={chipClass(topic === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mb-8 flex flex-wrap gap-2">
                <FilterDropdown
                  value={days?.toString() ?? ''}
                  onChange={(v) => setDays(v ? Number(v) : undefined)}
                  options={[
                    { value: '', label: 'Any time' },
                    { value: '7', label: 'Past week' },
                    { value: '30', label: 'Past month' },
                    { value: '365', label: 'Past year' },
                  ]}
                />
                <FilterDropdown
                  value={maxReadingTime?.toString() ?? ''}
                  onChange={(v) => setMaxReadingTime(v ? Number(v) : undefined)}
                  options={[
                    { value: '', label: 'Any length' },
                    { value: '5', label: 'Under 5 min' },
                    { value: '15', label: 'Under 15 min' },
                  ]}
                />
              </div>

              <section>
                <p className="browse-section-title">{filtering ? 'Results' : 'Recently published'}</p>
                {firstLoad ? (
                  <div className="browse-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="browse-skeleton" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <p className="home-empty">
                    {filtering ? 'Nothing matches your search.' : 'Nothing has been published yet.'}
                  </p>
                ) : (
                  // Keep results visible while refetching; a gentle dim instead of a
                  // skeleton flash on every keystroke.
                  <div className={clsx('browse-grid transition-opacity duration-200', loading && 'opacity-50')}>
                    {items.map((pub) => (
                      <PublishedNoteCard
                        key={pub.id}
                        pub={pub}
                        onOpen={() => setReadingId(pub.id)}
                        onCopy={() => copy(pub)}
                        onOpenAuthor={() => onOpenProfile(pub.owner.id)}
                        copying={copyingId === pub.id}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BrowseView;

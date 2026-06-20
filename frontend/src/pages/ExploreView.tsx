import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { Note, PublishedNote } from '../types';
import { publishedService } from '../services/published.service';
import { EXPLORE_TOPICS } from '../lib/exploreTopics';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useColumnCount } from '../hooks/useColumnCount';
import { PAGE_FADE } from '../lib/pageMotion';
import { usePublishedCopy } from '../components/explore/usePublishedCopy';
import { MagicInput } from '../components/ui/MagicInput';
import FilterDropdown from '../components/explore/FilterDropdown';
import PublishedNoteCard from '../components/explore/PublishedNoteCard';
import PublishedNoteReader from '../components/explore/PublishedNoteReader';
import ExploreSection from '../components/explore/ExploreSection';

interface ExploreViewProps {
  onOpenInline: (note: Note) => void;
  onOpenProfile: (userId: string, fromReaderId?: string) => void;
  initialReadingId?: string | null;
}

const chipClass = (active: boolean) =>
  clsx(
    'inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs leading-none transition-colors',
    active ? 'border-(--accent) text-(--accent)' : 'border-(--line) text-(--ink-mid) hover:text-(--ink)',
  );

const ExploreView = ({ onOpenInline, onOpenProfile, initialReadingId = null }: ExploreViewProps) => {
  const [items, setItems] = useState<PublishedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [days, setDays] = useState<number | undefined>(undefined);
  const [maxReadingTime, setMaxReadingTime] = useState<number | undefined>(undefined);
  // Restores the reader when returning from a profile opened out of it.
  const [readingId, setReadingId] = useState<string | null>(initialReadingId);
  // A like toggled in the reader, broadcast to the feed sections to keep cards in sync.
  const [likeUpdate, setLikeUpdate] = useState<{ id: string; liked: boolean; likeCount: number } | null>(null);
  const { copyingId, copy } = usePublishedCopy(onOpenInline);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef);
  const [gridRef, cols] = useColumnCount(280, 20);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtering =
    debouncedQ !== '' || topic !== null || days !== undefined || maxReadingTime !== undefined;

  // Flat results exist only for search/filter; the default view is the feed sections.
  useEffect(() => {
    if (!filtering) return;
    setLoading(true);
    publishedService
      .list({ q: debouncedQ || undefined, topic: topic || undefined, days, maxReadingTime })
      .then((res) => setItems(res.items))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setFirstLoad(false);
      });
  }, [filtering, debouncedQ, topic, days, maxReadingTime]);

  // A like toggled in the reader: update the flat list and broadcast to the feed
  // sections so every card showing this note stays in sync (no reload).
  const handleLikeChange = (likedId: string, liked: boolean, likeCount: number) => {
    setLikeUpdate({ id: likedId, liked, likeCount });
    setItems((prev) => prev.map((p) => (p.id === likedId ? { ...p, isLiked: liked, likeCount } : p)));
  };

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
            onOpenAuthor={(uid) => onOpenProfile(uid, readingId ?? undefined)}
            onLikeChange={handleLikeChange}
            copying={copyingId !== null}
          />
        </motion.div>
      ) : (
        <motion.div key="list" className="flex min-h-0 flex-1 flex-col" {...PAGE_FADE}>
          <main ref={scrollRef} className="home-main">
            <div ref={contentRef} className="home-content">
              <header className="home-header">
                <p className="home-greeting">Explore</p>
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
                {EXPLORE_TOPICS.map((t) => (
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

              {filtering ? (
                <section ref={gridRef}>
                  <p className="explore-section-title">Results</p>
                  {firstLoad ? (
                    <div className="explore-grid">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="explore-skeleton" />
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <p className="home-empty">Nothing matches your search.</p>
                  ) : (
                    // Keep results visible while refetching; a gentle dim instead of a
                    // skeleton flash on every keystroke.
                    <div className={clsx('explore-grid transition-opacity duration-200', loading && 'opacity-50')}>
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
                      {Array.from({ length: (cols - (items.length % cols)) % cols }, (_, i) => (
                        <div key={`ph-${i}`} className="home-card-ph" aria-hidden />
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                <>
                  <ExploreSection
                    title="Featured"
                    feed="featured"
                    large
                    limit={3}
                    copyingId={copyingId}
                    likeUpdate={likeUpdate}
                    onOpen={setReadingId}
                    onCopy={copy}
                    onOpenProfile={onOpenProfile}
                  />
                  <ExploreSection
                    title="Trending"
                    feed="trending"
                    limit={8}
                    copyingId={copyingId}
                    likeUpdate={likeUpdate}
                    onOpen={setReadingId}
                    onCopy={copy}
                    onOpenProfile={onOpenProfile}
                  />
                  <ExploreSection
                    title="From people you follow"
                    feed="following"
                    limit={8}
                    copyingId={copyingId}
                    likeUpdate={likeUpdate}
                    onOpen={setReadingId}
                    onCopy={copy}
                    onOpenProfile={onOpenProfile}
                  />
                  <ExploreSection
                    title="Recently published"
                    feed="recent"
                    limit={12}
                    emptyText="Nothing has been published yet."
                    copyingId={copyingId}
                    likeUpdate={likeUpdate}
                    onOpen={setReadingId}
                    onCopy={copy}
                    onOpenProfile={onOpenProfile}
                  />
                </>
              )}
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExploreView;

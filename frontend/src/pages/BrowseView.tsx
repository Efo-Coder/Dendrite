import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Note, PublishedNote } from '../types';
import { publishedService } from '../services/published.service';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { PAGE_FADE } from '../lib/pageMotion';
import { usePublishedCopy } from '../components/browse/usePublishedCopy';
import PublishedNoteCard from '../components/browse/PublishedNoteCard';
import PublishedNoteReader from '../components/browse/PublishedNoteReader';

interface BrowseViewProps {
  onOpenInline: (note: Note) => void;
  onOpenProfile: (userId: string) => void;
}

const BrowseView = ({ onOpenInline, onOpenProfile }: BrowseViewProps) => {
  const [items, setItems] = useState<PublishedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingId, setReadingId] = useState<string | null>(null);
  const { copyingId, copy } = usePublishedCopy(onOpenInline);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef);

  useEffect(() => {
    setLoading(true);
    publishedService
      .list()
      .then((res) => setItems(res.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

              <section>
                <p className="browse-section-title">Recently published</p>
                {loading ? (
                  <div className="browse-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="browse-skeleton" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <p className="home-empty">Nothing has been published yet.</p>
                ) : (
                  <div className="browse-grid">
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

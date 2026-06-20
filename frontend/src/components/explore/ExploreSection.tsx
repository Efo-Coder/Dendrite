import { useEffect, useState } from 'react';
import { PublishedNote } from '../../types';
import { publishedService } from '../../services/published.service';
import { useColumnCount } from '../../hooks/useColumnCount';
import PublishedNoteCard from './PublishedNoteCard';

export type ExploreFeed = 'featured' | 'trending' | 'following' | 'recent';

interface Props {
  title: string;
  feed: ExploreFeed;
  limit?: number;
  large?: boolean; // featured: fewer, wider cards
  emptyText?: string; // shown when empty; sections without it hide when empty
  copyingId: string | null;
  // A like toggled elsewhere (the reader), broadcast so this section's cards stay in sync.
  likeUpdate: { id: string; liked: boolean; likeCount: number } | null;
  onOpen: (id: string) => void;
  onCopy: (pub: PublishedNote) => void;
  onOpenProfile: (userId: string) => void;
}

const ExploreSection = ({
  title,
  feed,
  limit = 8,
  large,
  emptyText,
  copyingId,
  likeUpdate,
  onOpen,
  onCopy,
  onOpenProfile,
}: Props) => {
  const [items, setItems] = useState<PublishedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridRef, cols] = useColumnCount(large ? 420 : 280, 20);

  useEffect(() => {
    setLoading(true);
    publishedService
      .list({ feed: feed === 'recent' ? undefined : feed, limit })
      .then((res) => setItems(res.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [feed, limit]);

  useEffect(() => {
    if (!likeUpdate) return;
    setItems((prev) =>
      prev.map((p) =>
        p.id === likeUpdate.id ? { ...p, isLiked: likeUpdate.liked, likeCount: likeUpdate.likeCount } : p,
      ),
    );
  }, [likeUpdate]);

  const gridClass = large ? 'explore-grid explore-grid-lg' : 'explore-grid';

  if (loading) {
    return (
      <section className="mb-10">
        <p className="explore-section-title">{title}</p>
        <div className={gridClass}>
          {Array.from({ length: large ? 2 : 4 }).map((_, i) => (
            <div key={i} className="explore-skeleton" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    if (!emptyText) return null;
    return (
      <section className="mb-10">
        <p className="explore-section-title">{title}</p>
        <p className="home-empty">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <p className="explore-section-title">{title}</p>
      <div ref={gridRef} className={gridClass}>
        {items.map((pub) => (
          <PublishedNoteCard
            key={pub.id}
            pub={pub}
            onOpen={() => onOpen(pub.id)}
            onCopy={() => onCopy(pub)}
            onOpenAuthor={() => onOpenProfile(pub.owner.id)}
            copying={copyingId === pub.id}
          />
        ))}
        {Array.from({ length: (cols - (items.length % cols)) % cols }, (_, i) => (
          <div key={`ph-${i}`} className="home-card-ph" aria-hidden />
        ))}
      </div>
    </section>
  );
};

export default ExploreSection;

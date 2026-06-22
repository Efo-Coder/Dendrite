import { Copy, Clock, Loader2, Eye, Heart } from 'lucide-react';
import { PublishedNote } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || '';
// Bundled presets live under /img on the frontend origin; only backend uploads get the API prefix.
const resolveAsset = (url: string) =>
  url.startsWith('http') || url.startsWith('/img/') ? url : `${API_URL}${url}`;

interface Props {
  pub: PublishedNote;
  onOpen: () => void;
  onCopy: () => void;
  onOpenAuthor: () => void;
  copying?: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const PublishedNoteCard = ({ pub, onOpen, onCopy, onOpenAuthor, copying }: Props) => {
  const authorName = pub.owner.name || 'Someone';

  return (
    <article
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-(--line) bg-(--surface) transition-colors hover:border-(--accent)"
    >
      {pub.coverImage && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={resolveAsset(pub.coverImage)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg leading-snug text-(--ink)" style={{ fontFamily: 'var(--serif-display)' }}>
          {pub.title || 'Untitled'}
        </h3>

        {pub.description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-(--ink-mid)">{pub.description}</p>
        ) : (
          <p className="text-sm italic text-(--ink-dim)">No description</p>
        )}

        {pub.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pub.tags.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full border border-(--line) px-2 py-0.5 text-xs text-(--ink-dim)">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs text-(--ink-dim)">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAuthor();
            }}
            className="flex items-center gap-1.5 text-(--ink-mid) transition-colors hover:text-(--accent)"
          >
            {pub.owner.avatarUrl ? (
              <img src={resolveAsset(pub.owner.avatarUrl)} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="avatar-fill" style={{ width: 20, height: 20, fontSize: 10 }}>
                {authorName.charAt(0).toUpperCase()}
              </span>
            )}
            {authorName}
          </button>
          <span>·</span>
          <span>{formatDate(pub.publishedAt)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {pub.readingTime} min
          </span>
          <span>·</span>
          <span className="flex items-center gap-2.5">
            <span className="flex items-center gap-1">
              <Eye size={12} /> {pub.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={12} /> {pub.likeCount}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          disabled={copying}
          className="btn-ghost mt-1 w-full gap-1.5 rounded-lg px-4 py-2.5 disabled:opacity-50"
        >
          {copying ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
          Copy to workspace
        </button>
      </div>
    </article>
  );
};

export default PublishedNoteCard;

import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Loader2, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { PublishedNote } from '../../types';
import { publishedService } from '../../services/published.service';
import LexicalEditorWrapper from '../editor/LexicalEditorWrapper';
import { useToast } from '../ui/ToastContainer';

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveAsset = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

interface Props {
  id: string;
  onBack: () => void;
  onCopy: (pub: PublishedNote) => void;
  onOpenAuthor: (userId: string) => void;
  onLikeChange?: (id: string, liked: boolean, likeCount: number) => void;
  copying?: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// Read-only twin of the inline editor: same writing canvas (LexicalEditorWrapper
// disabled, no collaboration/toolbar/panels), only a Back action in the topbar and
// Copy in the footer. Lexical's HTML import drops scripts, so no extra sanitizing.
const PublishedNoteReader = ({ id, onBack, onCopy, onOpenAuthor, onLikeChange, copying }: Props) => {
  const [pub, setPub] = useState<PublishedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [likeBusy, setLikeBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    publishedService
      .getById(id)
      .then(setPub)
      .catch(() => toast.error('Could not load this note'))
      .finally(() => setLoading(false));
  }, [id]);

  // Optimistic like toggle, reconciled with the server's authoritative count.
  const toggleLike = async () => {
    if (!pub || likeBusy) return;
    const next = !pub.isLiked;
    const originalLiked = pub.isLiked ?? false;
    const originalCount = pub.likeCount;
    const optimisticCount = originalCount + (next ? 1 : -1);
    setLikeBusy(true);
    setPub((p) => (p ? { ...p, isLiked: next, likeCount: optimisticCount } : p));
    onLikeChange?.(id, next, optimisticCount);
    try {
      const res = next ? await publishedService.like(id) : await publishedService.unlike(id);
      setPub((p) => (p ? { ...p, isLiked: res.liked, likeCount: res.likeCount } : p));
      onLikeChange?.(id, res.liked, res.likeCount);
    } catch {
      setPub((p) => (p ? { ...p, isLiked: originalLiked, likeCount: originalCount } : p));
      onLikeChange?.(id, originalLiked, originalCount);
      toast.error('Could not update like');
    } finally {
      setLikeBusy(false);
    }
  };

  const header = pub && (
    <>
      <div className="editor-meta">
        <button
          type="button"
          onClick={() => onOpenAuthor(pub.owner.id)}
          className="flex items-center gap-1.5 transition-colors hover:text-(--accent)"
        >
          {pub.owner.avatarUrl ? (
            <img src={resolveAsset(pub.owner.avatarUrl)} alt="" className="h-5.5 w-5.5 rounded-full object-cover" />
          ) : (
            <span className="avatar-fill" style={{ width: 22, height: 22, fontSize: 11 }}>
              {(pub.owner.name || 'S').charAt(0).toUpperCase()}
            </span>
          )}
          {pub.owner.name || 'Someone'}
        </button>
        <span className="editor-sep">·</span>
        <span>{formatDate(pub.publishedAt)}</span>
        <span className="editor-sep">·</span>
        <span>{pub.readingTime} min read</span>
        <span className="editor-sep">·</span>
        <span>{pub.viewCount} views</span>
      </div>
      <h1 className="editor-title">{pub.title || 'Untitled'}</h1>
      {pub.description && (
        <p className="mb-5 text-lg italic leading-snug text-(--ink-mid)" style={{ fontFamily: 'var(--serif-display)' }}>
          {pub.description}
        </p>
      )}
      {pub.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {pub.tags.map((t) => (
            <span key={t} className="rounded-full border border-(--line) px-2.5 py-0.5 text-xs text-(--ink-dim)">
              {t}
            </span>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="win">
      <div className="editor-panel">
        <div className="relative flex h-full flex-col bg-transparent">
          <div className="editor-topbar relative flex h-14 shrink-0 items-center justify-end gap-1 px-6">
            {pub && (
              <>
                <button
                  type="button"
                  onClick={toggleLike}
                  disabled={likeBusy}
                  title={pub.isLiked ? 'Unlike' : 'Like'}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-(--surface-hi) disabled:opacity-50',
                    pub.isLiked ? 'text-(--accent)' : 'text-(--ink-low) hover:text-(--ink)',
                  )}
                >
                  <motion.span
                    key={pub.isLiked ? 'liked' : 'unliked'}
                    className="inline-flex"
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 16 }}
                  >
                    <Heart size={15} fill={pub.isLiked ? 'currentColor' : 'none'} />
                  </motion.span>
                  {pub.likeCount}
                </button>
                <button
                  type="button"
                  onClick={() => onCopy(pub)}
                  disabled={copying}
                  title="Copy to workspace"
                  className="icon-btn-md disabled:opacity-50"
                >
                  {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                </button>
              </>
            )}
            <button type="button" onClick={onBack} title="Back to Explore" className="icon-btn-md">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          {loading || !pub ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-(--ink-dim)" />
            </div>
          ) : (
            <div className="min-h-0 min-w-0 flex-1">
              <LexicalEditorWrapper
                key={pub.id}
                content={pub.content ?? ''}
                onChange={() => {}}
                disabled
                headerSlot={header}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublishedNoteReader;

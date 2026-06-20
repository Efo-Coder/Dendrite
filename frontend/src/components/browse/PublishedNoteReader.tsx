import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Loader2 } from 'lucide-react';
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
  copying?: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// Read-only twin of the inline editor: same writing canvas (LexicalEditorWrapper
// disabled, no collaboration/toolbar/panels), only a Back action in the topbar and
// Copy in the footer. Lexical's HTML import drops scripts, so no extra sanitizing.
const PublishedNoteReader = ({ id, onBack, onCopy, onOpenAuthor, copying }: Props) => {
  const [pub, setPub] = useState<PublishedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    publishedService
      .getById(id)
      .then(setPub)
      .catch(() => toast.error('Could not load this note'))
      .finally(() => setLoading(false));
  }, [id]);

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
          <div className="editor-topbar relative flex h-14 shrink-0 items-center justify-end px-6">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-(--ink-mid) transition-colors hover:text-(--ink)"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Browse
            </button>
          </div>

          {loading || !pub ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-(--ink-dim)" />
            </div>
          ) : (
            <>
              <div className="min-h-0 min-w-0 flex-1">
                <LexicalEditorWrapper
                  key={pub.id}
                  content={pub.content ?? ''}
                  onChange={() => {}}
                  disabled
                  headerSlot={header}
                />
              </div>
              <div className="flex shrink-0 justify-center border-t border-(--line) py-4">
                <button
                  type="button"
                  onClick={() => onCopy(pub)}
                  disabled={copying}
                  className="btn primary browse-copy-btn"
                >
                  {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  Copy to workspace
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublishedNoteReader;

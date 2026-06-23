import { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { useRename } from './RenameContext';

const API_URL = import.meta.env.VITE_API_URL || '';
// Bundled presets live under /img on the frontend origin; only backend uploads get the API prefix.
const resolveUrl = (url: string) =>
  url.startsWith('http') || url.startsWith('/img/') ? url : `${API_URL}${url}`;

// Deterministic warm gradient when a card has no cover image yet.
function fallbackCover(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = 60 + (h % 40);
  const b = 30 + ((h >> 6) % 30);
  return `linear-gradient(140deg, oklch(0.82 0.06 ${a}), oklch(0.55 0.08 ${b}))`;
}

interface CoverCardProps {
  title: string;
  subtitle?: string;
  // Urgency tone for the subtitle (e.g. trash countdown): adds a colour class.
  subtitleTone?: 'warn' | 'danger';
  cover?: string | null;
  seed: string;
  compact?: boolean;
  // List layout: a row with a small cover thumbnail and the text beside it (full views).
  list?: boolean;
  onClick: () => void;
  onSetCover?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  // Position in its grid — drives the staggered entrance (--enter-i).
  index?: number;
  // Set while the card is being removed — plays the exit animation.
  leaving?: boolean;
  // Drag-to-reorder wiring (optional — only set on draggable sections).
  flipId?: string;
  dragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

const CoverCard = ({ title, subtitle, subtitleTone, cover, seed, compact, list, index, leaving, onClick, onSetCover, onContextMenu, flipId, dragging, onPointerDown }: CoverCardProps) => {
  const rename = useRename();
  const editing = flipId != null && rename.editingId === flipId;
  // cardEnter is a mount-only entrance. Reordering detaches/reattaches the card's DOM node,
  // which Chromium treats as a re-insert and restarts the CSS animation. Once a card is
  // dragged its entrance is over, so latch it as `entered` to drop the animation — keeping
  // cardEnter to open/create only. The latch survives the drag end (no replay on release).
  const enteredRef = useRef(false);
  if (dragging) enteredRef.current = true;
  const entered = enteredRef.current;
  const style = cover
    ? { backgroundImage: `url(${resolveUrl(cover)})` }
    : { backgroundImage: fallbackCover(seed) };
  // Shared between the cover and list layouts so neither branch duplicates the wiring.
  const coverBtn = onSetCover && (
    <button
      type="button"
      className="home-card-cover-btn"
      title="Change cover"
      onClick={(e) => { e.stopPropagation(); onSetCover(); }}
    >
      <ImagePlus size={15} />
    </button>
  );
  const textBlock = (
    <span className="home-card-text">
      {editing ? (
        <input
          className="home-card-title-input"
          defaultValue={title}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); rename.commit(e.currentTarget.value); }
            else if (e.key === 'Escape') { e.preventDefault(); rename.cancel(); }
          }}
          onBlur={(e) => rename.commit(e.currentTarget.value)}
        />
      ) : (
        <span className="home-card-title">{title}</span>
      )}
      {subtitle && <span className={`home-card-sub${subtitleTone ? ` ${subtitleTone}` : ''}`}>{subtitle}</span>}
    </span>
  );
  // Not a <button> so the cover-edit button can nest inside (no nested buttons).
  return (
    <div
      className={`home-card${compact ? ' compact' : ''}${list ? ' list' : ''}${dragging ? ' dragging' : ''}${leaving ? ' leaving' : ''}${entered ? ' entered' : ''}`}
      style={{ ['--enter-i']: index ?? 0 } as React.CSSProperties}
      role="button"
      tabIndex={0}
      data-flip-id={flipId}
      // Once the entrance has finished, latch it off so a later reorder re-insert can't replay it.
      onAnimationEnd={(e) => { if (e.animationName === 'cardEnter') enteredRef.current = true; }}
      // While renaming the title input owns all interaction — no open, no drag.
      onPointerDown={editing ? undefined : onPointerDown}
      onClick={editing ? undefined : onClick}
      onContextMenu={onContextMenu}
      onKeyDown={editing ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {list ? (
        <>
          <span className="home-card-thumb" style={style} />
          {textBlock}
          {coverBtn}
        </>
      ) : (
        <>
          <span className="home-card-cover" style={style} />
          <span className="home-card-scrim" />
          {coverBtn}
          {textBlock}
        </>
      )}
    </div>
  );
};

export default CoverCard;

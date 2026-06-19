import { ImagePlus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveUrl = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

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
  cover?: string | null;
  seed: string;
  compact?: boolean;
  onClick: () => void;
  onSetCover?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  // Drag-to-reorder wiring (optional — only set on draggable sections).
  flipId?: string;
  dragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

const CoverCard = ({ title, subtitle, cover, seed, compact, onClick, onSetCover, onContextMenu, flipId, dragging, onPointerDown }: CoverCardProps) => {
  const style = cover
    ? { backgroundImage: `url(${resolveUrl(cover)})` }
    : { backgroundImage: fallbackCover(seed) };
  // Not a <button> so the cover-edit button can nest inside (no nested buttons).
  return (
    <div
      className={`${compact ? 'home-card compact' : 'home-card'}${dragging ? ' dragging' : ''}`}
      role="button"
      tabIndex={0}
      data-flip-id={flipId}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="home-card-cover" style={style} />
      <span className="home-card-scrim" />
      {onSetCover && (
        <button
          type="button"
          className="home-card-cover-btn"
          title="Change cover"
          onClick={(e) => { e.stopPropagation(); onSetCover(); }}
        >
          <ImagePlus size={15} />
        </button>
      )}
      <span className="home-card-text">
        <span className="home-card-title">{title}</span>
        {subtitle && <span className="home-card-sub">{subtitle}</span>}
      </span>
    </div>
  );
};

export default CoverCard;

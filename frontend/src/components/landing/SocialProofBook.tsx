import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Spread {
  left: ReactNode;
  right: ReactNode;
}

interface TurnState {
  dir: 'fwd' | 'back';
  drag: boolean;
}

interface SocialProofBookProps {
  spreads: Spread[];
  heads: { left: ReactNode; right: ReactNode };
  firstPageNo: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Keep in sync with pagePadding in SocialProofSection's mobile stack
const PAGE_PADDING = 'clamp(72px, 9vw, 140px) clamp(24px, 6vw, 96px)';
// Books carry wider inner margins; also clears the ribbon at the spine
const INNER_PADDING = 'clamp(40px, 7vw, 120px)';
const TURN_MS = 1100;
const TURN_EASE = 'cubic-bezier(0.4, 0.08, 0.2, 1)';
const CORNER_PX = 88;

const pageNumberStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--mono)',
  fontSize: '9px',
  letterSpacing: '0.18em',
  color: 'var(--ink-dim)',
};

const controlStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  border: 0,
  background: 'transparent',
  fontFamily: 'var(--mono)',
  fontSize: '10px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--ink-dim)',
  cursor: 'pointer',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Paper for the turning leaf's two sides, with soft shading on the bound edge
const faceStyle = (face: 'front' | 'back'): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
  transform: face === 'back' ? 'rotateY(180deg)' : undefined,
  background: `linear-gradient(${face === 'front' ? 90 : 270}deg, color-mix(in oklch, var(--bg-deep) 22%, transparent), transparent 14%), var(--surface)`,
});

function Page({
  side,
  head,
  pageNo,
  control,
  children,
}: {
  side: 'left' | 'right';
  head: ReactNode;
  pageNo: number;
  control?: ReactNode;
  children: ReactNode;
}) {
  const number = <p style={pageNumberStyle}>{pageNo}</p>;
  const innerPad =
    side === 'right' ? { paddingLeft: INNER_PADDING } : { paddingRight: INNER_PADDING };
  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: 'clamp(520px, 42vw, 660px)',
        padding: PAGE_PADDING,
        ...innerPad,
      }}
    >
      <div style={{ textAlign: side === 'right' ? 'right' : 'left' }}>{head}</div>
      <div style={{ marginTop: 'clamp(36px, 5vw, 64px)' }}>{children}</div>
      <div
        className="flex items-baseline justify-between"
        style={{ marginTop: 'auto', paddingTop: 'clamp(40px, 6vw, 72px)', gap: '16px' }}
      >
        {side === 'left' ? number : (control ?? <span />)}
        {side === 'left' ? (control ?? <span />) : number}
      </div>
    </div>
  );
}

// ─── Book with turnable pages ────────────────────────────────────────────────

/** Desktop-only open book. Pages turn as a real 3D leaf around the spine —
 *  via the text controls, a click on the curled corner, or by dragging the
 *  corner across the spine. Reduced motion swaps spreads instantly. */
export function SocialProofBook({ spreads, heads, firstPageNo }: SocialProofBookProps) {
  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<TurnState | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const dragRef = useRef<{ dir: 'fwd' | 'back'; left: number; width: number } | null>(null);
  const angleRef = useRef(0);

  const canFwd = spread < spreads.length - 1;
  const canBack = spread > 0;

  // Click-triggered turns start here, once the leaf exists in the DOM
  useEffect(() => {
    if (!turn || turn.drag) return;
    const leaf = leafRef.current;
    if (!leaf) return;
    const [from, to] = turn.dir === 'fwd' ? [0, -180] : [-180, 0];
    const anim = leaf.animate(
      [{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }],
      { duration: TURN_MS, easing: TURN_EASE, fill: 'forwards' }
    );
    animRef.current = anim;
    anim.finished
      .then(() => {
        setSpread(s => s + (turn.dir === 'fwd' ? 1 : -1));
        setTurn(null);
      })
      .catch(() => {}); // canceled on unmount
    return () => anim.cancel();
  }, [turn]);

  useEffect(() => () => animRef.current?.cancel(), []);

  const startTurn = (dir: 'fwd' | 'back') => {
    if (turn || (dir === 'fwd' ? !canFwd : !canBack)) return;
    if (reducedMotion()) {
      setSpread(s => s + (dir === 'fwd' ? 1 : -1));
      return;
    }
    setTurn({ dir, drag: false });
  };

  const onCornerDown = (dir: 'fwd' | 'back') => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (turn || (dir === 'fwd' ? !canFwd : !canBack)) return;
    if (reducedMotion()) {
      setSpread(s => s + (dir === 'fwd' ? 1 : -1));
      return;
    }
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { dir, left: rect.left, width: rect.width };
    angleRef.current = dir === 'fwd' ? 0 : -180;
    e.currentTarget.setPointerCapture(e.pointerId);
    setTurn({ dir, drag: true });
  };

  const onCornerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const leaf = leafRef.current;
    if (!drag || !leaf) return;
    // 0 at the right edge → 1 at the left edge; the leaf follows the cursor linearly
    const lift = Math.min(1, Math.max(0, (drag.left + drag.width - e.clientX) / drag.width));
    angleRef.current = -180 * lift;
    // Direct style write keeps the drag off the React render path
    leaf.style.transform = `rotateY(${angleRef.current}deg)`;
  };

  const onCornerUp = () => {
    const drag = dragRef.current;
    const leaf = leafRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!leaf) {
      setTurn(null);
      return;
    }
    const angle = angleRef.current;
    // A tap on the corner turns the whole page; a real drag commits once the
    // leaf passed the spine and settles back otherwise
    const clickLike = Math.abs(angle - (drag.dir === 'fwd' ? 0 : -180)) < 9;
    const commits = clickLike || (drag.dir === 'fwd' ? angle <= -90 : angle > -90);
    const to = drag.dir === 'fwd' ? (commits ? -180 : 0) : (commits ? 0 : -180);
    const anim = leaf.animate(
      [{ transform: `rotateY(${angle}deg)` }, { transform: `rotateY(${to}deg)` }],
      {
        duration: clickLike
          ? TURN_MS
          : Math.max(200, ((TURN_MS / 2) * Math.abs(to - angle)) / 180),
        easing: clickLike ? TURN_EASE : 'ease-out',
        fill: 'forwards',
      }
    );
    animRef.current = anim;
    anim.finished
      .then(() => {
        if (commits) setSpread(s => s + (drag.dir === 'fwd' ? 1 : -1));
        setTurn(null);
      })
      .catch(() => {});
  };

  const backControl = (
    <button type="button" className="group" style={controlStyle} onClick={() => startTurn('back')}>
      ← <span className="nav-underline">Previous page</span>
    </button>
  );
  const fwdControl = (
    <button type="button" className="group" style={controlStyle} onClick={() => startTurn('fwd')}>
      <span className="nav-underline">Turn the page</span> →
    </button>
  );

  const renderLeft = (idx: number) => (
    <Page
      side="left"
      head={heads.left}
      pageNo={firstPageNo + idx * 2}
      control={idx > 0 ? backControl : undefined}
    >
      {spreads[idx].left}
    </Page>
  );
  const renderRight = (idx: number) => (
    <Page
      side="right"
      head={heads.right}
      pageNo={firstPageNo + idx * 2 + 1}
      control={idx < spreads.length - 1 ? fwdControl : undefined}
    >
      {spreads[idx].right}
    </Page>
  );

  // While turning forward the right cell already shows the next spread (the
  // leaf carries the current page on its front); turning back mirrors this.
  const idxLeft = turn?.dir === 'back' ? spread - 1 : spread;
  const idxRight = turn?.dir === 'fwd' ? spread + 1 : spread;

  return (
    <div ref={gridRef} className="relative grid grid-cols-2" style={{ perspective: '2400px' }}>
      <div className="sp-reveal">{renderLeft(idxLeft)}</div>
      <div className="sp-reveal">{renderRight(idxRight)}</div>

      {turn && (
        <div
          ref={leafRef}
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: '50%',
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            transform: `rotateY(${turn.dir === 'fwd' ? 0 : -180}deg)`,
            willChange: 'transform',
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-deep)',
          }}
        >
          <div style={faceStyle('front')}>
            {renderRight(turn.dir === 'fwd' ? spread : spread - 1)}
          </div>
          <div style={faceStyle('back')}>
            {renderLeft(turn.dir === 'fwd' ? spread + 1 : spread)}
          </div>
        </div>
      )}

      {/* Corner hotspots: curled paper corners, click or drag to turn. Kept
          mounted through their own drag so the pointer capture survives;
          the text buttons remain the accessible path. */}
      {canFwd && (
        <div
          aria-hidden
          onPointerDown={onCornerDown('fwd')}
          onPointerMove={onCornerMove}
          onPointerUp={onCornerUp}
          onPointerCancel={onCornerUp}
          className="group absolute"
          style={{
            right: 0,
            bottom: 0,
            width: `${CORNER_PX}px`,
            height: `${CORNER_PX}px`,
            cursor: turn?.drag ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
        >
          <div
            className="transition-all group-hover:scale-125"
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: '100% 100%',
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
              background:
                'linear-gradient(135deg, transparent 44%, color-mix(in oklch, var(--bg-deep) 40%, transparent) 47%, color-mix(in oklch, var(--bg-deep) 12%, var(--surface)) 50%, var(--surface) 100%)',
              opacity: turn ? 0 : 1,
            }}
          />
        </div>
      )}
      {canBack && (
        <div
          aria-hidden
          onPointerDown={onCornerDown('back')}
          onPointerMove={onCornerMove}
          onPointerUp={onCornerUp}
          onPointerCancel={onCornerUp}
          className="group absolute"
          style={{
            left: 0,
            bottom: 0,
            width: `${CORNER_PX}px`,
            height: `${CORNER_PX}px`,
            cursor: turn?.drag ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
        >
          <div
            className="transition-all group-hover:scale-125"
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: '0 100%',
              clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
              background:
                'linear-gradient(225deg, transparent 44%, color-mix(in oklch, var(--bg-deep) 40%, transparent) 47%, color-mix(in oklch, var(--bg-deep) 12%, var(--surface)) 50%, var(--surface) 100%)',
              opacity: turn ? 0 : 1,
            }}
          />
        </div>
      )}
    </div>
  );
}

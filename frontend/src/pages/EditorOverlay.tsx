import { useLayoutEffect, useRef } from 'react';
import { Note } from '../types';
import WorkspaceView from './WorkspaceView';

interface EditorOverlayProps {
  note: Note;
  // Rect to grow from on open (the clicked card, or the create trigger). Null → fade.
  origin: DOMRect | null;
  // Mounted together with the page (reload restore): skip the open animation entirely,
  // otherwise the view underneath shines through while the overlay animates in.
  instant?: boolean;
  // Flips true to request a close — the overlay shrinks back, then calls onClosed.
  closing: boolean;
  onClosed: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const DURATION_MS = 420;
const FADE_MS = 200;
// Opacity fades in on its own short timeline so the panel is already visible while
// it's still small, otherwise the growth reads as a plain fade instead of a maximize.
const OPEN_FADE_MS = 130;
// ease-in-out (not ease-out): the editor mount blocks the main thread ~150ms, but
// the compositor keeps advancing the morph in real time through it. A front-loaded
// ease-out would burn most of the growth away during that blind window; ease-in-out
// puts the slow part at the start (hidden by the block) and the visible growth after.
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

// Transform that makes the full-size host look like `rect` (origin: top-left).
const frameTransform = (rect: DOMRect, host: DOMRect) =>
  `translate(${rect.left - host.left}px, ${rect.top - host.top}px) scale(${rect.width / host.width}, ${rect.height / host.height})`;

// Is the rect meaningfully on screen (so shrinking into it makes sense)?
const onScreen = (r: DOMRect | undefined): r is DOMRect =>
  !!r && r.width > 0 && r.bottom > 8 && r.top < window.innerHeight - 8;

// The inline editor as an overlay that morphs out of / back into a card. The morph
// is driven by the Web Animations API (transform + opacity only) so it runs on the
// compositor — a heavy editor mount blocking the main thread can't stutter it.
const EditorOverlay = ({ note, origin, instant, closing, onClosed, onToggleSidebar, sidebarCollapsed }: EditorOverlayProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const animsRef = useRef<Animation[]>([]);

  // Open: grow from the origin rect, or fade when none is known — except on a
  // reload restore (instant), where the overlay must cover the view from frame one.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || instant) return;
    const host = el.getBoundingClientRect();
    // fill: 'backwards' applies the start keyframe before the first paint, so the
    // panel never flashes at full size for a frame before shrinking down.
    if (origin) {
      animsRef.current = [
        el.animate(
          [{ transform: frameTransform(origin, host) }, { transform: 'none' }],
          { duration: DURATION_MS, easing: EASE, fill: 'backwards' },
        ),
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_FADE_MS, easing: 'ease-out', fill: 'backwards' }),
      ];
    } else {
      animsRef.current = [el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: 'ease', fill: 'backwards' })];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close: shrink into the note's card if it's on screen, else fade — then unmount.
  useLayoutEffect(() => {
    if (!closing) return;
    const el = ref.current;
    if (!el) {
      onClosed();
      return;
    }
    animsRef.current.forEach((a) => a.cancel());
    const host = el.getBoundingClientRect();
    const card = document.querySelector<HTMLElement>(`[data-flip-id="${note.id}"]`)?.getBoundingClientRect();
    const anim = onScreen(card)
      ? el.animate(
          [{ transform: 'none', opacity: 1 }, { transform: frameTransform(card, host), opacity: 0 }],
          { duration: DURATION_MS, easing: EASE, fill: 'forwards' },
        )
      : el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: 'ease', fill: 'forwards' });
    anim.finished.then(onClosed).catch(onClosed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  return (
    <div ref={ref} className="editor-overlay" style={{ transformOrigin: 'top left' }}>
      <WorkspaceView note={note} onToggleSidebar={onToggleSidebar} sidebarCollapsed={sidebarCollapsed} instant={instant} />
    </div>
  );
};

export default EditorOverlay;

import { useLayoutEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'motion/react';
import { Note } from '../types';
import WorkspaceView from './WorkspaceView';

interface EditorOverlayProps {
  note: Note;
  // Rect to grow from on open (the clicked card, or the create trigger). Null → fade.
  origin: DOMRect | null;
  // Flips true to request a close — the overlay shrinks back, then calls onClosed.
  closing: boolean;
  onClosed: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const DURATION = 0.34;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Transform that makes the full-size host look like `rect` (origin: top-left).
const frame = (rect: DOMRect, host: DOMRect) => ({
  x: rect.left - host.left,
  y: rect.top - host.top,
  scaleX: rect.width / host.width,
  scaleY: rect.height / host.height,
});

// Is the rect meaningfully on screen (so shrinking into it makes sense)?
const onScreen = (r: DOMRect | undefined): r is DOMRect =>
  !!r && r.width > 0 && r.bottom > 8 && r.top < window.innerHeight - 8;

// The inline editor as an overlay that morphs out of / back into a card.
const EditorOverlay = ({ note, origin, closing, onClosed, onToggleSidebar, sidebarCollapsed }: EditorOverlayProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();

  // Open: grow from the origin rect (or just fade when none is known).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const host = el.getBoundingClientRect();
    if (origin) {
      controls.set({ ...frame(origin, host), opacity: 0 });
      controls.start({ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, transition: { duration: DURATION, ease: EASE } });
    } else {
      controls.set({ opacity: 0 });
      controls.start({ opacity: 1, transition: { duration: 0.2 } });
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
    const host = el.getBoundingClientRect();
    const card = document.querySelector<HTMLElement>(`[data-flip-id="${note.id}"]`)?.getBoundingClientRect();
    const target = onScreen(card)
      ? { ...frame(card, host), opacity: 0, transition: { duration: DURATION, ease: EASE } }
      : { opacity: 0, transition: { duration: 0.2 } };
    void controls.start(target).then(onClosed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  return (
    <motion.div ref={ref} className="editor-overlay" style={{ transformOrigin: 'top left' }} initial={false} animate={controls}>
      <WorkspaceView note={note} onToggleSidebar={onToggleSidebar} sidebarCollapsed={sidebarCollapsed} />
    </motion.div>
  );
};

export default EditorOverlay;

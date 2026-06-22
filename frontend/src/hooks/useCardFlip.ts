import { useLayoutEffect, useRef, type RefObject } from 'react';

const FLIP_MS = 280;
const EASE = 'cubic-bezier(.3,1.25,.35,1)';

// FLIP for grids that aren't drag-reorderable: on every commit, glide each card
// ([data-flip-id]) from its previous slot to its new one, so adding/removing a card
// makes the rest slide to close/open the gap. (Draggable grids already do this via
// useGridReorder.) No-op under prefers-reduced-motion.
export function useCardFlip(containerRef: RefObject<HTMLElement | null>, armed = true) {
  const prev = useRef<Map<string, { left: number; top: number }>>(new Map());
  // Stay silent until armed has held across a commit: the commit where the initial
  // cache→network reconcile lands (and armed flips on) must not animate, or the cards
  // glide on mount. Tracking armed one commit behind makes this timing-proof regardless
  // of whether the view sets armed in the same tick as the data.
  const wasArmed = useRef(false);

  useLayoutEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const els = Array.from(c.querySelectorAll<HTMLElement>('[data-flip-id]'));

    if (armed && wasArmed.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => {
        const id = el.dataset.flipId!;
        const old = prev.current.get(id);
        if (!old) return;
        const dx = old.left - el.offsetLeft;
        const dy = old.top - el.offsetTop;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
          { duration: FLIP_MS, easing: EASE },
        );
      });
    }

    const next = new Map<string, { left: number; top: number }>();
    els.forEach((el) => next.set(el.dataset.flipId!, { left: el.offsetLeft, top: el.offsetTop }));
    prev.current = next;
    wasArmed.current = armed;
  });
}

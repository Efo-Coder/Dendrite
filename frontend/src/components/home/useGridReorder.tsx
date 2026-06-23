import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

interface Pos {
  left: number;
  top: number;
}

interface DragState {
  id: string;
  el: HTMLElement;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  lastDx: number;
  lastDy: number;
  moved: boolean;
  abort: AbortController;
}

interface Options<T> {
  items: T[];
  getId: (item: T) => string;
  containerRef: RefObject<HTMLElement | null>;
  onReorder: (items: T[]) => void;
  // 'x' locks dragging to the horizontal axis — needed inside an overflow-x scroller,
  // where any vertical movement would be clipped at the row's edge.
  axis?: 'x' | 'y';
  // Gates the list-update FLIP so the initial cache→network reconcile on mount doesn't
  // glide; set true once the view's first network load has landed. Drag FLIP is unaffected.
  armed?: boolean;
}

const FLIP_MS = 280;
const SETTLE_MS = 320;
const EASE = 'cubic-bezier(.3,1.25,.35,1)';
const THRESHOLD = 5;

// Pointer drag-to-reorder for a CSS grid: the dragged card sticks to the cursor
// via transform, siblings glide to their new slots via FLIP (2D), and on release
// the card settles springily. Mirrors the NoteList feel, adapted to a 2D grid.
export function useGridReorder<T>({ items, getId, containerRef, onReorder, axis, armed = true }: Options<T>) {
  const [dragOrder, setDragOrder] = useState<T[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const flipRef = useRef<Map<string, Pos>>(new Map());
  // See useCardFlip: track armed one commit behind so the reconcile commit stays silent.
  const wasArmed = useRef(false);

  const order = dragOrder ?? items;
  // Live refs so the pointer handlers never read stale closures.
  const orderRef = useRef(order);
  orderRef.current = order;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => () => {
    dragStateRef.current?.abort.abort();
    document.documentElement.classList.remove('card-dragging');
  }, []);

  // FLIP: glide each card from its previous slot to its new one on every commit.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const els = Array.from(container.querySelectorAll<HTMLElement>('[data-flip-id]'));
    const st = dragStateRef.current;
    // A live drag is always past arming, so gating only ever suppresses the mount reconcile.
    if (armed && wasArmed.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => {
        const id = el.dataset.flipId!;
        if (st && id === st.id) return; // dragged card follows the cursor, not FLIP
        const old = flipRef.current.get(id);
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
    const next = new Map<string, Pos>();
    els.forEach((el) => next.set(el.dataset.flipId!, { left: el.offsetLeft, top: el.offsetTop }));
    flipRef.current = next;
    wasArmed.current = armed;
  });

  const onCardPointerDown = useCallback((e: React.PointerEvent, item: T) => {
    if (e.button !== 0 || dragStateRef.current) return;
    // Don't start a drag from the cover-edit button or other nested controls.
    if ((e.target as HTMLElement).closest('button')) return;
    const el = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-flip-id]');
    if (!el) return;

    const abort = new AbortController();
    const st: DragState = {
      id: getId(item),
      el,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: el.offsetLeft,
      startTop: el.offsetTop,
      lastDx: 0,
      lastDy: 0,
      moved: false,
      abort,
    };
    dragStateRef.current = st;

    const onMove = (ev: PointerEvent) => {
      // Effective deltas honour the locked axis; the threshold still uses raw movement
      // so the drag picks up regardless of direction.
      const rawDx = ev.clientX - st.startX;
      const rawDy = ev.clientY - st.startY;
      const dx = axis === 'y' ? 0 : rawDx;
      const dy = axis === 'x' ? 0 : rawDy;
      if (!st.moved) {
        if (Math.abs(rawDx) < THRESHOLD && Math.abs(rawDy) < THRESHOLD) return;
        st.moved = true;
        setDraggingId(st.id);
        document.documentElement.classList.add('card-dragging');
        window.getSelection()?.removeAllRanges();
        st.el.style.zIndex = '3';
      }
      const w = st.el.offsetWidth;
      const h = st.el.offsetHeight;
      // Clamp the dragged card to the visible container box so it can't be dragged off the
      // edge (where the row's overflow-x would otherwise clip it).
      const c = containerRef.current;
      let targetLeft = st.startLeft + dx;
      let targetTop = st.startTop + dy;
      if (c) {
        targetLeft = Math.max(c.scrollLeft, Math.min(targetLeft, c.scrollLeft + c.clientWidth - w));
        targetTop = Math.max(c.scrollTop, Math.min(targetTop, c.scrollTop + c.clientHeight - h));
      }
      // Store the clamped delta so the release settle starts from the visible position.
      st.lastDx = targetLeft - st.startLeft;
      st.lastDy = targetTop - st.startTop;
      // Card sticks to the cursor (clamped), relative to its current laid-out position.
      st.el.style.transform = `translate(${targetLeft - st.el.offsetLeft}px, ${targetTop - st.el.offsetTop}px)`;

      // Insert index from the dragged card's centre, row-major (row first, then column).
      const cx = targetLeft + w / 2;
      const cy = targetTop + h / 2;
      const rowTol = h / 2;
      const base = orderRef.current;
      let insertAt = 0;
      for (const it of base) {
        const id = getId(it);
        if (id === st.id) continue;
        const r = flipRef.current.get(id);
        if (!r) continue;
        const ocx = r.left + w / 2;
        const ocy = r.top + h / 2;
        const sameRow = Math.abs(ocy - cy) < rowTol;
        const before = sameRow ? ocx < cx : ocy < cy;
        if (before) insertAt++;
      }
      const without = base.filter((it) => getId(it) !== st.id);
      const dragged = base.find((it) => getId(it) === st.id);
      if (!dragged) return;
      const preview = [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)];
      if (!preview.every((it, i) => getId(it) === getId(base[i]))) setDragOrder(preview);
    };

    const finish = () => {
      abort.abort();
      dragStateRef.current = null;
      if (!st.moved) return; // plain click — leave the click handler to open the card
      document.documentElement.classList.remove('card-dragging');
      setDraggingId(null);

      // Springy settle from the current offset into the final slot.
      const residualX = st.startLeft + st.lastDx - st.el.offsetLeft;
      const residualY = st.startTop + st.lastDy - st.el.offsetTop;
      st.el.style.transform = '';
      st.el.style.zIndex = '';
      if (Math.abs(residualX) > 0.5 || Math.abs(residualY) > 0.5) {
        st.el.animate(
          [{ transform: `translate(${residualX}px, ${residualY}px)` }, { transform: 'translate(0, 0)' }],
          { duration: SETTLE_MS, easing: EASE },
        );
      }

      // Swallow the click that follows the release so it doesn't open the card.
      const swallow = (ce: MouseEvent) => { ce.stopPropagation(); ce.preventDefault(); };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);

      const finalOrder = orderRef.current;
      setDragOrder(null);
      const original = itemsRef.current;
      if (!finalOrder.every((it, i) => getId(it) === getId(original[i]))) onReorder(finalOrder);
    };

    window.addEventListener('pointermove', onMove, { signal: abort.signal });
    window.addEventListener('pointerup', finish, { signal: abort.signal });
    window.addEventListener('pointercancel', finish, { signal: abort.signal });
  }, [getId, onReorder, axis, containerRef]);

  return { order, draggingId, onCardPointerDown };
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { Note } from '../../types';
import { noteService } from '../../services/note.service';
import type { ExitRect } from './NoteItem';
import { groupKeyOf, type SortOption } from './noteListUtils';

// A pointer drag in progress (the card follows the cursor)
export interface DragState {
  id: string;
  el: HTMLElement;
  startPointerY: number;
  startTop: number;
  lastDy: number;
  height: number;
  moved: boolean;
  abort: AbortController;
}

interface UseNoteDragOptions {
  notes: Note[];
  localNotesRef: MutableRefObject<Note[]>;
  flipRectsRef: MutableRefObject<Map<string, ExitRect>>;
  contextType: string;
  contextId?: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: SortOption, sortOrder: 'asc' | 'desc') => void;
  onNotesReordered?: () => void;
}

// Pointer-events drag with live preview: the card sticks to the cursor via
// transform, siblings glide out of the way via FLIP, and on release the card
// settles springily into the gap — the order is already final at that point.
export function useNoteDrag({
  notes,
  localNotesRef,
  flipRectsRef,
  contextType,
  contextId,
  sortOrder,
  onSortChange,
  onNotesReordered,
}: UseNoteDragOptions) {
  // Live preview order during the drag, kept until the persisted refetch lands
  const [dragNotes, setDragNotes] = useState<Note[] | null>(null);
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dragOriginRef = useRef<Note[] | null>(null);
  const waitingToClearDragRef = useRef(false);

  useEffect(() => {
    if (waitingToClearDragRef.current) {
      waitingToClearDragRef.current = false;
      setDragNotes(null);
    }
  }, [notes]);

  // Reset drag state synchronously before paint when context changes — prevents
  // stale drag notes from a previous category briefly appearing in the new view
  useLayoutEffect(() => {
    dragStateRef.current?.abort.abort();
    dragStateRef.current = null;
    document.documentElement.classList.remove('note-dragging');
    setDragNotes(null);
    setDragNoteId(null);
    dragOriginRef.current = null;
  }, [contextType, contextId]);

  // Abort a running drag cleanly on unmount
  useEffect(() => () => {
    dragStateRef.current?.abort.abort();
    document.documentElement.classList.remove('note-dragging');
  }, []);

  const persistDragOrder = useCallback(async (origin: Note[] | null) => {
    const reordered = localNotesRef.current;
    // Nothing moved → nothing to persist
    if (origin && origin.length === reordered.length && origin.every((n, i) => n.id === reordered[i].id)) {
      setDragNotes(null);
      return;
    }
    onSortChange('manual', sortOrder);
    const noteOrders = reordered.map((note, index) => ({ id: note.id, order: index }));
    try {
      await noteService.reorderNotes(noteOrders, contextType, contextId || null);
      if (onNotesReordered) {
        waitingToClearDragRef.current = true;
        onNotesReordered();
      } else {
        setDragNotes(null);
      }
    } catch {
      setDragNotes(null);
    }
  }, [sortOrder, contextType, contextId, onNotesReordered, onSortChange, localNotesRef]);

  const handleCardPointerDown = useCallback((e: React.PointerEvent, note: Note) => {
    if (e.button !== 0 || dragStateRef.current) return;
    const li = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-flip-id]');
    if (!li) return;
    // No preventDefault and no drag state yet: a plain click should open the
    // note normally — the drag only starts past the movement threshold.

    const abort = new AbortController();
    const st: DragState = {
      id: note.id,
      el: li,
      startPointerY: e.clientY,
      startTop: li.offsetTop,
      lastDy: 0,
      height: li.offsetHeight,
      moved: false,
      abort,
    };
    dragStateRef.current = st;

    const onMove = (ev: PointerEvent) => {
      const rawDy = ev.clientY - st.startPointerY;
      if (!st.moved) {
        if (Math.abs(rawDy) < 5) return;
        // Threshold crossed → actually start the drag
        st.moved = true;
        dragOriginRef.current = localNotesRef.current;
        setDragNoteId(st.id);
        document.documentElement.classList.add('note-dragging');
        window.getSelection()?.removeAllRanges();
        st.el.style.zIndex = '2';
      }

      const base = localNotesRef.current;
      const source = base.find(n => n.id === st.id);
      if (!source) return;

      // Drag bounds: the card stays within the vertical span of its group —
      // it cannot be sorted beyond that anyway
      let minTop = st.startTop;
      let maxBottom = st.startTop + st.height;
      for (const n of base) {
        if (groupKeyOf(n) !== groupKeyOf(source)) continue;
        const rect = flipRectsRef.current.get(n.id);
        if (!rect) continue;
        minTop = Math.min(minTop, rect.top);
        maxBottom = Math.max(maxBottom, rect.top + rect.height);
      }
      const dy = Math.min(Math.max(rawDy, minTop - st.startTop), maxBottom - st.height - st.startTop);
      st.lastDy = dy;

      // Card follows the cursor — relative to its current layout position
      st.el.style.transform = `translateY(${st.startTop + dy - st.el.offsetTop}px)`;

      // Insert position: swap once a target item's midpoint clearly enters the
      // dragged card's span (25% inset from the edges) — earlier than midpoint
      // crossing, but not on first touch
      const inset = st.height * 0.25;
      const cardTop = st.startTop + dy;
      const cardBottom = cardTop + st.height;
      let target: Note | null = null;
      let pos: 'top' | 'bottom' = 'top';
      for (const n of base) {
        if (n.id === st.id || groupKeyOf(n) !== groupKeyOf(source)) continue;
        const rect = flipRectsRef.current.get(n.id);
        if (!rect) continue;
        const mid = rect.top + rect.height / 2;
        if (mid >= cardTop + inset && mid <= cardBottom - inset) {
          target = n;
          pos = mid < cardTop + st.height / 2 ? 'top' : 'bottom';
          break;
        }
      }
      if (!target) return;
      const without = base.filter(n => n.id !== st.id);
      const targetIdx = without.findIndex(n => n.id === target!.id);
      if (targetIdx === -1) return;
      const insertAt = pos === 'top' ? targetIdx : targetIdx + 1;
      const preview = [...without.slice(0, insertAt), source, ...without.slice(insertAt)];
      if (!preview.every((n, i) => n.id === base[i]?.id)) setDragNotes(preview);
    };

    const finishDrag = () => {
      abort.abort();
      dragStateRef.current = null;
      if (!st.moved) return; // was only a click — touch nothing
      document.documentElement.classList.remove('note-dragging');
      setDragNoteId(null);
      // Springy settle from the current offset into the final gap
      const residual = st.startTop + st.lastDy - st.el.offsetTop;
      st.el.style.transform = '';
      st.el.style.zIndex = '';
      if (Math.abs(residual) > 0.5) {
        st.el.animate(
          [{ transform: `translateY(${residual}px)` }, { transform: 'translateY(0)' }],
          { duration: 320, easing: 'cubic-bezier(.3,1.25,.35,1)' },
        );
      }
      // Swallow the click that follows the release, otherwise it opens the note
      const swallowClick = (ce: MouseEvent) => {
        ce.stopPropagation();
        ce.preventDefault();
      };
      window.addEventListener('click', swallowClick, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 0);
      const origin = dragOriginRef.current;
      dragOriginRef.current = null;
      void persistDragOrder(origin);
    };

    window.addEventListener('pointermove', onMove, { signal: abort.signal });
    window.addEventListener('pointerup', finishDrag, { signal: abort.signal });
    window.addEventListener('pointercancel', finishDrag, { signal: abort.signal });
  }, [persistDragOrder, localNotesRef, flipRectsRef]);

  return { dragNotes, dragNoteId, dragStateRef, handleCardPointerDown };
}

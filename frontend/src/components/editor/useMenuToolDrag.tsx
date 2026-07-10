import { useRef } from 'react';
import type { MouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { MiniToolbarHandle } from './MiniToolbar';
import type { ToolbarBtn } from './toolbarButtons';
import { useDragGhost } from './useDragGhost';

// Add-drag from the More panel into the mini toolbar. The panel's own order never
// changes — the pressed button stays put while a ghost chip follows the pointer, and
// MiniToolbarHandle previews/resolves the insertion slot.

// ─── Types ───────────────────────────────────────────────────────────────────

interface MenuToolDragInput {
  miniRef: RefObject<MiniToolbarHandle | null>;
  canDrag: (id: string) => boolean;
  onDrop: (id: string, index: number) => void;
}

type DragState = { btn: ToolbarBtn; startX: number; startY: number; started: boolean };

// ─── Constants ───────────────────────────────────────────────────────────────

// Pointer travel (px) before a press becomes an add-drag instead of a click.
const DRAG_THRESHOLD = 5;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMenuToolDrag({ miniRef, canDrag, onDrop }: MenuToolDragInput) {
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const ghost = useDragGhost();

  const endDrag = (e: ReactPointerEvent<HTMLElement>, commit: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.started) return;
    suppressClickRef.current = true;
    ghost.hide();
    if (!commit) {
      miniRef.current?.cancelInsert();
      return;
    }
    const idx = miniRef.current?.commitInsert(e.clientX, e.clientY);
    if (idx != null) onDrop(drag.btn.id, idx);
  };

  // Spread onto each panel tool button; a press that never travels past the
  // threshold falls through to the button's own click.
  const handlers = (btn: ToolbarBtn) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      suppressClickRef.current = false;
      if (e.button !== 0 || !canDrag(btn.id)) return;
      dragRef.current = { btn, startX: e.clientX, startY: e.clientY, started: false };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (!drag.started) {
        if (Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD && Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD) return;
        drag.started = true;
        // Capture only once the drag is real: capturing on pointerdown would retarget
        // the compatibility click and the button's own onClick would never fire.
        e.currentTarget.setPointerCapture(e.pointerId);
        ghost.show(drag.btn.icon, e.clientX, e.clientY);
      }
      ghost.move(e.clientX, e.clientY);
      miniRef.current?.previewInsert(e.clientX, e.clientY);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => endDrag(e, true),
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => endDrag(e, false),
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
  });

  return { handlers, ghost: ghost.node };
}

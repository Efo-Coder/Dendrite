import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import { useMagicHover } from '../../hooks/useMagicHover';
import type { PopupAnchor } from '../../hooks/useSmartPopupStyle';
import type { ToolbarBtn } from './toolbarButtons';
import { useDragGhost } from './useDragGhost';
import { useTrashZone } from './useTrashZone';

// The customisable quick bar in the editor footer. Tools reorder via pointer drag
// (native HTML5 DnD is avoided project-wide: its drag cursor isn't stylable). Dragging a
// removable tool raises a bin above the bar; lifting the tool up to it and releasing there
// deletes it. Releasing anywhere else keeps it. The More panel drops new tools in through
// the MiniToolbarHandle insert API.

// ─── Types ───────────────────────────────────────────────────────────────────

interface MiniToolbarProps {
  tools: ToolbarBtn[];
  // Only user-added tools may be dragged out for removal; the defaults are move-only.
  removableIds: ReadonlySet<string>;
  disabled?: boolean;
  moreActive: boolean;
  onMoreToggle: () => void;
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
}

// Imperative surface for the More panel's add-drag: preview shows the insertion caret,
// commit resolves the drop to an index among the rendered tools (null = not over bar).
export type MiniToolbarHandle = {
  previewInsert: (x: number, y: number) => boolean;
  commitInsert: (x: number, y: number) => number | null;
  cancelInsert: () => void;
};

type DragState = {
  id: string;
  fromIdx: number;
  toIdx: number;
  startX: number;
  startY: number;
  // Slot pitch (button width + gap); measured when the drag actually starts.
  step: number;
  started: boolean;
  removable: boolean;
  // Lifted up out of the bar toward the bin; the slot collapses while detached.
  detached: boolean;
  // Chip currently hovering the bin — releasing now deletes the tool.
  overTrash: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

// Pointer travel (px) before a press becomes a reorder drag instead of a click.
const DRAG_THRESHOLD = 5;
// Vertical travel (px) past which a removable tool lifts out of the bar for removal.
const DETACH_THRESHOLD = 32;
// Forgiveness margin (px) around the bar for external drops from the More panel.
const HIT_MARGIN = 24;
const DRAG_EASE = 'transform 180ms cubic-bezier(0.23, 1, 0.32, 1)';

// ─── Component ───────────────────────────────────────────────────────────────

const MiniToolbar = forwardRef<MiniToolbarHandle, MiniToolbarProps>(function MiniToolbar(
  { tools, removableIds, disabled = false, moreActive, onMoreToggle, onReorder, onRemove },
  ref,
) {
  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<DragState | null>(null);
  // FLIP start position of the just-dropped item, consumed on the reorder commit.
  const flipRef = useRef<{ id: string; left: number } | null>(null);
  const suppressClickRef = useRef(false);
  const caretRef = useRef<HTMLDivElement>(null);
  const caretShownRef = useRef(false);
  const ghost = useDragGhost();
  const trash = useTrashZone(barRef);

  const { onItemEnter, onItemLeave, Indicator } = useMagicHover({ mode: 'free', borderRadius: 9999, ref: barRef });

  const orderKey = tools.map((t) => t.id).join('|');

  // Reorder commit: clear the drag transforms in the same commit that reorders the DOM
  // (pre-paint, so nothing flashes), then FLIP the dropped item from its grab position
  // into its final slot.
  useLayoutEffect(() => {
    const flip = flipRef.current;
    flipRef.current = null;
    for (const [id, el] of itemRefs.current) {
      el.style.transition = '';
      el.style.transform = '';
      el.style.zIndex = '';
      if (flip?.id === id) {
        const delta = flip.left - el.getBoundingClientRect().left;
        if (Math.abs(delta) > 0.5) {
          el.style.transform = `translateX(${delta}px)`;
          requestAnimationFrame(() => {
            el.style.transition = DRAG_EASE;
            el.style.transform = '';
          });
        }
      }
    }
  }, [orderKey]);

  const shiftSiblings = (drag: DragState) => {
    tools.forEach((tool, i) => {
      if (tool.id === drag.id) return;
      const el = itemRefs.current.get(tool.id);
      if (!el) return;
      const shift = i > drag.fromIdx && i <= drag.toIdx ? -drag.step
        : i < drag.fromIdx && i >= drag.toIdx ? drag.step : 0;
      el.style.transition = DRAG_EASE;
      el.style.transform = shift ? `translateX(${shift}px)` : '';
    });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, idx: number) => {
    suppressClickRef.current = false;
    if (disabled || e.button !== 0 || tools.length < 2) return;
    dragRef.current = {
      id: tools[idx].id, fromIdx: idx, toIdx: idx,
      startX: e.clientX, startY: e.clientY, step: 0, started: false,
      removable: removableIds.has(tools[idx].id), detached: false, overTrash: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    // No button held means the press was released outside this wrapper before the drag
    // started (so no capture, and our pointerup never fired). Discard the stale press
    // instead of letting this hover hijack into a phantom drag.
    if (e.buttons === 0) { if (!drag.started) dragRef.current = null; return; }
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.started) {
      // Vertical pull only starts a drag for removable tools (it leads to detach).
      if (Math.abs(dx) < DRAG_THRESHOLD && (!drag.removable || Math.abs(dy) < DRAG_THRESHOLD)) return;
      // Buttons are uniform, so the pitch of the first two wrappers holds for all slots.
      const first = itemRefs.current.get(tools[0].id)?.getBoundingClientRect();
      const second = itemRefs.current.get(tools[1].id)?.getBoundingClientRect();
      const step = first && second ? second.left - first.left : 0;
      if (step <= 0) return;
      drag.step = step;
      drag.started = true;
      // A removable tool can be deleted: reveal the bin for the whole drag.
      if (drag.removable) trash.show();
      // Capture only once the drag is real: capturing on pointerdown would retarget the
      // compatibility click to the wrapper and the tool button's onClick would never fire.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const el = itemRefs.current.get(drag.id);
    if (!el) return;
    // Past the vertical threshold a removable tool lifts up toward the bin: the original
    // hides, the gap closes, and the ghost chip follows the pointer.
    if (drag.removable) {
      const detached = Math.abs(dy) > DETACH_THRESHOLD;
      if (detached !== drag.detached) {
        drag.detached = detached;
        if (detached) {
          ghost.show(tools[drag.fromIdx].icon, e.clientX, e.clientY);
          el.style.opacity = '0';
          el.style.transform = '';
          el.style.zIndex = '';
          // Close the gap: everything after the lifted tool slides one slot left.
          drag.toIdx = tools.length - 1;
          shiftSiblings(drag);
        } else {
          ghost.hide();
          el.style.opacity = '';
          drag.toIdx = drag.fromIdx;
          shiftSiblings(drag);
        }
      }
      if (drag.detached) {
        drag.overTrash = trash.hitTest(e.clientX, e.clientY);
        ghost.move(e.clientX, e.clientY);
        return;
      }
    }
    // Clamp to the slot range (first…last tool) so the item can't leave the bar.
    const dxClamped = Math.min((tools.length - 1 - drag.fromIdx) * drag.step, Math.max(-drag.fromIdx * drag.step, dx));
    el.style.transition = 'none';
    el.style.transform = `translateX(${dxClamped}px)`;
    el.style.zIndex = '1';
    const toIdx = Math.min(tools.length - 1, Math.max(0, drag.fromIdx + Math.round(dxClamped / drag.step)));
    if (toIdx !== drag.toIdx) {
      drag.toIdx = toIdx;
      shiftSiblings(drag);
    }
  };

  const endDrag = (commit: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.started) return;
    suppressClickRef.current = true;
    trash.hide();
    const el = itemRefs.current.get(drag.id);
    if (drag.detached) {
      // Dropped on the bin: delete it. The gap already collapsed to the tool's final
      // layout, so the unmount is seamless; the chip pops away where it was released.
      if (commit && drag.overTrash) {
        onRemove(drag.id);
        ghost.popAway();
        return;
      }
      // Released in empty space: nothing changes. The chip pops away and the original
      // fades back into its slot as the siblings glide open again.
      ghost.popAway();
      if (el) {
        el.style.transition = `opacity 180ms ease, ${DRAG_EASE}`;
        el.style.opacity = '';
        el.style.transform = '';
        el.style.zIndex = '';
      }
      drag.toIdx = drag.fromIdx;
      shiftSiblings(drag);
      return;
    }
    if (commit && drag.toIdx !== drag.fromIdx) {
      if (el) flipRef.current = { id: drag.id, left: el.getBoundingClientRect().left };
      const ids = tools.map((t) => t.id);
      ids.splice(drag.toIdx, 0, ids.splice(drag.fromIdx, 1)[0]);
      onReorder(ids);
      return;
    }
    // No order change: glide every item back to its slot.
    drag.toIdx = drag.fromIdx;
    shiftSiblings(drag);
    if (el) {
      el.style.transition = DRAG_EASE;
      el.style.transform = '';
      el.style.zIndex = '';
    }
  };

  // ─── External add-drag (More panel → bar) ────────────────────────────────────

  const insertIndexAt = (x: number, y: number): number | null => {
    const bar = barRef.current?.getBoundingClientRect();
    if (!bar) return null;
    if (x < bar.left - HIT_MARGIN || x > bar.right + HIT_MARGIN || y < bar.top - HIT_MARGIN || y > bar.bottom + HIT_MARGIN) return null;
    for (let i = 0; i < tools.length; i++) {
      const r = itemRefs.current.get(tools[i].id)?.getBoundingClientRect();
      if (r && x < r.left + r.width / 2) return i;
    }
    return tools.length;
  };

  // The caret is positioned imperatively so pointermove never re-renders the bar.
  const setCaret = (idx: number | null) => {
    const caret = caretRef.current;
    const bar = barRef.current?.getBoundingClientRect();
    if (!caret || !bar) return;
    if (idx === null) {
      caret.style.opacity = '0';
      caretShownRef.current = false;
      return;
    }
    const rect = (id: string) => itemRefs.current.get(id)?.getBoundingClientRect();
    const left = idx < tools.length
      ? (rect(tools[idx].id)?.left ?? bar.left) - bar.left - 2
      : (rect(tools[tools.length - 1].id)?.right ?? bar.right) - bar.left;
    // Slide between slots only while visible — a fresh caret must not glide across the bar.
    caret.style.transition = caretShownRef.current ? 'left 150ms ease' : 'none';
    caret.style.left = `${left}px`;
    caret.style.opacity = '1';
    caretShownRef.current = true;
  };

  useImperativeHandle(ref, () => ({
    previewInsert: (x, y) => {
      const idx = insertIndexAt(x, y);
      setCaret(idx);
      return idx !== null;
    },
    commitInsert: (x, y) => {
      setCaret(null);
      return insertIndexAt(x, y);
    },
    cancelInsert: () => setCaret(null),
  }));

  // Same anchor shape as the floating ElevatedToolbar: pickers open above the bar,
  // spanning its width, horizontally locked to the clicked button.
  const miniAnchor = (e: MouseEvent<HTMLButtonElement>): PopupAnchor => {
    const r = e.currentTarget.getBoundingClientRect();
    const bar = barRef.current?.getBoundingClientRect();
    return { x: r.left + r.width / 2, top: bar?.top ?? r.top, bottom: bar?.bottom ?? r.bottom, left: bar?.left, width: bar?.width };
  };

  return (
    <div
      ref={barRef}
      className="relative flex items-center gap-0.5 rounded-full border border-[color-mix(in_srgb,var(--line)_75%,transparent)] bg-(--panel-bg) backdrop-blur-md px-1 py-1 shadow-[0_10px_30px_color-mix(in_srgb,#000_45%,transparent),0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)] magic-hover"
    >
      {Indicator}
      {ghost.node}
      {trash.node}
      <div
        ref={caretRef}
        className="pointer-events-none absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-(--accent) opacity-0"
        aria-hidden
      />
      {tools.map((tool, idx) => {
        const toolDisabled = disabled || !!tool.isDisabled;
        return (
          <div
            key={tool.id}
            ref={(el) => { if (el) itemRefs.current.set(tool.id, el); else itemRefs.current.delete(tool.id); }}
            className="relative touch-none"
            onPointerDown={(e) => onPointerDown(e, idx)}
            onPointerMove={onPointerMove}
            onPointerUp={() => endDrag(true)}
            onPointerCancel={() => endDrag(false)}
            onClickCapture={(e) => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { if (!toolDisabled) tool.action(e, miniAnchor(e)); }}
              onMouseEnter={toolDisabled ? undefined : onItemEnter}
              onMouseLeave={toolDisabled ? undefined : onItemLeave}
              // aria-disabled instead of disabled so disabled tools stay drag-reorderable.
              aria-disabled={toolDisabled || undefined}
              title={tool.title}
              className={clsx(
                'icon-btn-md rounded-full transition-colors',
                toolDisabled && 'opacity-30',
                tool.isActive && 'text-(--ink)',
              )}
            >
              <tool.icon className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onMoreToggle}
        onMouseEnter={onItemEnter}
        onMouseLeave={onItemLeave}
        disabled={disabled}
        title="More tools"
        className={clsx('icon-btn-md rounded-full transition-colors disabled:opacity-30', moreActive && 'text-(--ink)')}
      >
        <MoreVertical className="w-4 h-4" strokeWidth={1.75} />
      </button>
    </div>
  );
});

export default MiniToolbar;

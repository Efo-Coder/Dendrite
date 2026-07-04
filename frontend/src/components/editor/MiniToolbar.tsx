import { useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { MoreVertical, X } from 'lucide-react';
import clsx from 'clsx';
import { useMagicHover } from '../../hooks/useMagicHover';
import type { PopupAnchor } from '../../hooks/useSmartPopupStyle';
import type { ToolbarBtn } from './toolbarButtons';

// The customisable quick bar in the editor footer. Tools reorder via pointer drag
// (native HTML5 DnD is avoided project-wide: its drag cursor isn't stylable); only
// user-added tools show a remove badge.

// ─── Types ───────────────────────────────────────────────────────────────────

interface MiniToolbarProps {
  tools: ToolbarBtn[];
  // Only user-added tools may be removed; the built-in defaults are move-only.
  removableIds: ReadonlySet<string>;
  disabled?: boolean;
  moreActive: boolean;
  onMoreToggle: () => void;
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
}

type DragState = {
  id: string;
  fromIdx: number;
  toIdx: number;
  startX: number;
  // Slot pitch (button width + gap); measured when the drag actually starts.
  step: number;
  started: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

// Pointer travel (px) before a press becomes a reorder drag instead of a click.
const DRAG_THRESHOLD = 5;
const DRAG_EASE = 'transform 180ms cubic-bezier(0.23, 1, 0.32, 1)';

// ─── Component ───────────────────────────────────────────────────────────────

const MiniToolbar = ({ tools, removableIds, disabled = false, moreActive, onMoreToggle, onReorder, onRemove }: MiniToolbarProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<DragState | null>(null);
  // FLIP start position of the just-dropped item, consumed on the reorder commit.
  const flipRef = useRef<{ id: string; left: number } | null>(null);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

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
    dragRef.current = { id: tools[idx].id, fromIdx: idx, toIdx: idx, startX: e.clientX, step: 0, started: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (!drag.started) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      // Buttons are uniform, so the pitch of the first two wrappers holds for all slots.
      const first = itemRefs.current.get(tools[0].id)?.getBoundingClientRect();
      const second = itemRefs.current.get(tools[1].id)?.getBoundingClientRect();
      const step = first && second ? second.left - first.left : 0;
      if (step <= 0) return;
      drag.step = step;
      drag.started = true;
      setDragging(true);
      // Capture only once the drag is real: capturing on pointerdown would retarget the
      // compatibility click to the wrapper and the tool button's onClick would never fire.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const el = itemRefs.current.get(drag.id);
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translateX(${dx}px)`;
      el.style.zIndex = '1';
    }
    const toIdx = Math.min(tools.length - 1, Math.max(0, drag.fromIdx + Math.round(dx / drag.step)));
    if (toIdx !== drag.toIdx) {
      drag.toIdx = toIdx;
      shiftSiblings(drag);
    }
  };

  const endDrag = (commit: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.started) return;
    setDragging(false);
    suppressClickRef.current = true;
    const el = itemRefs.current.get(drag.id);
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
      {tools.map((tool, idx) => {
        const toolDisabled = disabled || !!tool.isDisabled;
        return (
          <div
            key={tool.id}
            ref={(el) => { if (el) itemRefs.current.set(tool.id, el); else itemRefs.current.delete(tool.id); }}
            className="relative touch-none group/mini"
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
            {removableIds.has(tool.id) && !disabled && !dragging && (
              <button
                type="button"
                title="Remove from quick bar"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); onRemove(tool.id); }}
                className="absolute -top-1 -right-0.5 z-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-(--line) bg-(--panel-bg) text-(--ink-mid) opacity-0 pointer-events-none transition-opacity group-hover/mini:opacity-100 group-hover/mini:pointer-events-auto hover:text-(--danger)"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
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
};

export default MiniToolbar;

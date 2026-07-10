import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';

// Delete target for the mini toolbar: a round bin that fades in above the bar while a
// removable tool is dragged. Dragging the chip over it turns it red and grows its ring;
// releasing there deletes the tool. Rendered as a portal (like the drag ghost) so the
// editor chrome's overflow-hidden can't clip it. Sits below the ghost (z-6 < z-7) so the
// dragged chip passes over it.

// Gap (px) between the bin's bottom edge and the top of the bar.
const GAP = 14;

export function useTrashZone(barRef: RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState(false);
  const [over, setOver] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const nodeRef = useRef<HTMLDivElement | null>(null);
  // Refs mirror the state so the per-pointermove callers don't trigger a render each move.
  const visibleRef = useRef(false);
  const overRef = useRef(false);

  const show = () => {
    if (visibleRef.current) return;
    visibleRef.current = true;
    const bar = barRef.current?.getBoundingClientRect();
    if (bar) setPos({ left: bar.left + bar.width / 2, top: bar.top - GAP });
    setVisible(true);
  };

  const hide = () => {
    if (!visibleRef.current && !overRef.current) return;
    visibleRef.current = false;
    overRef.current = false;
    setVisible(false);
    setOver(false);
  };

  // True when (x, y) is within the bin (plus a forgiveness margin); updates the red state.
  const hitTest = (x: number, y: number): boolean => {
    const r = nodeRef.current?.getBoundingClientRect();
    const m = 14;
    const hit = !!r && x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
    if (hit !== overRef.current) { overRef.current = hit; setOver(hit); }
    return hit;
  };

  const node = createPortal(
    <div
      ref={nodeRef}
      style={{ left: pos.left, top: pos.top }}
      className={clsx(
        'fixed z-6 flex h-10 w-10 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 ease-out',
        !visible && 'scale-90 opacity-0 pointer-events-none',
        visible && !over && 'scale-100 opacity-100',
        visible && over && 'scale-110 opacity-100',
        over
          ? 'bg-[color-mix(in_srgb,var(--danger)_16%,var(--panel-bg))] text-(--danger) shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_60%,transparent),0_10px_24px_color-mix(in_srgb,#000_35%,transparent)]'
          : 'bg-(--panel-bg) text-(--ink-mid) shadow-[0_0_0_1px_color-mix(in_srgb,var(--line)_75%,transparent),0_10px_24px_color-mix(in_srgb,#000_35%,transparent)]',
      )}
      aria-hidden
    >
      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
    </div>,
    getModalPortalRoot(),
  );

  return { show, hide, hitTest, node };
}

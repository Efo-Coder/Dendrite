import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import type { ToolbarBtn } from './toolbarButtons';

// Floating chip that follows the pointer during a tool drag (adding from the More
// panel, pulling a tool out of the mini toolbar). Positioning writes straight to the
// DOM node so pointermove never re-renders the owner.

// Matches h-8/w-8 on the chip; the pointer sits at its centre.
const CHIP_SIZE = 32;

export function useDragGhost() {
  const [icon, setIcon] = useState<ToolbarBtn['icon'] | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const place = () => {
    const el = elRef.current;
    if (el) el.style.transform = `translate(${posRef.current.x - CHIP_SIZE / 2}px, ${posRef.current.y - CHIP_SIZE / 2}px)`;
  };

  const show = (nextIcon: ToolbarBtn['icon'], x: number, y: number) => {
    posRef.current = { x, y };
    setIcon(() => nextIcon);
  };
  const move = (x: number, y: number) => {
    posRef.current = { x, y };
    place();
  };
  const hide = () => setIcon(null);
  // Exit on drop: the chip shrinks and fades where it was released, then unmounts.
  // Opacity is pinned at 0 on finish so the node can't flash back before React removes it.
  const popAway = () => {
    const el = elRef.current;
    if (!el) { setIcon(null); return; }
    const base = el.style.transform;
    const anim = el.animate(
      [{ transform: `${base} scale(1)`, opacity: 1 }, { transform: `${base} scale(0.35)`, opacity: 0 }],
      { duration: 190, easing: 'cubic-bezier(0.4, 0, 1, 1)' },
    );
    anim.onfinish = () => { el.style.opacity = '0'; setIcon(null); };
  };

  const Icon = icon;
  const node = Icon
    ? createPortal(
        <div
          // Callback ref places the chip synchronously on mount — show() runs a render
          // before the node exists, so the first pointer position would be lost otherwise.
          ref={(el) => { elRef.current = el; if (el) place(); }}
          className="pointer-events-none fixed left-0 top-0 z-7 flex h-8 w-8 items-center justify-center rounded-full border border-(--line) bg-(--panel-bg) text-(--ink) shadow-lg backdrop-blur-md"
          aria-hidden
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>,
        getModalPortalRoot(),
      )
    : null;

  return { show, move, hide, popAway, node };
}

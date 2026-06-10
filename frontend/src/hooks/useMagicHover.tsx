import { useEffect, useRef, useState } from 'react';

interface MagicHoverConfig {
  mode?: 'vertical' | 'free';
  inset?: number;
  background?: string;
  borderRadius?: number;
  leaveDelay?: number;
  ref?: React.RefObject<HTMLDivElement | null>;
}

interface HoverBox {
  top: number; left: number; width: number; height: number;
  visible: boolean; instant: boolean;
}

export function useMagicHover({
  mode = 'vertical',
  inset = 0,
  background = 'color-mix(in oklch, var(--accent) 8%, transparent)',
  borderRadius = 7,
  leaveDelay = 60,
  ref: externalRef,
}: MagicHoverConfig = {}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (externalRef ?? internalRef) as React.RefObject<HTMLDivElement | null>;
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [box, setBox] = useState<HoverBox>({ top: 0, left: 0, width: 0, height: 0, visible: false, instant: false });

  useEffect(() => {
    if (box.instant) {
      const id = requestAnimationFrame(() => setBox(s => ({ ...s, instant: false })));
      return () => cancelAnimationFrame(id);
    }
  }, [box.instant]);

  const onItemEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    const container = containerRef.current;
    if (!container) return;
    const r = e.currentTarget.getBoundingClientRect();
    const cr = container.getBoundingClientRect();

    const top = r.top - cr.top + container.scrollTop;
    const left = mode === 'free' ? r.left - cr.left : inset;
    const width = mode === 'free' ? r.width : cr.width - 2 * inset;
    const height = r.height;

    setBox(prev => ({ top, left, width, height, visible: true, instant: !prev.visible }));
  };

  const onItemLeave = () => {
    leaveTimer.current = setTimeout(
      () => setBox(s => ({ ...s, visible: false })),
      leaveDelay,
    );
  };

  const Indicator = (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        background,
        borderRadius,
        opacity: box.visible ? 1 : 0,
        transition: box.instant
          ? 'opacity .12s ease'
          : 'top .22s ease, left .22s ease, width .22s ease, height .22s ease, opacity .12s ease',
        pointerEvents: 'none',
      }}
    />
  );

  return { containerRef: containerRef as React.RefObject<HTMLDivElement>, onItemEnter, onItemLeave, Indicator };
}

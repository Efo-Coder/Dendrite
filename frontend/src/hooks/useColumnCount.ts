import { useEffect, useState, type RefObject } from 'react';

// How many grid columns currently fit in `ref`, so a partial last row can be
// padded with transparent placeholders (keeps card width constant — no stretch).
export function useColumnCount(
  ref: RefObject<HTMLElement | null>,
  minCardPx: number,
  gapPx: number,
): number {
  const [cols, setCols] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setCols(Math.max(1, Math.floor((w + gapPx) / (minCardPx + gapPx))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, minCardPx, gapPx]);

  return cols;
}

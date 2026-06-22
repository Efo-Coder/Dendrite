import { useLayoutEffect, useState } from 'react';

// Returns [ref, columns]: how many grid columns currently fit, so a partial last
// row can be padded with transparent placeholders (cards keep a constant width).
// Uses a callback ref so it still measures when the grid mounts after an async load.
// Layout effect so the first measured count lands before paint — no flash of a
// single under-counted row when the grid mounts with data already present.
export function useColumnCount(minCardPx: number, gapPx: number) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [cols, setCols] = useState(1);

  useLayoutEffect(() => {
    if (!el) return;
    const measure = () =>
      setCols(Math.max(1, Math.floor((el.clientWidth + gapPx) / (minCardPx + gapPx))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, minCardPx, gapPx]);

  return [setEl, cols] as const;
}

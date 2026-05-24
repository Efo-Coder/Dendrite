import { useState, useLayoutEffect, type RefObject, type CSSProperties } from 'react';

export type PopupAnchor = { x: number; top: number; bottom: number };

export function useSmartPopupStyle(
  anchor: PopupAnchor | null,
  popupRef: RefObject<HTMLElement | null>,
  padding = 8,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
    left: 0,
    top: 0,
  });

  useLayoutEffect(() => {
    if (!anchor || !popupRef.current) {
      setStyle({ position: 'fixed', visibility: 'hidden', left: 0, top: 0 });
      return;
    }

    const el = popupRef.current;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceAbove = anchor.top - padding;
    const spaceBelow = vh - anchor.bottom - padding;

    let top: number;
    if (spaceAbove >= ph || spaceAbove > spaceBelow) {
      top = anchor.top - ph - padding;
    } else {
      top = anchor.bottom + padding;
    }
    top = Math.max(padding, Math.min(vh - ph - padding, top));

    let left = anchor.x - pw / 2;
    left = Math.max(padding, Math.min(vw - pw - padding, left));

    setStyle({ position: 'fixed', left, top, visibility: 'visible' });
  }, [anchor, popupRef, padding]);

  return style;
}

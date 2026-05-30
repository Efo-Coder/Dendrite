import { useState, useLayoutEffect, type RefObject, type CSSProperties } from 'react';

export type PopupAnchor = { x: number; top: number; bottom: number; left?: number; width?: number };
export type PopupPlacement = 'above' | 'below';

export function useSmartPopupStyle(
  anchor: PopupAnchor | null,
  popupRef: RefObject<HTMLElement | null>,
  padding = 8,
): { style: CSSProperties; placement: PopupPlacement } {
  const [result, setResult] = useState<{ style: CSSProperties; placement: PopupPlacement }>({
    style: { position: 'fixed', visibility: 'hidden', left: 0, top: 0 },
    placement: 'above',
  });

  useLayoutEffect(() => {
    if (!anchor || !popupRef.current) {
      setResult({ style: { position: 'fixed', visibility: 'hidden', left: 0, top: 0 }, placement: 'above' });
      return;
    }

    const el = popupRef.current;
    const ph = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceAbove = anchor.top - padding;
    const spaceBelow = vh - anchor.bottom - padding;

    let top: number;
    let placement: PopupPlacement;
    if (spaceAbove >= ph || spaceAbove > spaceBelow) {
      top = anchor.top - ph - padding;
      placement = 'above';
    } else {
      top = anchor.bottom + padding;
      placement = 'below';
    }
    top = Math.max(padding, Math.min(vh - ph - padding, top));

    let left: number;
    const effectiveWidth = anchor.width ?? el.offsetWidth;
    if (anchor.left !== undefined) {
      left = Math.max(padding, Math.min(vw - effectiveWidth - padding, anchor.left));
    } else {
      left = anchor.x - effectiveWidth / 2;
      left = Math.max(padding, Math.min(vw - effectiveWidth - padding, left));
    }

    const widthStyle: CSSProperties = anchor.width !== undefined ? { width: anchor.width } : {};
    setResult({
      style: { position: 'fixed', left, top, visibility: 'visible', ...widthStyle },
      placement,
    });
  }, [anchor, popupRef, padding]);

  return result;
}

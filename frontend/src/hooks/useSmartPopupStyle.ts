import { useState, useLayoutEffect, type RefObject, type CSSProperties } from 'react';

// `dockSide` switches the popup to side mode: it docks to the left of that x
// coordinate (the panel edge), vertically centred on the anchor's button box.
export type PopupAnchor = { x: number; top: number; bottom: number; left?: number; width?: number; dockSide?: number };
export type PopupPlacement = 'above' | 'below' | 'left';

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
    // Side mode is derived synchronously during render (no measurement needed); skip it here.
    if (anchor?.dockSide !== undefined) return;
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

  // Side mode mirrors the panel box (same width/height) flush to its left edge.
  // Its width comes from the anchor, so no DOM measurement is needed — computing it
  // during render lets the first render already report 'left', so the slide-in starts
  // from the correct placement instead of racing through a one-frame 'above'.
  //
  // top:50% + translateY(-50%) (the latter via the popup's Motion `y`) reproduces the
  // panel's own centring exactly, so both round subpixel positions to the same device
  // pixel and the top edges stay flush. The panel (the only side-mode anchor) is always
  // vertically centred, so this holds.
  if (anchor?.dockSide !== undefined) {
    const width = anchor.width ?? 0;
    return {
      style: {
        position: 'fixed',
        left: anchor.dockSide - width,
        top: '50%',
        width,
        height: anchor.bottom - anchor.top,
        visibility: 'visible',
      },
      placement: 'left',
    };
  }

  return result;
}

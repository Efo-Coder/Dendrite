import { useState, useLayoutEffect, type RefObject, type CSSProperties } from 'react';

// `dockSide` switches the popup to side mode: it docks to the left of that x
// coordinate (the panel edge), vertically centred on the anchor's button box.
export type PopupAnchor = { x: number; top: number; bottom: number; left?: number; width?: number; dockSide?: number };
export type PopupPlacement = 'above' | 'below' | 'left' | 'right';
// Caller-facing opening direction. 'top'/'bottom' open the popup above/below the anchor
// (centred on its x); 'left'/'right' open it beside the anchor box, top-aligned with it.
export type PopupDirection = 'top' | 'bottom' | 'left' | 'right';

export type SmartPopupOptions = {
  padding?: number;
  prefer?: PopupDirection;
  // true (default): flip to the opposite side when the preferred side lacks room and the
  // opposite side has more space. false: stay on the preferred side, only viewport-clamp.
  smart?: boolean;
};

const HIDDEN: CSSProperties = { position: 'fixed', visibility: 'hidden', left: 0, top: 0 };

// Picks the preferred side unless smart flipping is on and it neither fits nor has the
// most room. Mirrors the original above/below rule so existing callers are unaffected.
function pickSide(prefSpace: number, oppSpace: number, size: number, smart: boolean): boolean {
  if (!smart) return true;
  return prefSpace >= size || prefSpace > oppSpace;
}

export function useSmartPopupStyle(
  anchor: PopupAnchor | null,
  popupRef: RefObject<HTMLElement | null>,
  opts: number | SmartPopupOptions = 8,
): { style: CSSProperties; placement: PopupPlacement } {
  const { padding = 8, prefer = 'top', smart = true } =
    typeof opts === 'number' ? { padding: opts } : opts;

  const [result, setResult] = useState<{ style: CSSProperties; placement: PopupPlacement }>({
    style: HIDDEN,
    placement: 'above',
  });

  useLayoutEffect(() => {
    // Side mode is derived synchronously during render (no measurement needed); skip it here.
    if (anchor?.dockSide !== undefined) return;
    if (!anchor || !popupRef.current) {
      setResult({ style: HIDDEN, placement: 'above' });
      return;
    }

    const el = popupRef.current;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clamp = (v: number, size: number, max: number) => Math.max(padding, Math.min(max - size - padding, v));

    // Horizontal placement: open beside the anchor box, top-aligned. Width stays the
    // popup's own (anchor.width here only describes the anchor box, not the popup).
    if (prefer === 'left' || prefer === 'right') {
      const aLeft = anchor.left ?? anchor.x;
      const aRight = anchor.left !== undefined && anchor.width !== undefined ? anchor.left + anchor.width : anchor.x;
      const onRight = pickSide(
        prefer === 'right' ? vw - aRight - padding : aLeft - padding,
        prefer === 'right' ? aLeft - padding : vw - aRight - padding,
        pw,
        smart,
      ) === (prefer === 'right');
      const left = clamp(onRight ? aRight + padding : aLeft - pw - padding, pw, vw);
      const top = clamp(anchor.top, ph, vh);
      setResult({ style: { position: 'fixed', left, top, visibility: 'visible' }, placement: onRight ? 'right' : 'left' });
      return;
    }

    const spaceAbove = anchor.top - padding;
    const spaceBelow = vh - anchor.bottom - padding;
    const above = pickSide(
      prefer === 'top' ? spaceAbove : spaceBelow,
      prefer === 'top' ? spaceBelow : spaceAbove,
      ph,
      smart,
    ) === (prefer === 'top');
    const top = clamp(above ? anchor.top - ph - padding : anchor.bottom + padding, ph, vh);

    let left: number;
    const effectiveWidth = anchor.width ?? pw;
    if (anchor.left !== undefined) {
      left = clamp(anchor.left, effectiveWidth, vw);
    } else {
      left = clamp(anchor.x - effectiveWidth / 2, effectiveWidth, vw);
    }

    const widthStyle: CSSProperties = anchor.width !== undefined ? { width: anchor.width } : {};
    setResult({
      style: { position: 'fixed', left, top, visibility: 'visible', ...widthStyle },
      placement: above ? 'above' : 'below',
    });
  }, [anchor, popupRef, padding, prefer, smart]);

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

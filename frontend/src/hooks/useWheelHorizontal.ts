import { useEffect, useState } from 'react';

// Turns vertical mouse-wheel into horizontal scroll on a card row, with edge-release:
// at the row's start/end the wheel event is left to bubble so the page (Lenis) keeps
// scrolling vertically. Stopping propagation while in-range is what hides the event
// from Lenis on .home-main. Movement is eased to match the page's smooth feel.
// Callback ref so it still binds when the row mounts after its section's data loads.
const EASE = 0.18;
const EDGE = 1; // px tolerance for "at the start/end" (edge-release, checked vs target)
const FADE = 44; // px of edge fade applied toward an overflowing side
const FADE_EDGE = 4; // slack (row padding + sub-pixel) before an edge counts as "reached"

export function useWheelHorizontal() {
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!el) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let target = el.scrollLeft;
    let raf = 0;

    // Both fades show only in a middle scroll position; at either end (start OR end)
    // both clear. Measured from the real rendered edges of the first/last card
    // (getBoundingClientRect is sub-pixel and DPR-proof, unlike scrollWidth-clientWidth
    // which overshoots at fractional DPR).
    const updateFade = () => {
      const first = el.firstElementChild;
      const last = el.lastElementChild;
      const box = el.getBoundingClientRect();
      const startHidden = !!first && box.left - first.getBoundingClientRect().left > FADE_EDGE;
      const endHidden = !!last && last.getBoundingClientRect().right - box.right > FADE_EDGE;
      const show = startHidden && endHidden ? `${FADE}px` : '0px';
      el.style.setProperty('--fade-start', show);
      el.style.setProperty('--fade-end', show);
    };
    updateFade();
    el.addEventListener('scroll', updateFade, { passive: true });
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);

    const tick = () => {
      const diff = target - el.scrollLeft;
      if (Math.abs(diff) < 0.5) {
        el.scrollLeft = target;
        raf = 0;
        return;
      }
      el.scrollLeft += diff * EASE;
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      // Leave real horizontal gestures (trackpads) to native scrolling.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      // Only hijack the wheel over the cards themselves — the row's bottom padding
      // (hover-lift room) sits below them and must not capture horizontal scroll.
      const card = el.firstElementChild;
      if (card) {
        const r = card.getBoundingClientRect();
        if (e.clientY < r.top || e.clientY > r.bottom) return;
      }
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return; // nothing to scroll → let the page take it
      const dir = e.deltaY;
      // Edge-release against the in-flight target (not the lagging scrollLeft), so the
      // page resumes vertical scrolling the moment the intended position hits an end.
      const current = raf ? target : el.scrollLeft;
      if ((dir < 0 && current <= EDGE) || (dir > 0 && current >= max - EDGE)) return;
      e.preventDefault();
      e.stopPropagation();
      if (!smooth) {
        el.scrollLeft += dir;
        return;
      }
      target = Math.max(0, Math.min(max, current + dir));
      if (!raf) raf = requestAnimationFrame(tick);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', updateFade);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [el]);

  return setEl;
}

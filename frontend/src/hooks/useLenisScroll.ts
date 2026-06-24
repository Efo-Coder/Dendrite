import { useLayoutEffect, type RefObject, type MutableRefObject } from 'react';
import Lenis from 'lenis';
import { getScroll, setScroll, isInitialLoad } from '../lib/viewState';

// Same feel as the landing page's SmoothScroll, but bound to an internal scroll
// container instead of the window.
const LENIS_OPTIONS = {
  duration: 1.6,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical' as const,
  gestureOrientation: 'vertical' as const,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
};

// Drive Lenis smooth-scroll on a wrapper element (overflow container) and its content
// child. With a memoryKey the scroll position is saved per view and — only for the
// first view after a page reload (isInitialLoad) — restored synchronously before paint.
// Because lists are hydrated from cache, the layout is already final at this point, so
// the restore is exact with no flash; Lenis then initialises at the restored position.
export function useLenisScroll(
  wrapper: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
  memoryKey?: string,
  // Exposes the live Lenis instance so callers can drive programmatic smooth
  // scrolls (e.g. table-of-contents jumps) instead of fighting the RAF loop with
  // a native scrollIntoView. Null while reduced-motion is on (no Lenis exists).
  lenisRef?: MutableRefObject<Lenis | null>,
) {
  useLayoutEffect(() => {
    const w = wrapper.current;
    const c = content.current;
    if (!w || !c) return;

    if (memoryKey && isInitialLoad()) {
      const saved = getScroll(memoryKey);
      if (saved > 0) {
        const max = w.scrollHeight - w.clientHeight;
        w.scrollTop = Math.min(saved, Math.max(0, max));
      }
    }

    let lenis: Lenis | null = null;
    let raf = 0;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lenis = new Lenis({ wrapper: w, content: c, ...LENIS_OPTIONS });
      const loop = (time: number) => {
        lenis!.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    if (lenisRef) lenisRef.current = lenis;

    let onScroll: (() => void) | undefined;
    if (memoryKey) {
      onScroll = () => setScroll(memoryKey, w.scrollTop);
      w.addEventListener('scroll', onScroll, { passive: true });
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (onScroll) w.removeEventListener('scroll', onScroll);
      lenis?.destroy();
      if (lenisRef) lenisRef.current = null;
    };
  }, [wrapper, content, memoryKey, lenisRef]);
}

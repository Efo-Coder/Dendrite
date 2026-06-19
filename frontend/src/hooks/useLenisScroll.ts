import { useEffect, type RefObject } from 'react';
import Lenis from 'lenis';

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

// Drive Lenis smooth-scroll on a wrapper element (overflow container) and its
// content child. No-op under prefers-reduced-motion.
export function useLenisScroll(
  wrapper: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const w = wrapper.current;
    const c = content.current;
    if (!w || !c) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ wrapper: w, content: c, ...LENIS_OPTIONS });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [wrapper, content]);
}

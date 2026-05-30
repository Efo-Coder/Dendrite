"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const LENIS_OPTIONS = {
  duration: 1.6,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical" as const,
  gestureOrientation: "vertical" as const,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
};

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let lenis: Lenis;
    let tickerFn: (time: number) => void;
    let raf1: number;
    let raf2: number;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        lenis = new Lenis(LENIS_OPTIONS);
        lenis.on("scroll", ScrollTrigger.update);
        tickerFn = (time: number) => { lenis.raf(time * 1000); };
        gsap.ticker.add(tickerFn);
        gsap.ticker.lagSmoothing(0);
      });
    });

    function handleAnchorClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      e.preventDefault();

      if (!lenis) return;
      if (href === "#") {
        lenis.scrollTo(0, { offset: 0 });
        return;
      }
      if (href === "#contact") {
        lenis.scrollTo("bottom", { offset: 0 });
        return;
      }
      const element = document.querySelector(href);
      if (element) lenis.scrollTo(element as HTMLElement, { offset: -100 });
    }

    document.addEventListener("click", handleAnchorClick);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (tickerFn) gsap.ticker.remove(tickerFn);
      if (lenis) {
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
      }
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  return <>{children}</>;
}

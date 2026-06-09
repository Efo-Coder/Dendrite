"use client";

import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
  AnimatePresence,
} from "motion/react";
import { WaterRipple } from "./WaterRipple";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function BlobCursor({ isVisible }: { isVisible: boolean }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 30, stiffness: 400, mass: 0.2 });
  const smoothY = useSpring(mouseY, { damping: 30, stiffness: 400, mass: 0.2 });
  const velocityX = useVelocity(smoothX);
  const velocityY = useVelocity(smoothY);

  const speed = useTransform(() => Math.sqrt(velocityX.get() ** 2 + velocityY.get() ** 2));
  const scaleAlongMotion = useTransform(speed, [0, 800, 2000], [1, 1.3, 1.6]);
  const scalePerp = useTransform(speed, [0, 800, 2000], [1, 0.8, 0.65]);
  const rotate = useTransform(() => Math.atan2(velocityY.get(), velocityX.get()) * (180 / Math.PI));

  useEffect(() => {
    let rafId: number | null = null;
    let lastX = 0, lastY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          mouseX.set(lastX);
          mouseY.set(lastY);
          rafId = null;
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [mouseX, mouseY]);

  return createPortal(
    <motion.div
      className="pointer-events-none fixed z-4 flex items-center justify-center"
      style={{ left: smoothX, top: smoothY, x: "-50%", y: "-50%" }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.3 }, scale: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } }}
    >
      <motion.div style={{ rotate }}>
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ scaleX: scaleAlongMotion, scaleY: scalePerp, background: 'var(--ink)' }}
        >
          <motion.span
            className="text-sm font-medium uppercase tracking-wide"
            style={{
              rotate: useTransform(rotate, (r) => -r),
              scaleX: useTransform(scaleAlongMotion, (s) => 1 / s),
              scaleY: useTransform(scalePerp, (s) => 1 / s),
              color: 'var(--bg)',
            }}
          >
            Open
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function useElementWidth<T extends HTMLElement>(ref: React.RefObject<T | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const updateWidth = () => ref.current && setWidth(ref.current.offsetWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [ref]);
  return width;
}

function VelocityText({ children, baseVelocity = 100, className = "" }: { children: React.ReactNode; baseVelocity?: number; className?: string }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false });
  const copyRef = useRef<HTMLSpanElement>(null);
  const copyWidth = useElementWidth(copyRef);

  const wrap = (min: number, max: number, v: number) => {
    const range = max - min;
    return ((((v - min) % range) + range) % range) + min;
  };

  const x = useTransform(baseX, (v) => (copyWidth === 0 ? "0px" : `${wrap(-copyWidth, 0, v)}px`));
  const directionFactor = useRef(1);

  useAnimationFrame((_, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) directionFactor.current = -1;
    else if (velocityFactor.get() > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="relative overflow-hidden w-full">
      <motion.div className="flex whitespace-nowrap" style={{ x }}>
        {Array.from({ length: 6 }, (_, i) => (
          <span className={`shrink-0 ${className}`} key={i} ref={i === 0 ? copyRef : null}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

interface Feature {
  id: string;
  titleUp: string;
  titleDown: string;
  image: string;
  description: string;
  zoom?: number;
  offset?: [number, number];
}

const features: Feature[] = [
  {
    id: "1",
    titleUp: "Rich",
    titleDown: "Editing",
    image: "/img/branding/notebook.webp",
    zoom: 0.75,
    offset: [0.13, -0.1],
    description: "Write the way you think — bold, flowing, structured, or raw. The editor bends to your style, not the other way around.",
  },
  {
    id: "2",
    titleUp: "Smart",
    titleDown: "Organization",
    image: "/img/branding/mood.webp",
    offset: [0.13, -0.1],
    description: "The more you write, the more you need structure. Dendrite keeps every note findable before it becomes noise.",
  },
  {
    id: "3",
    titleUp: "Calm",
    titleDown: "by Design",
    image: "/img/branding/calm.webp",
    description: "A writing space that feels as good as the words you put into it. Every detail is considered so your mind doesn't have to be.",
  },
];

function FeatureOverlay({ feature, onClose }: { feature: Feature | null; onClose: () => void }) {
  useEffect(() => {
    if (!feature) return;
    const y = window.scrollY;
    document.documentElement.style.overflowY = "scroll";
    Object.assign(document.body.style, { position: "fixed", top: `-${y}px`, width: "100%" });
    return () => {
      document.documentElement.style.overflowY = "";
      Object.assign(document.body.style, { position: "", top: "", width: "" });
      window.scrollTo(0, y);
    };
  }, [feature]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      {feature && (
        <motion.div
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: 9999 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            exit={{ scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={feature.image}
              alt={`${feature.titleUp} ${feature.titleDown}`}
              className="h-full w-full object-fill"
            />
            <div className="absolute inset-0 bg-black/40" />
          </motion.div>

          <motion.div
            className="absolute left-4 top-4 z-1 sm:left-6 sm:top-6 md:left-12 md:top-12 lg:left-16 lg:top-16"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-[clamp(2rem,8vw,6rem)] font-medium leading-[0.95] tracking-tight text-white">
              <span className="block">{feature.titleUp}</span>
              <span className="block font-serif italic">{feature.titleDown}</span>
            </h2>
          </motion.div>

          <motion.div
            className="absolute right-4 top-4 z-2 sm:right-6 sm:top-6 md:right-12 md:top-12 lg:right-16 lg:top-16"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <button
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-110 active:scale-95 md:h-14 md:w-14"
              aria-label="Close overlay"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function FeatureItem({ feature, index, onHover, onClick }: { feature: Feature; index: number; onHover: (h: boolean) => void; onClick: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const maskRadiusRef = useRef(0);
  const isEven = index % 2 === 0;

  const xTo = useRef<gsap.QuickToFunc | null>(null);
  const yTo = useRef<gsap.QuickToFunc | null>(null);
  const scaleTo = useRef<gsap.QuickToFunc | null>(null);
  const inEllipseRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasWrapperRef.current) return;
    xTo.current = gsap.quickTo(canvasWrapperRef.current, "x", { duration: 0.8, ease: "power3.out" });
    yTo.current = gsap.quickTo(canvasWrapperRef.current, "y", { duration: 0.8, ease: "power3.out" });
    scaleTo.current = gsap.quickTo(canvasWrapperRef.current, "scale", { duration: 0.6, ease: "power2.out" });
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { lastMousePos.current = { x: e.clientX, y: e.clientY }; };
    const onScroll = () => {
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = lastMousePos.current.x - rect.left - rect.width / 2;
      const dy = lastMousePos.current.y - rect.top - rect.height / 2;
      const stillInEllipse = (dx / (rect.width / 2)) ** 2 + (dy / (rect.height / 2)) ** 2 <= 1;
      if (!stillInEllipse && inEllipseRef.current) {
        inEllipseRef.current = false;
        onHover(false);
        imageContainerRef.current?.classList.remove('feature-image-area');
        xTo.current?.(0);
        yTo.current?.(0);
        scaleTo.current?.(1.15);
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, [onHover]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    const inEllipse = (dx / (rect.width / 2)) ** 2 + (dy / (rect.height / 2)) ** 2 <= 1;

    if (inEllipse !== inEllipseRef.current) {
      inEllipseRef.current = inEllipse;
      onHover(inEllipse);
      imageContainerRef.current?.classList.toggle('feature-image-area', inEllipse);
      if (inEllipse) {
        scaleTo.current?.(1.22);
      } else {
        xTo.current?.(0);
        yTo.current?.(0);
        scaleTo.current?.(1.15);
      }
    }

    if (inEllipse && xTo.current && yTo.current) {
      xTo.current(-dx / rect.width * 30);
      yTo.current(-dy / rect.height * 30);
    }
  };

  const handleMouseEnter = () => {};
  const handleMouseLeave = () => {
    if (inEllipseRef.current) {
      inEllipseRef.current = false;
      onHover(false);
      imageContainerRef.current?.classList.remove('feature-image-area');
    }
    xTo.current?.(0);
    yTo.current?.(0);
    scaleTo.current?.(1.15);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const title = titleRef.current, desc = descRef.current;
    gsap.set(title, { y: 60, opacity: 0 });
    gsap.set(desc, { y: 40, opacity: 0 });

    const maskTl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
        end: "top -20%",
        scrub: 1.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => { maskRadiusRef.current = self.progress * 1200; },
        onLeaveBack: () => { maskRadiusRef.current = 0; },
      },
    });
    maskTl.to({}, { duration: 1 });

    const textTl = gsap.timeline({
      scrollTrigger: { trigger: containerRef.current, start: "top 50%", toggleActions: "play none none reverse" },
    });
    textTl
      .to(title, { y: 0, opacity: 1, duration: 1, ease: "power3.out" })
      .to(desc, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.6");

    return () => { maskTl.kill(); textTl.kill(); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="group py-16 md:py-24"
    >
      <div className="mx-auto max-w-360 px-6 sm:px-12 lg:px-24">
        <div className={`flex flex-col gap-8 ${isEven ? "md:flex-row" : "md:flex-row-reverse"} md:items-center md:gap-16`}>
          <div
            ref={imageContainerRef}
            className="relative aspect-4/3 w-full overflow-hidden rounded-full md:w-3/5 cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => { if (inEllipseRef.current) onClick(); }}
          >
            <div
              ref={canvasWrapperRef}
              className="absolute inset-0 w-full h-full"
              style={{ willChange: "transform", transformStyle: "preserve-3d", backfaceVisibility: "hidden", transform: "scale(1.15)" }}
            >
              <WaterRipple src={feature.image} maskRadiusRef={maskRadiusRef} zoom={feature.zoom ?? 1.0} offset={feature.offset} />
            </div>
          </div>

          <div className={`flex flex-col md:w-2/5 ${isEven ? "" : "md:text-right"}`}>
            <span className="text-base font-medium uppercase tracking-widest text-muted-foreground mb-6">
              0{index + 1}
            </span>
            <h3 ref={titleRef} className="text-[clamp(2.5rem,6vw,6rem)] leading-[1.05] tracking-tight text-foreground mb-8">
              <span className="font-medium">{feature.titleUp}</span><br />
              <span className="font-serif italic">{feature.titleDown}</span>
            </h3>
            <p ref={descRef} className={`text-muted-foreground text-xl leading-relaxed ${isEven ? "max-w-lg" : "max-w-lg md:ml-auto"}`}>
              {feature.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);


  const handleFeatureClick = (feature: Feature) => {
    setIsCursorVisible(false);
    setSelectedFeature(feature);
  };

  const handleClose = () => setSelectedFeature(null);

  return (
    <section id="features" className="features bg-background relative py-24">
      <BlobCursor isVisible={isCursorVisible} />
      <FeatureOverlay feature={selectedFeature} onClose={handleClose} />

      <div className="pb-16">
        <VelocityText baseVelocity={80} className="text-[clamp(2.5rem,10vw,14rem)] font-medium italic tracking-tight text-foreground uppercase px-8">
          Selected <span className="font-serif font-thin">Features</span>&nbsp;
        </VelocityText>
      </div>

      <div className="flex flex-col">
        {features.map((feature, index) => (
          <FeatureItem
            key={feature.id}
            feature={feature}
            index={index}
            onHover={setIsCursorVisible}
            onClick={() => handleFeatureClick(feature)}
          />
        ))}
      </div>
    </section>
  );
}

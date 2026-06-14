"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  motion,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
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
    zoom: 1.25,
    offset: [0.06, -0.11],
    description: "Write the way you think — bold, flowing, structured, or raw. The editor bends to your style, not the other way around.",
  },
  {
    id: "2",
    titleUp: "Smart",
    titleDown: "Organization",
    image: "/img/branding/mood.webp",    description: "The more you write, the more you need structure. Dendrite keeps every note findable before it becomes noise.",
  },
  {
    id: "3",
    titleUp: "Calm",
    titleDown: "by Design",
    image: "/img/branding/calm.webp",    description: "A writing space that feels as good as the words you put into it. Every detail is considered so your mind doesn't have to be.",
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const maskRadiusRef = useRef(0);
  const isEven = index % 2 === 0;

  const parallaxRef = useRef({ x: 0, y: 0 });
  const inEllipseRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

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
        parallaxRef.current = { x: 0, y: 0 };
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
      if (!inEllipse) parallaxRef.current = { x: 0, y: 0 };
    }

    if (inEllipse) {
      parallaxRef.current = { x: -dx / rect.width * 0.035, y: -dy / rect.height * 0.035 };
    }
  };

  const handleMouseEnter = () => {};
  const handleMouseLeave = () => {
    if (inEllipseRef.current) {
      inEllipseRef.current = false;
      onHover(false);
      imageContainerRef.current?.classList.remove('feature-image-area');
    }
    parallaxRef.current = { x: 0, y: 0 };
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
      <div className="px-[clamp(24px,6vw,120px)]">
        <div className={`flex flex-col gap-8 ${isEven ? "md:flex-row" : "md:flex-row-reverse"} md:items-center md:gap-16`}>
          <div
            ref={imageContainerRef}
            className="relative aspect-4/3 w-full overflow-hidden rounded-full md:w-auto md:grow md:basis-90 cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => { if (inEllipseRef.current) onClick(); }}
          >
            <WaterRipple src={feature.image} maskRadiusRef={maskRadiusRef} parallaxRef={parallaxRef} zoom={feature.zoom ?? 1.05} offset={feature.offset} />
          </div>

          <div className={`flex flex-col md:grow md:basis-80 ${isEven ? "" : "md:text-right"}`}>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--ink-dim)',
              }}
            >
              0{index + 1}
            </span>
            <h3
              ref={titleRef}
              style={{
                fontFamily: 'var(--serif-display)',
                fontSize: 'clamp(2.2rem, 4.5vw, 4rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                margin: '18px 0 22px',
              }}
            >
              <span style={{ fontWeight: 500 }}>{feature.titleUp}</span><br />
              <span style={{ fontStyle: 'italic', fontWeight: 300 }}>{feature.titleDown}</span>
            </h3>
            <p
              ref={descRef}
              style={{
                fontFamily: 'var(--serif-body)',
                fontSize: 'clamp(16px, 1.4vw, 20px)',
                lineHeight: 1.55,
                color: 'var(--ink-mid)',
                maxWidth: '34ch',
                marginLeft: isEven ? 0 : 'auto',
              }}
            >
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

      <div className="px-[clamp(24px,6vw,120px)] pb-16">
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            margin: '0 0 14px',
          }}
        >
          Selected Features
        </p>
        <h2
          style={{
            fontFamily: 'var(--serif-display)',
            fontWeight: 300,
            fontSize: 'clamp(2.2rem, 5vw, 4.5rem)',
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          Made to be{' '}
          <em
            style={{
              background: 'linear-gradient(120deg, var(--accent-hi), var(--accent-deep))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            lived in.
          </em>
        </h2>
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

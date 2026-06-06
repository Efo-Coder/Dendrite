"use client";

import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useSettingsStore } from '../../store/useSettingsStore';
import ForestHeroBackground from './ForestHeroBackground';

// Einzige Konstante — steuert Dauer und Zoomgeschwindigkeit automatisch
const HERO_HEIGHT_VH = 300;
// scrollYProgress-Wert bei dem das Sticky endet (= end of visible canvas)
const STICKY_END = (HERO_HEIGHT_VH - 100) / HERO_HEIGHT_VH;

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollProgress = useRef(0);
  const { themeMode } = useSettingsStore();
  const isDark = themeMode === 'dark';
  const [canvasReady, setCanvasReady] = useState(false);

  // Fallback: Animationen starten spätestens nach 2s falls Canvas nicht lädt
  useEffect(() => {
    const t = setTimeout(() => setCanvasReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Normalisiert: Shader bekommt immer 0→1, Endzoom bleibt konstant
  const normalized = useTransform(scrollYProgress, [0, STICKY_END], [0, 1]);

  const textOpacity = useTransform(normalized, [0, 0.25], [1, 0]);
  const textY = useTransform(normalized, [0, 0.25], [0, -50]);
  const hintOpacity = useTransform(normalized, [0, 0.12], [1, 0]);

  useEffect(() => {
    return normalized.on('change', (v) => {
      scrollProgress.current = Math.min(v, 1);
    });
  }, [normalized]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      style={{ height: `${HERO_HEIGHT_VH}vh`, position: 'relative' }}
    >
      {/* Sticky viewport */}
      <div style={{ position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden' }}>

        <ForestHeroBackground isDark={isDark} scrollRef={scrollProgress} onReady={() => setCanvasReady(true)} />

        {/* Permanente CSS-Vignette — sichtbar bevor Canvas lädt */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.52) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Subtle dark overlay for text legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.20)',
            pointerEvents: 'none',
          }}
        />

        {/* Centered text + CTAs */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: 'clamp(40px, 6vw, 80px) clamp(24px, 5vw, 80px)',
            opacity: textOpacity,
            y: textY,
          }}
        >
          {/* Title — line reveal */}
          <div style={{ overflow: 'hidden', paddingBottom: '0.06em' }}>
            <motion.h1
              initial={{ y: '105%' }}
              animate={canvasReady ? { y: 0 } : { y: '105%' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'var(--serif-display)',
                fontSize: 'clamp(4.5rem, 11vw, 11rem)',
                fontWeight: 300,
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.95)',
                lineHeight: 1.0,
                letterSpacing: '-0.02em',
                margin: 0,
                textShadow: '0 2px 48px rgba(0,0,0,0.35)',
              }}
            >
              Dendrite
            </motion.h1>
          </div>

          {/* Subtitle — line reveal */}
          <div style={{ overflow: 'hidden', paddingBottom: '0.1em', marginTop: '16px', marginBottom: '48px' }}>
            <motion.p
              initial={{ y: '110%' }}
              animate={canvasReady ? { y: 0 } : { y: '110%' }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 'clamp(9px, 1.1vw, 12px)',
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
                margin: 0,
              }}
            >
              A Notebook
            </motion.p>
          </div>

          {/* CTAs */}
          <motion.div
            className="flex flex-wrap gap-3 justify-center"
            initial={{ opacity: 0, y: 16 }}
            animate={canvasReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.25, 1, 0.5, 1] }}
          >
            <a
              href="/register"
              className="btn primary"
              style={{ padding: '11px 24px', borderRadius: '10px', fontSize: '15px' }}
            >
              Start for free
            </a>
            <a
              href="#features"
              style={{
                padding: '11px 24px',
                fontSize: '15px',
                borderRadius: '10px',
                fontFamily: 'var(--serif-body)',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.85)',
                border: '0.5px solid rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
                background: 'rgba(255,255,255,0.08)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Explore features
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: '28px',
            right: 'clamp(24px, 5vw, 80px)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            opacity: hintOpacity,
          }}
        >
          <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            initial={{ opacity: 0 }}
            animate={canvasReady ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: '9px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
            }}>
              Scroll
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <motion.svg
                width="12" height="12" viewBox="0 0 14 14" fill="none"
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <path
                  d="M2 4.5L7 9.5L12 4.5"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}

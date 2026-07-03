"use client";

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import DendriteHeroBackground from './DendriteHeroBackground';
import { HeroEditorMock } from './HeroEditorMock';

const EASE = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  // Start the choreography only after the fonts are in (H1 reveal must not run
  // with the fallback font; timeout as CDN fallback) — and then wait one painted
  // frame (double rAF): the font swap relayouts the entire page (~200ms), and
  // starting inside that frame makes the intro stutter visibly.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    const timeout = new Promise<void>(resolve => setTimeout(resolve, 1500));
    Promise.race([document.fonts.ready, timeout]).then(() => {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <DendriteHeroBackground ready={ready} />

      {/* Headline + Subline + CTAs */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: 'clamp(110px, 16vh, 170px) clamp(24px, 5vw, 80px) clamp(28px, 5vh, 56px)',
        }}
      >
        <div style={{ overflow: 'hidden', paddingBottom: '0.08em' }}>
          <motion.h1
            initial={{ y: '105%' }}
            animate={ready ? { y: 0 } : { y: '105%' }}
            transition={{ duration: 1.1, ease: EASE }}
            style={{
              fontFamily: 'var(--serif-display)',
              fontSize: 'clamp(2.9rem, 7vw, 6.5rem)',
              fontWeight: 300,
              fontStyle: 'italic',
              color: 'var(--ink)',
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Write what endures<span style={{ color: 'var(--accent)' }}>.</span>
          </motion.h1>
        </div>

        <div style={{ overflow: 'hidden', paddingBottom: '0.15em', marginTop: '20px' }}>
          <motion.p
            initial={{ y: '110%' }}
            animate={ready ? { y: 0 } : { y: '110%' }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.18 }}
            style={{
              fontFamily: 'var(--serif-body)',
              fontSize: 'clamp(16px, 1.6vw, 19px)',
              lineHeight: 1.5,
              color: 'var(--ink-mid)',
              maxWidth: '46ch',
              margin: 0,
            }}
          >
            Dendrite is a calm, fast notebook for notes, journals, and ideas —
            a quiet place for the thoughts you want to keep.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.45 }}
          className="flex flex-wrap gap-3 justify-center"
          style={{ marginTop: '36px' }}
        >
          <Link
            to="/register"
            className="btn primary"
            style={{ padding: '11px 26px', borderRadius: '10px', fontSize: '15px' }}
          >
            Start writing — free
          </Link>
          <a
            href="#features"
            className="btn-ghost-cta"
            style={{
              padding: '11px 26px',
              fontSize: '15px',
              borderRadius: '10px',
              fontFamily: 'var(--serif-body)',
              fontWeight: 500,
              border: '0.5px solid var(--line)',
              background: 'transparent',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Explore features
          </a>
        </motion.div>
      </div>

      {/* Editor-Mock — ragt unten aus dem Viewport, die Section schneidet ihn ab */}
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.6 }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(960px, 92vw)',
          margin: '0 auto',
          height: 'clamp(200px, 30vh, 340px)',
        }}
      >
        <HeroEditorMock />
      </motion.div>
    </section>
  );
}

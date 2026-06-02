"use client";

import { motion } from "motion/react";
import { BetaBanner } from "./BetaBanner";

function DashboardMockup() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '0.5px solid var(--line)',
        boxShadow: '0 32px 80px -16px rgba(0,0,0,.70), 0 4px 16px rgba(0,0,0,.40)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        userSelect: 'none',
      }}
    >
      {/* Titlebar */}
      <div className="app-titlebar" style={{ flexShrink: 0 }}>
        <div className="app-titlebar-title">
          Dendrite <span className="brand-mark">·</span> a notebook
        </div>
      </div>

      {/* Three-column layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{
          width: '164px',
          flexShrink: 0,
          background: 'var(--bg)',
          borderRight: '0.5px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 0 0',
          overflow: 'hidden',
        }}>
          {/* Brand row */}
          <div style={{
            padding: '0 14px 10px',
            marginBottom: '8px',
            borderBottom: '0.5px solid var(--line-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
          }}>
            <img src="/Dendrite-Logo-New-svg.svg" alt="" style={{ width: '18px', height: '18px' }} />
            <span style={{ fontFamily: 'var(--serif-display)', fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>
              Dendrite
            </span>
          </div>

          {/* Nav items */}
          {[
            { label: 'All Notes', active: true },
            { label: 'Favorites', active: false },
            { label: 'Archive', active: false },
          ].map(({ label, active }) => (
            <div
              key={label}
              style={{
                margin: '1px 8px',
                padding: '5px 10px',
                borderRadius: '6px',
                fontFamily: 'var(--serif-body)',
                fontSize: '12px',
                color: active ? 'var(--ink)' : 'var(--ink-mid)',
                background: active ? 'color-mix(in oklch, var(--accent) 13%, transparent)' : 'transparent',
                position: 'relative',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: '-8px', top: '50%',
                  transform: 'translateY(-50%)',
                  width: '2.5px', height: '12px',
                  background: 'var(--accent)', borderRadius: '0 2px 2px 0',
                }} />
              )}
              {label}
            </div>
          ))}

          <div style={{ padding: '10px 14px 4px' }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '8px', letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--ink-dim)',
              borderTop: '0.5px solid var(--line-soft)', paddingTop: '10px', marginBottom: '6px',
            }}>
              Folders
            </div>
            {['Journal', 'Ideas', 'Work'].map(f => (
              <div key={f} style={{
                padding: '4px 6px', borderRadius: '5px',
                fontFamily: 'var(--serif-body)', fontSize: '11.5px',
                color: 'var(--ink-mid)', marginBottom: '1px',
              }}>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Note list */}
        <div style={{
          width: '200px',
          flexShrink: 0,
          background: 'color-mix(in oklch, var(--bg) 96%, black 2%)',
          borderRight: '0.5px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '0.5px solid var(--line-soft)' }}>
            <div style={{ fontFamily: 'var(--serif-display)', fontSize: '16px', fontWeight: 500, color: 'var(--ink)' }}>
              All Notes
            </div>
          </div>
          <div style={{ padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { title: 'Morning Pages', preview: 'The quiet before the day begins…', active: true },
              { title: 'Ideas for 2025', preview: 'Things worth building next year…', active: false },
              { title: 'Meeting Notes', preview: 'Q1 strategy discussion points…', active: false },
            ].map(({ title, preview, active }) => (
              <div
                key={title}
                style={{
                  padding: '8px 9px',
                  borderRadius: '7px',
                  background: active ? 'var(--surface-hi)' : 'transparent',
                  border: `0.5px solid ${active ? 'color-mix(in oklch, var(--accent) 25%, transparent)' : 'transparent'}`,
                }}
              >
                <div style={{
                  fontFamily: 'var(--serif-display)', fontSize: '12px',
                  fontWeight: 500,
                  color: active ? 'var(--accent-hi)' : 'var(--ink)',
                  marginBottom: '3px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {title}
                </div>
                <div style={{
                  fontFamily: 'var(--serif-body)', fontSize: '11px',
                  color: 'var(--ink-low)', fontStyle: 'italic',
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {preview}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, background: 'var(--bg)', padding: '20px 24px', overflow: 'hidden' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '8px', letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: '16px',
          }}>
            Journal · <span style={{ color: 'var(--accent)' }}>Morning Pages</span>
          </div>
          <div style={{
            fontFamily: 'var(--serif-display)', fontSize: '22px',
            fontWeight: 500, letterSpacing: '-0.015em',
            color: 'var(--ink)', lineHeight: 1.15, marginBottom: '14px',
          }}>
            Morning Pages
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{
              margin: 0, fontFamily: 'var(--serif-body)', fontSize: '12.5px',
              lineHeight: 1.65, color: 'var(--ink-mid)',
            }}>
              The quiet before the day begins has always felt sacred. There is something about the stillness of early morning that lets thoughts surface without noise crowding them out.
            </p>
            <p style={{
              margin: 0, fontFamily: 'var(--serif-body)', fontSize: '12.5px',
              lineHeight: 1.65, color: 'var(--ink-mid)',
            }}>
              I've been writing these pages for three years now, and I still notice how much they reveal — ideas I didn't know I had, worries I hadn't fully acknowledged.
            </p>
          </div>
          <div style={{
            marginTop: '20px', width: '55%', height: '1px',
            background: 'color-mix(in oklch, var(--accent) 30%, var(--line))',
          }} />
          <div style={{
            marginTop: '12px', fontFamily: 'var(--serif-body)', fontSize: '12px',
            color: 'var(--ink-dim)', fontStyle: 'italic',
          }}>
            Continue writing…
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden flex items-center"
      style={{ minHeight: '100dvh', background: 'var(--bg)' }}
    >
      <BetaBanner />

      {/* Ambient radial glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(900px 700px at 80% 20%, color-mix(in oklch, var(--accent) 7%, transparent), transparent 65%)',
            'radial-gradient(600px 500px at 10% 80%, color-mix(in oklch, var(--accent) 5%, transparent), transparent 65%)',
          ].join(', '),
        }}
      />

      {/* Content */}
      <div
        className="relative w-full"
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: 'clamp(120px, calc(14vh + 36px), 180px) clamp(16px, 5vw, 80px) clamp(60px, 10vh, 100px)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center" style={{ gap: 'clamp(40px, 7vw, 100px)' }}>

          {/* Left: editorial text */}
          <div className="lg:col-span-1">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                margin: '0 0 28px',
              }}
            >
              Dendrite · a notebook
            </motion.p>

            <h1 style={{ margin: 0 }}>
              <span className="block overflow-hidden" style={{ paddingBottom: '0.05em' }}>
                <motion.span
                  className="block"
                  initial={{ y: '110%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  style={{
                    fontFamily: 'var(--serif-display)',
                    fontSize: 'clamp(2.8rem, 6.5vw, 6.5rem)',
                    fontWeight: 300,
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    display: 'block',
                  }}
                >
                  Write what
                </motion.span>
              </span>
              <span className="block overflow-hidden" style={{ paddingBottom: '0.05em' }}>
                <motion.span
                  className="block"
                  initial={{ y: '110%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                  style={{
                    fontFamily: 'var(--serif-display)',
                    fontSize: 'clamp(2.8rem, 6.5vw, 6.5rem)',
                    fontWeight: 300,
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    display: 'block',
                  }}
                >
                  endures.
                </motion.span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.7, ease: [0.25, 1, 0.5, 1] }}
              style={{
                fontFamily: 'var(--serif-body)',
                fontSize: 'clamp(1rem, 1.3vw, 1.15rem)',
                lineHeight: 1.68,
                color: 'var(--ink-mid)',
                maxWidth: '420px',
                margin: '28px 0 0',
              }}
            >
              A refined note-taking app for people who think deeply. Rich editing, smart organization, and a design that stays out of your way.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-3"
              style={{ marginTop: '40px' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.0, ease: [0.25, 1, 0.5, 1] }}
            >
              <a href="/register" className="btn primary" style={{ padding: '11px 24px', borderRadius: '10px', fontSize: '15px' }}>
                Start for free
              </a>
              <a
                href="#features"
                className="btn-ghost fill-slide text-(--ink-mid) hover:text-(--ink)"
                style={{
                  padding: '11px 24px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  fontFamily: 'var(--serif-body)',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  border: '0.5px solid var(--line)',
                  fontWeight: 500,
                }}
              >
                Explore features
              </a>
            </motion.div>
          </div>

          {/* Right: dashboard mockup — large screens only */}
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.3, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: 'clamp(360px, 46vh, 500px)' }}
          >
            <DashboardMockup />
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-1 left-0 right-0 flex items-center gap-3"
          style={{ padding: '0 clamp(24px, 5vw, 80px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.8 }}
        >
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: '9px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-dim)',
          }}>
            Scroll
          </span>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid var(--ink-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <motion.svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path
                d="M2 4.5L7 9.5L12 4.5"
                stroke="var(--ink-dim)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

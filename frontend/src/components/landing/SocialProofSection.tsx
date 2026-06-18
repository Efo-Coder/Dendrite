"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// PLATZHALTER — vor Launch durch echte Beta-Stimme ersetzen
const LEAD = {
  quote:
    "The first notes app that treats my thoughts like they're worth keeping. I stopped collecting tools and started writing.",
  attribution: "Early beta writer · Product designer",
};

const eyebrowRuleStyle: CSSProperties = {
  width: 'clamp(28px, 6vw, 56px)',
  height: '1px',
  background: 'var(--line)',
};

export function SocialProofSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // The recessed plate fades up first, then the single voice forms above it —
      // a calmer, slower cadence than the About manifest's y:40 stagger.
      gsap.fromTo(
        '.sp-plate',
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 92%',
            end: 'top 55%',
            scrub: 1,
          },
        }
      );

      gsap.fromTo(
        '.sp-reveal',
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power3.out',
          stagger: 0.14,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            end: 'top 30%',
            scrub: 1,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="social-proof"
      className="relative overflow-hidden"
      style={{ padding: 'clamp(96px, 15vw, 200px) 0' }}
    >
      {/* Recessed warm-dark plate with a faint gold haze from the top edge —
          the brand's "gold on warm dark" moment, and the break from About's bare --bg */}
      <div
        aria-hidden
        className="sp-plate absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 0%, var(--radial-accent), transparent 60%), var(--bg-deep)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          // Own compositor layer: the gradient rasterizes once, so the scrubbed opacity
          // fade stays compositor-only instead of repainting the full-bleed plate each frame
          willChange: 'opacity',
        }}
      />

      <div
        className="relative px-6 sm:px-12 lg:px-24 mx-auto text-center"
        style={{ maxWidth: '58rem' }}
      >
        {/* Centered eyebrow with flanking rules — a different signature than About's left-aligned label */}
        <div className="sp-reveal flex items-center justify-center gap-4">
          <span style={eyebrowRuleStyle} />
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}
          >
            From the beta
          </p>
          <span style={eyebrowRuleStyle} />
        </div>

        <figure style={{ margin: 0 }}>
          <span
            aria-hidden
            className="sp-reveal block"
            style={{
              fontFamily: 'var(--serif-display)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              lineHeight: 0.9,
              color: 'var(--accent)',
              opacity: 0.5,
              marginTop: 'clamp(28px, 4vw, 44px)',
              marginBottom: 'clamp(6px, 1vw, 12px)',
            }}
          >
            &ldquo;
          </span>
          <blockquote className="sp-reveal" style={{ margin: '0 auto', maxWidth: '22ch' }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--serif-display)',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(2rem, 4.6vw, 3.6rem)',
                lineHeight: 1.22,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}
            >
              {LEAD.quote}
            </p>
          </blockquote>
          <figcaption
            className="sp-reveal"
            style={{
              marginTop: 'clamp(28px, 4vw, 40px)',
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--ink-low)',
            }}
          >
            — {LEAD.attribution}
          </figcaption>
        </figure>

        {/* Quiet trust line + a single low CTA, opened by a short centered hairline */}
        <div
          className="sp-reveal flex flex-col items-center gap-5"
          style={{ marginTop: 'clamp(44px, 6vw, 72px)' }}
        >
          <span style={{ width: '40px', height: '1px', background: 'var(--line)' }} />
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--ink-dim)',
            }}
          >
            Collected during the private beta
          </p>
          <Link
            to="/register"
            className="group"
            style={{
              fontFamily: 'var(--serif-body)',
              fontSize: '16px',
              color: 'var(--ink-mid)',
              textDecoration: 'none',
            }}
          >
            <span className="nav-underline">Start writing — free</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

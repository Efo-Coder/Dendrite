"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// PLATZHALTER — vor Launch durch echte Beta-Stimmen ersetzen
const LEAD = {
  quote:
    "The first notes app that treats my thoughts like they're worth keeping. I stopped collecting tools and started writing.",
  attribution: "Early beta writer · Product designer",
};

// PLATZHALTER — vor Launch durch echte Beta-Stimmen ersetzen
const QUOTES = [
  {
    quote:
      "It feels less like software and more like a good notebook — quiet, fast, and always where I left it.",
    attribution: "Beta writer · PhD student",
  },
  {
    quote:
      "I moved three years of scattered notes into Dendrite in one evening. Everything finally has a place.",
    attribution: "Beta writer · Journalist",
  },
];

const attributionStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--mono)',
  fontSize: '10px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--ink-low)',
};

const hairlineStyle: CSSProperties = {
  height: '1px',
  background: 'var(--line)',
  transformOrigin: 'left',
};

export function SocialProofSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.sp-reveal',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.12,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            end: 'top 30%',
            scrub: 1,
          },
        }
      );

      gsap.fromTo(
        '.sp-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: 'power2.out',
          stagger: 0.15,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            end: 'top 25%',
            scrub: 1,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="social-proof" className="py-24 lg:py-32">
      <div className="px-6 sm:px-12 lg:px-24 mx-auto" style={{ maxWidth: '68rem' }}>
        {/* Header */}
        <div className="sp-reveal">
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
          <h2
            style={{
              margin: '14px 0 0',
              fontFamily: 'var(--serif-display)',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: 'var(--ink)',
            }}
          >
            What early writers say.
          </h2>
        </div>

        <div className="sp-line" style={{ ...hairlineStyle, marginTop: '40px' }} />

        {/* Lead-Zitat — gesetzt wie ein Epigraph, hängendes Anführungszeichen in Gold */}
        <figure className="sp-reveal" style={{ margin: 0, padding: 'clamp(40px, 6vw, 72px) 0' }}>
          <blockquote style={{ position: 'relative', margin: 0 }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: '-0.55em',
                top: '-0.12em',
                fontFamily: 'var(--serif-display)',
                fontSize: '1.6em',
                lineHeight: 1,
                color: 'var(--accent)',
              }}
            >
              &ldquo;
            </span>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--serif-display)',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(1.6rem, 3.2vw, 2.7rem)',
                lineHeight: 1.3,
                letterSpacing: '-0.015em',
                color: 'var(--ink)',
                maxWidth: '30ch',
              }}
            >
              {LEAD.quote}
            </p>
          </blockquote>
          <figcaption style={{ ...attributionStyle, marginTop: '24px' }}>
            — {LEAD.attribution}
          </figcaption>
        </figure>

        <div className="sp-line" style={hairlineStyle} />

        {/* Zwei kleinere Stimmen in Zeitungsspalten, vertikale Hairline dazwischen */}
        <div className="grid md:grid-cols-2">
          {QUOTES.map((q, i) => (
            <figure
              key={q.attribution}
              className={`sp-reveal ${
                i === 1
                  ? 'border-t border-(--line) md:border-t-0 md:border-l md:border-(--line) md:pl-14'
                  : 'md:pr-14'
              }`}
              style={{
                margin: 0,
                paddingTop: 'clamp(32px, 4vw, 48px)',
                paddingBottom: 'clamp(32px, 4vw, 48px)',
              }}
            >
              <blockquote style={{ margin: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--serif-display)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 'clamp(1.15rem, 1.7vw, 1.5rem)',
                    lineHeight: 1.45,
                    color: 'var(--ink-mid)',
                  }}
                >
                  {q.quote}
                </p>
              </blockquote>
              <figcaption style={{ ...attributionStyle, marginTop: '18px' }}>
                — {q.attribution}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="sp-line" style={hairlineStyle} />

        {/* Ehrliche Fußzeile + ein einziger, leiser CTA */}
        <div
          className="sp-reveal flex flex-wrap items-center justify-between gap-4"
          style={{ paddingTop: '28px' }}
        >
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

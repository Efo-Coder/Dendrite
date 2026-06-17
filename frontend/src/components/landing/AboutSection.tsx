"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type CSSProperties } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Destilliert aus der echten Namensgeschichte: Dendrit = verzweigter Fortsatz
// der Nervenzelle, der Signale empfängt — und zugleich Baum mit Wurzeln.
const PARAGRAPHS = [
  "Every thought begins with a signal.",

  "In the brain, that signal first arrives through the dendrite — a branching structure that receives information and carries it inward, where thought begins to take form. The name was chosen deliberately: a structure that is at once branch and root, mind and nature, connection and growth. It reflects the belief that ideas grow through connection. Dendrite was built around that belief.",

  "Not as a place to store notes, but as a place for thinking itself.",

  "We created Dendrite in pursuit of something increasingly rare in software: focus without constraint — a space where clarity and creativity can coexist, and ideas that never limits your creative vision. A notebook free from unnecessary complexity, designed to feel calm, precise, and enduring. Every detail serves a purpose. Every interaction is considered.",

  "Because the tools we use shape the way we think.",

  "Dendrite is for those who seek more than a place to write — those who value a space to think, a notebook they return to willingly, trust completely, and use to build what matters.",
];

const PRINCIPLES = [
  {
    n: "01",
    title: "Branching",
    text: "Named after the branching structure that receives information in the brain, and the belief that thinking is not linear. It grows through connection.",
  },
  {
    n: "02",
    title: "Precision",
    text: "Colors, typography, spacing and every element should be exactly where you intend it. Precision is not a feature — it is the foundation.",
  },
  {
    n: "03",
    title: "Enduring",
    text: "A notebook should invite focus, not demand it. Calm, considered, and quietly luxurious. Designed to become a place where thinking feels effortless.",
  },
];

const hairlineStyle: CSSProperties = {
  height: '1px',
  background: 'var(--line)',
  transformOrigin: 'left',
  // Eigener Layer: rundet die 1px-Linie bei DPR 1.25/1.5 einheitlich statt pro Position auf 1 oder 2 Gerätepixel
  willChange: 'transform',
};

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.ab-plate',
        { scale: 0.95, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            end: 'top 35%',
            scrub: 1,
          },
        }
      );

      gsap.fromTo(
        '.ab-reveal',
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
        '.ab-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: 'power2.out',
          stagger: 0.15,
          scrollTrigger: {
            trigger: '.ab-principles',
            start: 'top 85%',
            end: 'top 45%',
            scrub: 1,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="about" className="py-24 lg:py-32">
      <div className="px-6 sm:px-12 lg:px-24 max-w-360 mx-auto">
        {/* Editorial: Buchtafel links, Manifest rechts */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <figure className="ab-plate lg:order-first" style={{ margin: 0 }}>
            <div
              style={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-card)',
                padding: '10px',
                background: 'color-mix(in oklch, var(--surface) 60%, transparent)',
              }}
            >
              <img
                src="/img/branding/mood.webp"
                alt="A writing desk with books, candlelight and an open Dendrite notebook"
                className="w-full h-auto block"
                style={{ borderRadius: 'calc(var(--radius-card) - 4px)' }}
                loading="lazy"
              />
            </div>
            <figcaption
              style={{
                marginTop: '14px',
                fontFamily: 'var(--mono)',
                fontSize: '9.5px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--ink-dim)',
                textAlign: 'center',
              }}
            >
              Fig. 01 — A quiet place to write
            </figcaption>
          </figure>

          <div>
            <p
              className="ab-reveal"
              style={{
                margin: 0,
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              About — Why Dendrite
            </p>
            <h2
              className="ab-reveal"
              style={{
                margin: '18px 0 28px',
                fontFamily: 'var(--serif-display)',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(2rem, 3.6vw, 3rem)',
                letterSpacing: '-0.02em',
                lineHeight: 1.12,
                color: 'var(--ink)',
              }}
            >
              Where thinking takes root<span style={{ color: 'var(--accent)' }}>.</span>
            </h2>
            {PARAGRAPHS.map((text) => (
              <p
                key={text.slice(0, 24)}
                className="ab-reveal"
                style={{
                  margin: '0 0 18px',
                  fontFamily: 'var(--serif-body)',
                  fontSize: 'clamp(15px, 1.25vw, 17px)',
                  lineHeight: 1.7,
                  color: 'var(--ink-mid)',
                  maxWidth: '54ch',
                }}
              >
                {text}
              </p>
            ))}
          </div>
        </div>

        {/* Prinzipien — nummerierte Hairline-Zeilen */}
        <div className="ab-principles" style={{ marginTop: 'clamp(56px, 8vw, 96px)' }}>
          {PRINCIPLES.map((p) => (
            <div key={p.n}>
              <div className="ab-line" style={hairlineStyle} />
              <div
                className="ab-reveal flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-5"
                style={{ padding: 'clamp(20px, 3vw, 30px) 0' }}
              >
                <span
                  className="shrink-0 sm:self-center"
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    color: 'var(--accent)',
                  }}
                >
                  {p.n}
                </span>
                <h3
                  className="sm:w-72"
                  style={{
                    margin: 0,
                    fontFamily: 'var(--serif-display)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 'clamp(1.25rem, 1.8vw, 1.6rem)',
                    letterSpacing: '-0.01em',
                    color: 'var(--ink)',
                    flexShrink: 0,
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--serif-body)',
                    fontSize: 'clamp(14px, 1.15vw, 16px)',
                    lineHeight: 1.6,
                    color: 'var(--ink-mid)',
                  }}
                >
                  {p.text}
                </p>
              </div>
            </div>
          ))}
          <div className="ab-line" style={hairlineStyle} />
        </div>
      </div>
    </section>
  );
}

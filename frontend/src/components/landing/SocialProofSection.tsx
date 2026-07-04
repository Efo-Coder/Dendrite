"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { SocialProofBook, type Spread } from './SocialProofBook';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// PLATZHALTER — vor Launch durch echte Beta-Stimmen ersetzen
const FEATURED = [
  {
    quote:
      "The first notes app that treats my thoughts like they're worth keeping. I stopped collecting tools and started writing.",
    attribution: "Early beta writer · Product designer",
  },
  {
    quote:
      "I write in it the way I used to write on paper — slowly, and because I want to.",
    attribution: "Early beta writer · Historian",
  },
];

// PLATZHALTER — vor Launch durch echte Beta-Stimmen ersetzen
const VOICES = [
  {
    quote: "It feels less like software and more like a good pen.",
    attribution: "Early beta writer · Novelist",
  },
  {
    quote: "I stopped losing ideas between apps. Everything lands here now.",
    attribution: "Early beta writer · Engineer",
  },
  {
    quote: "The first app in years I open without a reason.",
    attribution: "Early beta writer · PhD student",
  },
  {
    quote: "My journal, my reading notes, my plans — finally in one quiet place.",
    attribution: "Early beta writer · Teacher",
  },
  {
    quote: "It made me want to reread my own notes. That never happened before.",
    attribution: "Early beta writer · Researcher",
  },
];

const runningHeadStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--mono)',
  fontSize: '10px',
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
};

const attributionStyle: CSSProperties = {
  margin: '14px 0 0',
  fontFamily: 'var(--mono)',
  fontSize: '10px',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: 'var(--ink-low)',
};

// Keep in sync with PAGE_PADDING in SocialProofBook
const pagePadding = 'clamp(72px, 9vw, 140px) clamp(24px, 6vw, 96px)';

// ─── Page content pieces (shared by the book spreads and the mobile stack) ───

function FeaturedQuote({ entry }: { entry: (typeof FEATURED)[number] }) {
  return (
    <figure style={{ margin: 0 }}>
      <blockquote style={{ margin: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--serif-display)',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(1.7rem, 2.9vw, 2.7rem)',
            lineHeight: 1.28,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            // ch must resolve against the quote's own font size, so the
            // cap lives here and not on the 16px blockquote
            maxWidth: '22ch',
          }}
        >
          <span
            style={{
              float: 'left',
              fontWeight: 500,
              fontSize: '2.2em',
              lineHeight: 0.8,
              padding: '6px 12px 0 0',
              color: 'var(--accent)',
            }}
          >
            {entry.quote.charAt(0)}
          </span>
          {entry.quote.slice(1)}
        </p>
      </blockquote>
      <figcaption style={attributionStyle}>— {entry.attribution}</figcaption>
    </figure>
  );
}

function Voice({ entry }: { entry: (typeof VOICES)[number] }) {
  return (
    <figure style={{ margin: 0 }}>
      <blockquote style={{ margin: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--serif-body)',
            fontStyle: 'italic',
            fontSize: 'clamp(16px, 1.6vw, 19px)',
            lineHeight: 1.6,
            color: 'var(--ink-mid)',
            maxWidth: '38ch',
          }}
        >
          “{entry.quote}”
        </p>
      </blockquote>
      <figcaption style={attributionStyle}>— {entry.attribution}</figcaption>
    </figure>
  );
}

/* Quiet trust line + a single low CTA, opened by a short hairline */
function TrustCta() {
  return (
    <div className="flex flex-col gap-5" style={{ marginTop: 'clamp(12px, 2vw, 20px)' }}>
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
        className="group self-start"
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
  );
}

const HEADS = {
  left: <p style={{ ...runningHeadStyle, color: 'var(--accent)' }}>From the beta</p>,
  right: <p style={{ ...runningHeadStyle, color: 'var(--ink-dim)' }}>The guestbook</p>,
};

const SPREADS: Spread[] = [
  {
    left: <FeaturedQuote entry={FEATURED[0]} />,
    right: (
      <div className="flex flex-col" style={{ gap: 'clamp(28px, 3.5vw, 44px)' }}>
        {VOICES.slice(0, 3).map(voice => (
          <Voice key={voice.attribution} entry={voice} />
        ))}
      </div>
    ),
  },
  {
    left: <FeaturedQuote entry={FEATURED[1]} />,
    right: (
      <div className="flex flex-col" style={{ gap: 'clamp(28px, 3.5vw, 44px)' }}>
        {VOICES.slice(3).map(voice => (
          <Voice key={voice.attribution} entry={voice} />
        ))}
        <TrustCta />
      </div>
    ),
  },
];

export function SocialProofSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // The paper spread fades up first, then the entries settle onto it —
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

      // Desktop book pages and mobile stack entries reveal separately, so the
      // hidden copy never consumes stagger slots of the visible one
      for (const targets of ['.sp-reveal', '.sp-reveal-stack']) {
        gsap.fromTo(
          targets,
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
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="social-proof"
      className="relative overflow-hidden"
    >
      {/* The section IS the open notebook: full-bleed paper, gutter shadow at
          the spine, ribbon bookmark, gilded fore-edges on both screen edges.
          Fades in as one object, like the old recessed plate did. */}
      <div
        aria-hidden
        className="sp-plate absolute inset-0"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          // Own compositor layer: the scrubbed opacity fade stays compositor-only
          // instead of repainting the full-bleed paper each frame
          willChange: 'opacity',
        }}
      >
        <div
          className="hidden lg:block"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: '120px',
            transform: 'translateX(-50%)',
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklch, var(--bg-deep) 40%, transparent) 50%, transparent)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '4px',
            bottom: '4px',
            left: 0,
            width: '3px',
            background:
              'linear-gradient(180deg, color-mix(in oklch, var(--accent) 55%, var(--line)), color-mix(in oklch, var(--accent) 25%, var(--line)))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '4px',
            bottom: '4px',
            right: 0,
            width: '3px',
            background:
              'linear-gradient(180deg, color-mix(in oklch, var(--accent) 55%, var(--line)), color-mix(in oklch, var(--accent) 25%, var(--line)))',
          }}
        />
        {/* Ribbon just right of the spine; the swallowtail notch reads against
            the page bottom, so no overflow past the section is needed */}
        <div
          className="hidden lg:block"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 'calc(50% + 34px)',
            width: '22px',
            background:
              'linear-gradient(180deg, color-mix(in oklch, var(--accent) 80%, var(--bg-deep)), var(--accent))',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 11px), 0 100%)',
          }}
        />
      </div>

      <div className="relative hidden lg:block">
        <SocialProofBook spreads={SPREADS} heads={HEADS} firstPageNo={24} />
      </div>

      {/* Mobile: no page turning — every entry stacks on one long page */}
      <div
        className="relative flex flex-col lg:hidden"
        style={{ padding: pagePadding, gap: 'clamp(32px, 9vw, 48px)' }}
      >
        <div className="sp-reveal-stack">{HEADS.left}</div>
        <div className="sp-reveal-stack">
          <FeaturedQuote entry={FEATURED[0]} />
        </div>
        {VOICES.slice(0, 3).map(voice => (
          <div key={voice.attribution} className="sp-reveal-stack">
            <Voice entry={voice} />
          </div>
        ))}
        <div className="sp-reveal-stack">
          <FeaturedQuote entry={FEATURED[1]} />
        </div>
        {VOICES.slice(3).map(voice => (
          <div key={voice.attribution} className="sp-reveal-stack">
            <Voice entry={voice} />
          </div>
        ))}
        <div className="sp-reveal-stack">
          <TrustCta />
        </div>
      </div>
    </section>
  );
}

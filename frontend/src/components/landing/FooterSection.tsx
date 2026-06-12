"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DendriteBranch } from "../ui/DendriteBranch";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

/** Dendriten-Ornament als Divider — zeichnet sich, sobald der Footer sichtbar wird. */
function DendriteDivider() {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden>
      <DendriteBranch active={revealed} style={{ width: "min(440px, 76vw)", margin: "0 auto" }} />
    </div>
  );
}

export function FooterSection() {
  return (
    <footer
      id="contact"
      className="lg:sticky lg:bottom-0 lg:z-0 lg:min-h-screen flex flex-col"
      style={{ background: 'var(--ink)', color: 'var(--bg)' }}
    >
      {/* Typografisches Finale — Bookend zur Hero-H1 */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-12 lg:px-24 max-w-360 mx-auto w-full py-20 lg:py-0">
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'color-mix(in oklch, var(--bg) 40%, transparent)',
            marginBottom: '24px',
          }}
        >
          Dendrite · a notebook
        </p>
        <h2
          style={{
            fontFamily: 'var(--serif-display)',
            fontSize: 'clamp(2.6rem, 6.5vw, 6rem)',
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'var(--bg)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: '0 0 22px',
          }}
        >
          Start writing today<span style={{ color: 'var(--accent)' }}>.</span>
        </h2>
        <p
          style={{
            fontFamily: 'var(--serif-body)',
            fontSize: '1.05rem',
            color: 'color-mix(in oklch, var(--bg) 55%, transparent)',
            margin: '0 0 36px',
          }}
        >
          Free to start. Yours to keep.
        </p>
        <Link
          to="/register"
          className="btn primary"
          style={{ padding: '12px 30px', borderRadius: '10px', fontSize: '15px' }}
        >
          Start for free
        </Link>
      </div>

      <div className="mt-auto w-full">
        <DendriteDivider />

        {/* Eine Linkzeile statt drei Spalten */}
        <nav
          className="flex flex-wrap items-center justify-center"
          style={{ gap: 'clamp(18px, 3vw, 36px)', padding: '36px 24px 0' }}
        >
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="group"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'color-mix(in oklch, var(--bg) 60%, transparent)',
                textDecoration: 'none',
              }}
            >
              <span className="nav-underline">{label}</span>
            </a>
          ))}
          <Link
            to="/login"
            className="group"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'color-mix(in oklch, var(--bg) 60%, transparent)',
              textDecoration: 'none',
            }}
          >
            <span className="nav-underline">Sign in</span>
          </Link>
        </nav>

        {/* Plattform-Status als eine ehrliche Zeile */}
        <p
          className="text-center"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '9px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'color-mix(in oklch, var(--bg) 32%, transparent)',
            margin: '20px 24px 36px',
          }}
        >
          Web — available now · Desktop &amp; mobile — coming 2026
        </p>

        {/* Hairline */}
        <div className="px-6 sm:px-12 lg:px-24 max-w-360 mx-auto">
          <div style={{ borderTop: '1px solid color-mix(in oklch, var(--bg) 12%, transparent)' }} />
        </div>

        {/* Kolophon */}
        <div className="px-6 sm:px-12 lg:px-24 py-6 max-w-360 mx-auto">
          {/* 1fr auto 1fr — die Mitte ist im Container zentriert, unabhängig von den Seiten */}
          <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
            <p
              className="sm:justify-self-start"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                letterSpacing: '0.14em',
                color: 'color-mix(in oklch, var(--bg) 28%, transparent)',
                margin: 0,
              }}
            >
              © 2026 Dendrite · All rights reserved
            </p>
            <p
              className="text-center"
              style={{
                fontFamily: 'var(--serif-body)',
                fontStyle: 'italic',
                fontSize: '12px',
                color: 'color-mix(in oklch, var(--bg) 38%, transparent)',
                margin: 0,
              }}
            >
              MMXXVI · Set in Cormorant &amp; Garamond
            </p>
            <div className="flex items-center gap-6 sm:justify-self-end">
              <Link
                to="/privacy"
                className="opacity-40 hover:opacity-70 transition-opacity"
                style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.14em', color: 'var(--bg)' }}
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="opacity-40 hover:opacity-70 transition-opacity"
                style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.14em', color: 'var(--bg)' }}
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

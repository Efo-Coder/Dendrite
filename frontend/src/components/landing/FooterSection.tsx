"use client";

import { Link } from "react-router-dom";

const platformItems = [
  { label: "Web App", note: "Available now" },
  { label: "Desktop", note: "Coming soon" },
  { label: "Android", note: "Coming soon" },
  { label: "iOS", note: "Coming soon" },
];

const quickLinks = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function FooterSection() {
  return (
    <footer
      id="contact"
      className="lg:sticky lg:bottom-0 lg:z-0"
      style={{ background: 'var(--ink)', color: 'var(--bg)', minHeight: '100dvh' }}
    >
      {/* CTA */}
      <div className="px-6 sm:px-12 lg:px-24 pt-20 lg:pt-28 pb-8 lg:pb-8 max-w-360 mx-auto">
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'color-mix(in oklch, var(--bg) 40%, transparent)',
            marginBottom: '20px',
          }}
        >
          Dendrite · a notebook
        </p>
        <h2
          style={{
            fontFamily: 'var(--serif-display)',
            fontSize: 'clamp(2.4rem, 6vw, 5.5rem)',
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'var(--bg)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: '0 0 20px',
          }}
        >
          Start writing today.
        </h2>
        <p
          style={{
            fontFamily: 'var(--serif-body)',
            fontSize: '1.05rem',
            color: 'color-mix(in oklch, var(--bg) 55%, transparent)',
            marginBottom: '36px',
          }}
        >
          Free to start. Yours to keep.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center justify-center hover:opacity-90 transition-opacity"
          style={{
            padding: '11px 28px',
            borderRadius: '10px',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontFamily: 'var(--serif-body)',
            fontSize: '15px',
            fontWeight: 500,
          }}
        >
          Start for free
        </Link>
      </div>

      {/* Divider */}
      <div className="px-6 sm:px-12 lg:px-24 mt-4 lg:mt-10 max-w-360 mx-auto">
        <div style={{ borderTop: '1px solid color-mix(in oklch, var(--bg) 12%, transparent)' }} />
      </div>

      {/* Columns */}
      <div className="px-6 sm:px-12 lg:px-24 pt-8 lg:pt-10 pb-8 lg:pb-6 max-w-360 mx-auto">
        <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-8">

          {/* Brand */}
          <div>
            <span
              style={{
                fontFamily: 'var(--serif-display)',
                fontSize: '2rem',
                fontWeight: 400,
                color: 'var(--bg)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Dendrite
            </span>
            <p
              style={{
                fontFamily: 'var(--serif-body)',
                fontSize: '1rem',
                fontStyle: 'italic',
                color: 'color-mix(in oklch, var(--bg) 45%, transparent)',
              }}
            >
              Write what endures.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-16 lg:gap-24">

            {/* Platform */}
            <div>
              <h4
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '9px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'color-mix(in oklch, var(--bg) 38%, transparent)',
                  marginBottom: '20px',
                }}
              >
                Platform
              </h4>
              <div className="flex flex-col gap-4">
                {platformItems.map(({ label, note }) => (
                  <div key={label}>
                    <p style={{ fontFamily: 'var(--serif-body)', fontSize: '0.9rem', color: 'var(--bg)', margin: '0 0 2px' }}>
                      {label}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '9px',
                        letterSpacing: '0.1em',
                        color: 'color-mix(in oklch, var(--bg) 30%, transparent)',
                        margin: 0,
                      }}
                    >
                      {note}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigate */}
            <div>
              <h4
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '9px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'color-mix(in oklch, var(--bg) 38%, transparent)',
                  marginBottom: '20px',
                }}
              >
                Navigate
              </h4>
              <ul className="flex flex-col gap-3">
                {quickLinks.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="opacity-70 hover:opacity-100 transition-opacity"
                      style={{ fontFamily: 'var(--serif-body)', fontSize: '0.9rem', color: 'var(--bg)' }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '9px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'color-mix(in oklch, var(--bg) 38%, transparent)',
                  marginBottom: '20px',
                }}
              >
                Account
              </h4>
              <ul className="flex flex-col gap-3">
                <li>
                  <Link
                    to="/register"
                    className="opacity-70 hover:opacity-100 transition-opacity"
                    style={{ fontFamily: 'var(--serif-body)', fontSize: '0.9rem', color: 'var(--bg)' }}
                  >
                    Sign Up Free
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="opacity-70 hover:opacity-100 transition-opacity"
                    style={{ fontFamily: 'var(--serif-body)', fontSize: '0.9rem', color: 'var(--bg)' }}
                  >
                    Log In
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="px-6 sm:px-12 lg:px-24 max-w-360 mx-auto">
        <div style={{ borderTop: '1px solid color-mix(in oklch, var(--bg) 12%, transparent)' }} />
      </div>

      {/* Bottom bar */}
      <div className="px-6 sm:px-12 lg:px-24 py-6 max-w-360 mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.14em',
              color: 'color-mix(in oklch, var(--bg) 28%, transparent)',
              margin: 0,
            }}
          >
            © 2026 Dendrite
          </p>
          <div className="flex items-center gap-6">
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
    </footer>
  );
}

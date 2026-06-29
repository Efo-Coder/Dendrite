import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'dendrite-cookie-consent';

// localStorage can throw (private mode, storage disabled) — never let that crash the app shell.
function hasConsent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return true; // can't persist → don't nag on every visit
  }
}

function storeConsent() {
  try {
    localStorage.setItem(STORAGE_KEY, 'acknowledged');
  } catch {
    // ignore — the banner still closes for this session
  }
}

export function CookieConsent() {
  // The /print route is a bare render target for the PDF exporter — no app chrome.
  const [visible, setVisible] = useState(
    () => !hasConsent() && !window.location.pathname.startsWith('/print'),
  );
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);

  // Ready-gate: mount hidden, then slide in on the next frame so the transition runs.
  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  if (!visible) return null;

  const accept = () => {
    storeConsent();
    setClosing(true);
  };

  const active = shown && !closing;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
        display: 'flex', justifyContent: 'center',
        padding: '0 16px 16px',
        pointerEvents: 'none', // let the rest of the page stay clickable around the card
      }}
    >
      <div
        onTransitionEnd={(e) => {
          if (closing && e.propertyName === 'opacity') setVisible(false);
        }}
        style={{
          pointerEvents: 'auto',
          maxWidth: '460px', width: '100%',
          background: 'var(--bg)',
          border: '0.5px solid color-mix(in oklch, var(--ink) 16%, transparent)',
          borderRadius: '12px',
          boxShadow: '0 10px 34px color-mix(in oklch, var(--ink) 18%, transparent)',
          padding: '18px 22px',
          opacity: active ? 1 : 0,
          transform: active ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.4s cubic-bezier(.2,.7,.2,1), transform 0.4s cubic-bezier(.2,.7,.2,1)',
        }}
      >
        <p style={{
          fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.24em',
          textTransform: 'uppercase', color: 'color-mix(in oklch, var(--ink-mid) 80%, transparent)',
          margin: '0 0 8px',
        }}>
          Cookies
        </p>
        <p style={{
          fontFamily: 'var(--serif-body)', fontSize: '0.95rem', lineHeight: 1.5,
          color: 'var(--ink-mid)', margin: '0 0 16px',
        }}>
          Dendrite uses only essential cookies to keep you signed in — no tracking, no ads.
        </p>
        <div className="flex items-center justify-between" style={{ gap: '16px' }}>
          <Link
            to="/privacy"
            className="opacity-50 hover:opacity-90 transition-opacity"
            style={{
              fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'var(--ink-mid)', textDecoration: 'none',
            }}
          >
            Privacy policy
          </Link>
          <button
            type="button"
            onClick={accept}
            className="btn primary"
            style={{ padding: '10px 26px', borderRadius: '10px', fontSize: '13px' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

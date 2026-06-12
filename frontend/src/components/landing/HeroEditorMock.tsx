import type { CSSProperties } from 'react';

const SIDEBAR_NOTES = [
  { title: 'Reading notes', active: false },
  { title: 'Field journal', active: false },
  { title: 'On things that endure', active: true },
  { title: 'Letters, unsent', active: false },
  { title: 'Sketches & fragments', active: false },
];

const paragraphStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--serif-body)',
  fontSize: '15.5px',
  lineHeight: 1.68,
  color: 'var(--ink-mid)',
  maxWidth: '58ch',
};

/** Stilisiertes Editor-Fenster — rein dekorativ, zeigt das Produkt in der Hero. */
export function HeroEditorMock() {
  return (
    <div
      aria-hidden
      style={{
        borderRadius: 'var(--radius-win)',
        border: '0.5px solid var(--line)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-deep)',
        overflow: 'hidden',
      }}
    >
      {/* Titelleiste */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          height: '40px',
          padding: '0 16px',
          borderBottom: '0.5px solid var(--line-soft)',
        }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              border: '0.5px solid var(--line)',
              background: 'var(--surface-hi)',
            }}
          />
        ))}
        <span
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'var(--ink-dim)',
            pointerEvents: 'none',
          }}
        >
          Dendrite — Notebook
        </span>
      </div>

      {/* Korpus: Sidebar + Editor */}
      <div style={{ display: 'flex', minHeight: '520px' }}>
        <aside
          className="hidden sm:block"
          style={{
            width: '210px',
            flexShrink: 0,
            padding: '18px 12px',
            borderRight: '0.5px solid var(--line-soft)',
            background: 'color-mix(in oklch, var(--bg-deep) 45%, transparent)',
          }}
        >
          <p
            style={{
              margin: '0 0 10px 10px',
              fontFamily: 'var(--mono)',
              fontSize: '9px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--ink-dim)',
            }}
          >
            Notes
          </p>
          {SIDEBAR_NOTES.map(n => (
            <div
              key={n.title}
              style={{
                padding: '7px 10px',
                borderRadius: '7px',
                fontFamily: 'var(--serif-body)',
                fontSize: '14px',
                color: n.active ? 'var(--ink)' : 'var(--ink-low)',
                background: n.active ? 'color-mix(in oklch, var(--accent) 13%, transparent)' : 'transparent',
              }}
            >
              {n.title}
            </div>
          ))}
        </aside>

        <div style={{ flex: 1, minWidth: 0, padding: 'clamp(24px, 4vw, 44px)' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--mono)',
              fontSize: '9.5px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--ink-dim)',
            }}
          >
            June 11, 2026
          </p>
          <h3
            style={{
              margin: '10px 0 16px',
              fontFamily: 'var(--serif-display)',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
            }}
          >
            On things that endure
          </h3>
          <p style={paragraphStyle}>
            Most thoughts are gone by morning. The ones we write down stay — they sharpen,
            they connect, they slowly grow into something larger than a moment.
          </p>
          <p style={{ ...paragraphStyle, marginTop: '12px' }}>
            A notebook is not an archive. It is a place where ideas keep
            <span className="hero-caret" />
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMagicHover } from '../../hooks/useMagicHover';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useSettingsStore, PaletteId, FontId, DensityId, DateDisplayMode, CursorStyle } from '../../store/useSettingsStore';
import { LOGO_SRC } from '../../config/brand';
import { modKey } from '../../lib/platform';
import ToggleSwitch from '../ui/ToggleSwitch';
import RangeSlider from '../ui/RangeSlider';
import Counter from '../ui/Counter';
import SyncTab from './settings/SyncTab';
import FeedbackTab from './settings/FeedbackTab';

const PALETTES: { id: PaletteId; name: string; color: string }[] = [
  { id: 'onyx',     name: 'Onyx & Champagne', color: 'oklch(0.2253 0.0084 79.15)'  },
  { id: 'bordeaux', name: 'Bordeaux & Cream',  color: 'oklch(0.1518 0.0947 25)'  },
  { id: 'forest',   name: 'Forest & Brass',    color: 'oklch(0.2341 0.0306 165)' },
  { id: 'midnight', name: 'Midnight & Rose',   color: 'oklch(0.2341 0.038 260)' },
  { id: 'obsidian', name: 'Obsidian & Ivory',  color: 'oklch(0.3056 0.006 0)'  },
  { id: 'nacre',    name: 'Nacre & Rose Gold', color: 'oklch(0.2724 0.0429 15)'  },
];

const FONTS: { id: FontId; name: string }[] = [
  { id: 'cormorant',   name: 'Cormorant' },
  { id: 'eb-garamond', name: 'EB Garamond' },
  { id: 'mixed',       name: 'Cormorant + Mono' },
];

const DENSITIES: { id: DensityId; label: string }[] = [
  { id: 'compact', label: 'compact' },
  { id: 'regular', label: 'regular' },
  { id: 'comfy',   label: 'comfy' },
];

const getShortcuts = (): [string, string][] => {
  const mod = modKey();
  return [
    ['Compose new note', `${mod} N`],
    ['Search', `${mod} F`],
    ['Toggle sidebar', `${mod} \\`],
    ['Bold', `${mod} B`],
    ['Italic', `${mod} I`],
    ['Underline', `${mod} U`],
    ['Pin / unpin', `${mod} P`],
    ['Settings', `${mod} ,`],
  ];
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const {
    palette, setPalette,
    themeMode, setThemeMode,
    font, setFont,
    fontSize, setFontSize,
    dropCap, setDropCap,
    activeLine, setActiveLine,
    density, setDensity,
    dateDisplayMode, setDateDisplayMode,
    cursorStyle, setCursorStyle,
  } = useSettingsStore();

  const [tab, setTab] = useState<'appearance' | 'editor' | 'sync' | 'shortcuts' | 'feedback' | 'about'>('appearance');
  const [tabSwitched, setTabSwitched] = useState(false);
  const { containerRef: navRef, onItemEnter, onItemLeave, Indicator } = useMagicHover({ inset: 0, borderRadius: 0 });
  const [visible, setVisible] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    } else if (visibleRef.current) {
      setClosing(true);
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!visible) return null;

  return createPortal(
    <div className={`modal-overlay${closing ? ' closing' : ''}`} onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="ornament">— · settings · —</div>
          <h3 key={tabSwitched ? tab : undefined} className={tabSwitched ? 'animated' : ''}>{{
            appearance: 'Appearance',
            editor: 'Editor',
            sync: 'Sync & Backup',
            shortcuts: 'Shortcuts',
            feedback: 'Feedback',
            about: 'About',
          }[tab]}</h3>
        </div>

        <div className="settings-grid">
          <div className="settings-nav" ref={navRef} style={{ position: 'relative' }}>
            {Indicator}
            {(['appearance', 'editor', 'sync', 'shortcuts', 'feedback', 'about'] as const).map((t) => (
              <button
                key={t}
                className={tab === t ? 'active' : ''}
                onClick={() => { setTab(t); setTabSwitched(true); }}
                onMouseEnter={onItemEnter}
                onMouseLeave={onItemLeave}
              >
                {t === 'appearance' ? 'Appearance'
                 : t === 'editor' ? 'Editor'
                 : t === 'sync' ? 'Sync & Backup'
                 : t === 'shortcuts' ? 'Shortcuts'
                 : t === 'feedback' ? 'Feedback'
                 : 'About'}
              </button>
            ))}
          </div>

          <div key={tab} className={`settings-pane${tabSwitched ? ' animated' : ''}`}>
            {tab === 'appearance' && (
              <>
                <div className="settings-row">
                  <div className="lbl">Theme<small>Light for daylight; dark for the small hours.</small></div>
                  <button
                    className="btn-toggle fill-slide"
                    onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                  >
                    {themeMode === 'dark' ? '◑ Dark' : '○ Light'}
                  </button>
                </div>

                <div className="settings-row">
                  <div className="lbl">Palette<small>A small library of disciplined moods.</small></div>
                  <div className="swatch-row">
                    {PALETTES.map((p) => (
                      <div
                        key={p.id}
                        className={`swatch${palette === p.id ? ' active' : ''}`}
                        style={{ background: p.color }}
                        title={p.name}
                        onClick={() => setPalette(p.id)}
                      />
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div className="lbl">Date display<small>Which date to show in the notes list.</small></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([['updatedAt', 'Edited'], ['createdAt', 'Created']] as [DateDisplayMode, string][]).map(([id, label]) => (
                      <button
                        key={id}
                        className={`btn-toggle fill-slide${dateDisplayMode === id ? ' active' : ''}`}
                        onClick={() => setDateDisplayMode(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div className="lbl">Density<small>How much air between the words.</small></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {DENSITIES.map((d) => (
                      <button
                        key={d.id}
                        className={`btn-toggle fill-slide${density === d.id ? ' active' : ''}`}
                        onClick={() => setDensity(d.id)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div className="lbl">Cursor<small>Gold arrow or floating dot & ring.</small></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([['classic', 'Classic'], ['modern', 'Modern']] as [CursorStyle, string][]).map(([id, label]) => (
                      <button
                        key={id}
                        className={`btn-toggle fill-slide${cursorStyle === id ? ' active' : ''}`}
                        onClick={() => setCursorStyle(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === 'editor' && (
              <>
                <div className="settings-row">
                  <div className="lbl">Typeface<small>For the title page and the running text.</small></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {FONTS.map((f) => (
                      <button
                        key={f.id}
                        className={`btn-toggle fill-slide${font === f.id ? ' active' : ''}`}
                        onClick={() => setFont(f.id)}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div className="lbl">Type size<small>From whisper to lectern.</small></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RangeSlider
                      min={14} max={28} step={1} value={fontSize}
                      onChange={setFontSize}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-low)', width: 32 }}>
                      <Counter
                        value={fontSize}
                        places={[10, 1]}
                        fontSize={11}
                        gap={0}
                        borderRadius={0}
                        horizontalPadding={0}
                        textColor="var(--ink-low)"
                        fontWeight={400}
                        gradientHeight={3}
                        gradientFrom="var(--surface)"
                        gradientTo="transparent"
                        counterStyle={{ fontFamily: 'var(--mono)' }}
                      />
                      px
                    </span>
                  </div>
                </div>

                <div className="settings-row">
                  <div className="lbl">Drop cap<small>The luxurious first letter.</small></div>
                  <ToggleSwitch checked={dropCap} onChange={setDropCap} />
                </div>

                <div className="settings-row">
                  <div className="lbl">Active line<small>Highlight the line under the cursor.</small></div>
                  <ToggleSwitch checked={activeLine} onChange={setActiveLine} />
                </div>
              </>
            )}

            {tab === 'sync' && <SyncTab />}

            {tab === 'shortcuts' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px 24px', fontFamily: 'var(--serif-body)', fontSize: 14 }}>
                {getShortcuts().map(([label, key]) => (
                  <>
                    <span key={label} style={{ color: 'var(--ink-mid)' }}>{label}</span>
                    <kbd style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 5, border: '0.5px solid var(--line)' }}>{key}</kbd>
                  </>
                ))}
              </div>
            )}

            {tab === 'feedback' && <FeedbackTab />}

            {tab === 'about' && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: 'var(--serif-display)' }}>
                <img src={LOGO_SRC} alt="Dendrite" style={{ width: 72, height: 72, marginBottom: 8, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 22, color: 'var(--ink)', letterSpacing: '0.02em' }}>Dendrite</div>
                <div style={{ fontSize: 13, color: 'var(--ink-low)', fontStyle: 'italic', marginTop: 4 }}>
                  Notes for the patient mind. Letterpress edition.
                </div>
                <div style={{ marginTop: 24, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  MMXXVI · Set in Cormorant & Garamond
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    getModalPortalRoot()
  );
};

export default SettingsModal;

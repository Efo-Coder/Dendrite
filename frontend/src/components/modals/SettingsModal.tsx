import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useMagicHover } from '../../hooks/useMagicHover';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useSettingsStore, PaletteId, FontId, DensityId, DateDisplayMode, CursorStyle } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/auth.service';
import { feedbackService } from '../../services/feedback.service';
import { LOGO_SRC } from '../../config/brand';
import { modKey } from '../../lib/platform';
import ToggleSwitch from '../ui/ToggleSwitch';
import RangeSlider from '../ui/RangeSlider';
import { MagicInput } from '../ui/MagicInput';
import Counter from '../ui/Counter';

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
    autoSave, setAutoSave,
    cursorStyle, setCursorStyle,
  } = useSettingsStore();

  const [tab, setTab] = useState<'appearance' | 'editor' | 'sync' | 'shortcuts' | 'feedback' | 'about'>('appearance');
  const [tabSwitched, setTabSwitched] = useState(false);
  const { containerRef: navRef, onItemEnter, onItemLeave, Indicator } = useMagicHover({ inset: 0, borderRadius: 0 });
  const [visible, setVisible] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const { user } = useAuthStore();
  const [twoFASetup, setTwoFASetup] = useState<{ secret: string; qrCode: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const [starHover, setStarHover] = useState(0);
  const [starRating, setStarRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugLoading, setBugLoading] = useState(false);
  const [bugDone, setBugDone] = useState(false);

  const handleSubmitRating = async () => {
    if (!starRating) return;
    setRatingLoading(true);
    try {
      await Promise.all([
        feedbackService.submitRating(starRating, ratingComment || undefined),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setRatingDone(true);
    } catch {
    } finally {
      setRatingLoading(false);
    }
  };

  const handleSubmitBug = async () => {
    if (!bugTitle.trim() || !bugDesc.trim()) return;
    setBugLoading(true);
    try {
      await Promise.all([
        feedbackService.submitBugReport(bugTitle.trim(), bugDesc.trim()),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setBugDone(true);
      setBugTitle('');
      setBugDesc('');
    } catch {
    } finally {
      setBugLoading(false);
    }
  };

  useEffect(() => {
    if (user) setTwoFAEnabled((user as any).twoFactorEnabled ?? false);
  }, [user]);

  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    try {
      const [data] = await Promise.all([
        authService.setup2FA(),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setTwoFASetup(data);
    } catch {
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (twoFACode.length < 6) return;
    setTwoFALoading(true);
    try {
      await Promise.all([
        authService.enable2FA(twoFACode),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setTwoFAEnabled(true);
      setTwoFASetup(null);
      setTwoFACode('');
    } catch {
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) return;
    setTwoFALoading(true);
    try {
      await Promise.all([
        authService.disable2FA(disablePassword),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setTwoFAEnabled(false);
      setShowDisable(false);
      setDisablePassword('');
    } catch {
    } finally {
      setTwoFALoading(false);
    }
  };

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

            {tab === 'sync' && (
              <>
                <div className="settings-row">
                  <div className="lbl">Auto-save<small>Notes are saved automatically as you type.</small></div>
                  <ToggleSwitch checked={autoSave} onChange={setAutoSave} />
                </div>
                <div className="settings-row">
                  <div className="lbl">Local backup<small>Encrypted on disk.</small></div>
                  <button className="btn-ghost" style={{ border: '0.5px solid var(--line)' }}>Export</button>
                </div>

                <div className="settings-row" style={{ alignItems: 'flex-start' }}>
                  <div className="lbl">
                    Two-factor authentication
                    <small>{twoFAEnabled ? 'Your account is protected with an authenticator app.' : 'Add an extra layer of security to your account.'}</small>
                  </div>
                  {twoFAEnabled ? (
                    <button
                      className="btn-ghost"
                      style={{ border: '0.5px solid var(--line)', color: 'var(--ink-mid)' }}
                      onClick={() => setShowDisable(!showDisable)}
                    >
                      Disable
                    </button>
                  ) : (
                    !twoFASetup && (
                      <button
                        className="btn-ghost"
                        style={{ border: '0.5px solid var(--line)' }}
                        onClick={handleSetup2FA}
                        disabled={twoFALoading}
                      >
                        {twoFALoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Loading…</span> : 'Enable'}
                      </button>
                    )
                  )}
                </div>

                {twoFASetup && !twoFAEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'var(--surface)', borderRadius: '10px', border: '0.5px solid var(--line)' }}>
                    <p style={{ margin: 0, fontFamily: 'var(--serif-body)', fontSize: '13px', color: 'var(--ink-mid)', lineHeight: 1.6 }}>
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.
                    </p>
                    <img src={twoFASetup.qrCode} alt="QR Code" style={{ width: '160px', height: '160px', borderRadius: '8px', alignSelf: 'center' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <MagicInput
                        type="text"
                        inputMode="numeric"
                        value={twoFACode}
                        onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="input"
                        placeholder="000000"
                        style={{ letterSpacing: '0.2em', textAlign: 'center' }}
                        wrapperStyle={{ flex: 1 }}
                        maxLength={6}
                      />
                      <button
                        className="btn-ghost"
                        style={{ border: '0.5px solid var(--line)' }}
                        onClick={handleEnable2FA}
                        disabled={twoFALoading || twoFACode.length < 6}
                      >
                        {twoFALoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Verifying…</span> : 'Confirm'}
                      </button>
                    </div>
                    <button
                      className="no-press"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', textAlign: 'left' }}
                      onClick={() => setTwoFASetup(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {showDisable && twoFAEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--surface)', borderRadius: '10px', border: '0.5px solid var(--line)' }}>
                    <p style={{ margin: 0, fontFamily: 'var(--serif-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>
                      Enter your password to disable two-factor authentication.
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <MagicInput
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        className="input"
                        placeholder="Your password"
                        wrapperStyle={{ flex: 1 }}
                      />
                      <button
                        className="btn-ghost"
                        style={{ border: '0.5px solid var(--line)', color: 'var(--ink-mid)' }}
                        onClick={handleDisable2FA}
                        disabled={twoFALoading || !disablePassword}
                      >
                        {twoFALoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Disabling…</span> : 'Confirm'}
                      </button>
                    </div>
                    <button
                      className="no-press"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', textAlign: 'left' }}
                      onClick={() => { setShowDisable(false); setDisablePassword(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

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

            {tab === 'feedback' && (
              <div style={{ fontFamily: 'var(--serif-body)' }}>
                <div style={{ marginBottom: 28 }}>
                  <div className="lbl" style={{ marginBottom: 12 }}>
                    Rate your experience
                    <small>How do you feel about Dendrite so far?</small>
                  </div>
                  <AnimatePresence mode="wait">
                    {ratingDone ? (
                      <motion.div
                        key="rating-done"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.14em', textTransform: 'uppercase' }}
                      >
                        Thank you — your feedback matters.
                      </motion.div>
                    ) : (
                      <motion.div
                        key="rating-form"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                      >
                        <div style={{ display: 'flex', gap: 1 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              className="no-press"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 22, color: s <= (starHover || starRating) ? 'var(--accent)' : 'var(--line)', transition: 'color 0.15s' }}
                              onMouseEnter={() => setStarHover(s)}
                              onMouseLeave={() => setStarHover(0)}
                              onClick={() => setStarRating(s)}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <AnimatePresence>
                          {starRating > 0 && (
                            <motion.textarea
                              key="rating-textarea"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              value={ratingComment}
                              onChange={(e) => setRatingComment(e.target.value)}
                              placeholder="Optional comment…"
                              rows={2}
                              style={{ fontFamily: 'var(--serif-body)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '0.5px solid var(--line)', borderRadius: 6, padding: '8px 10px', resize: 'none', outline: 'none', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
                            />
                          )}
                        </AnimatePresence>
                        <AnimatePresence>
                          {starRating > 0 && (
                            <motion.div
                              key="rating-submit"
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.18 }}
                            >
                              <button
                                className="btn-ghost"
                                style={{ border: '0.5px solid var(--line)' }}
                                onClick={handleSubmitRating}
                                disabled={ratingLoading}
                              >
                                {ratingLoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Sending…</span> : 'Submit'}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div style={{ borderTop: '0.5px solid var(--line)', margin: '0 0 28px' }} />

                <div>
                  <div className="lbl" style={{ marginBottom: 12 }}>
                    Report a bug
                    <small>Something broken? Let us know.</small>
                  </div>
                  <AnimatePresence mode="wait">
                    {bugDone ? (
                      <motion.div
                        key="bug-done"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.14em', textTransform: 'uppercase' }}
                      >
                        Report received — we'll look into it.
                      </motion.div>
                    ) : (
                      <motion.div
                        key="bug-form"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                      >
                        <input
                          type="text"
                          value={bugTitle}
                          onChange={(e) => setBugTitle(e.target.value)}
                          placeholder="Short title…"
                          style={{ fontFamily: 'var(--serif-body)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '0.5px solid var(--line)', borderRadius: 6, padding: '8px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        />
                        <textarea
                          value={bugDesc}
                          onChange={(e) => setBugDesc(e.target.value)}
                          placeholder="Describe what happened…"
                          rows={3}
                          style={{ fontFamily: 'var(--serif-body)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '0.5px solid var(--line)', borderRadius: 6, padding: '8px 10px', resize: 'none', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        />
                        <button
                          className="btn-ghost"
                          style={{ border: '0.5px solid var(--line)', alignSelf: 'flex-start' }}
                          onClick={handleSubmitBug}
                          disabled={bugLoading || !bugTitle.trim() || !bugDesc.trim()}
                        >
                          {bugLoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Sending report…</span> : 'Send report'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

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

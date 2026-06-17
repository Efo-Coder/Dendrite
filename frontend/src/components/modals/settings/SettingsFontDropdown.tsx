import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { getModalPortalRoot } from '../../../lib/modalPortalRoot';
import { useGoogleFonts } from '../../../hooks/useGoogleFonts';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { MagicInput } from '../../ui/MagicInput';

// Anchored directly under the trigger and matched to its width, so the popup reads
// as an extension of the button (same pattern as the NoteList sort menu).
type Anchor = { top: number; left: number; width: number };

// Typeface picker for Settings — searchable Google-Fonts dropdown bound to the
// global font setting (applied to the note editor title + body via ThemeProvider).
const SettingsFontDropdown = () => {
  const { font, setFont } = useSettingsStore();
  const { fonts, loading, error } = useGoogleFonts();

  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [search, setSearch] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const open = anchor !== null;

  const filtered = useMemo(
    () => fonts.filter((f) => f.family.toLowerCase().includes(search.toLowerCase())),
    [fonts, search]
  );

  const close = () => setAnchor(null);

  const toggle = () => {
    if (open) { close(); return; }
    const r = btnRef.current!.getBoundingClientRect();
    setAnchor({ top: r.bottom, left: r.left, width: r.width });
  };

  useEffect(() => { if (!open) setSearch(''); }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const choose = (family: string | null) => { setFont(family); close(); };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="flex items-center justify-between gap-2 border border-(--line) bg-(--bg) px-3 py-1.5 text-(--ink) transition-colors hover:border-(--ink-dim)"
        style={{
          minWidth: 180,
          fontFamily: font ? `'${font}', serif` : 'var(--serif-display)',
          fontSize: 14,
          borderRadius: open ? '8px 8px 0 0' : 8,
        }}
      >
        <span className="truncate">{font ?? 'Default'}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-(--ink-dim)" />
      </button>

      {createPortal(
        <AnimatePresence>
          {anchor && (
            <motion.div
              ref={popupRef}
              className="fixed z-7 overflow-hidden border border-(--line) border-t-0 bg-(--bg)"
              style={{
                top: anchor.top, left: anchor.left, width: anchor.width,
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                transformOrigin: 'center top',
              }}
              initial={{ opacity: 0, scaleY: 0.96, y: -4 }}
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              exit={{ opacity: 0, scaleY: 0.96, y: -4, transition: { duration: 0.1 } }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex flex-col p-1.5">
                <MagicInput
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search font…"
                  autoFocus
                  className="w-full input border-(--line)"
                  style={{
                    background: 'var(--bg)', borderWidth: '0.5px', borderRadius: 8,
                    padding: '8px 12px', fontFamily: 'var(--serif-display)', fontSize: 14,
                    color: 'var(--ink)', transition: 'border-color .15s',
                  }}
                  wrapperStyle={{ borderRadius: 10 }}
                />
                <div style={{ height: '0.5px', background: 'var(--line-soft)', margin: '6px 0' }} />
                {loading ? (
                  <p className="px-3 py-2 text-xs text-(--ink-dim)" style={{ fontFamily: 'var(--mono)' }}>Loading…</p>
                ) : error ? (
                  <p className="px-3 py-2 text-xs text-(--danger)" style={{ fontFamily: 'var(--mono)' }}>{error}</p>
                ) : (
                  <div className="overflow-y-auto max-h-56 flex flex-col gap-0.5">
                    <FontOption label="Default" active={!font} onClick={() => choose(null)} />
                    {filtered.map((f) => (
                      <FontOption
                        key={f.family}
                        label={f.family}
                        active={font === f.family}
                        fontFamily={`'${f.family}', serif`}
                        onClick={() => choose(f.family)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        getModalPortalRoot()
      )}
    </>
  );
};

interface FontOptionProps {
  label: string;
  active: boolean;
  fontFamily?: string;
  onClick: () => void;
}

const FontOption = ({ label, active, fontFamily, onClick }: FontOptionProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-(--surface-hi)"
    style={{ color: active ? 'var(--accent)' : 'var(--ink-mid)', fontFamily }}
  >
    <span className="truncate">{label}</span>
    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
  </button>
);

export default SettingsFontDropdown;

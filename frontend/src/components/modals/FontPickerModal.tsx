import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Modal from './Modal';
import { useSettingsStore } from '../../store/useSettingsStore';
import { themes } from '../../themes/themes';
import { useGoogleFonts } from '../../hooks/useGoogleFonts';
import { useGlassPill } from '../../hooks/useGlassPill';

interface FontPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFont: (family: string | null) => void;
  currentFont?: string;
}

const FontPickerModal = ({ isOpen, onClose, onSelectFont, currentFont }: FontPickerModalProps) => {
  const { theme } = useSettingsStore();
  const { fonts, loading, error } = useGoogleFonts();
  const [search, setSearch] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const { pill: pillRect, onEnter: onItemEnter, onLeave: onItemLeave } = useGlassPill(contentRef);

  const currentTheme = useMemo(() => themes[theme] || themes.sproutGreen, [theme]);

  const filteredFonts = useMemo(
    () => fonts.filter((f) => f.family.toLowerCase().includes(search.toLowerCase())),
    [fonts, search]
  );

  const handleSelect = (family: string | null) => {
    onSelectFont(family);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schriftart wählen">
      <div className="space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Schriftart suchen..."
          autoFocus
          className="w-full px-4 py-2 rounded-lg text-sm glass-border-box outline-none"
          style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }}
        />

        {loading ? (
          <p className="text-xs py-2" style={{ color: 'var(--color-text-secondary)' }}>Lade Schriften…</p>
        ) : error ? (
          <p className="text-xs py-2 text-red-400">{error}</p>
        ) : (
          /* Scrollable outer — only handles overflow, no positioning context */
          <div
            className="overflow-y-auto max-h-80"
            onMouseLeave={onItemLeave}
            onScroll={onItemLeave}
          >
            {/* Inner content div is the positioning context for the pill */}
            <div ref={contentRef} className="relative flex flex-col gap-1 pr-1">
              {pillRect && (
                <div
                  className="glass-pill pointer-events-none"
                  style={{ left: pillRect.left, top: pillRect.top, width: pillRect.width, height: pillRect.height, opacity: pillRect.visible ? 1 : 0 }}
                />
              )}

              <button
                type="button"
                onClick={() => handleSelect(null)}
                onMouseEnter={onItemEnter}
                className={clsx(
                  'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all text-sm relative z-10',
                  currentFont != null && currentFont !== '' && 'glass-border-box'
                )}
                style={!currentFont ? {
                  backgroundColor: `${currentTheme.colors.brandPrimary}10`,
                  border: `1px solid ${currentTheme.colors.brandPrimary}80`,
                  color: currentTheme.colors.brandPrimary,
                } : { background: 'transparent', color: 'var(--color-text-secondary)' }}
              >
                <span>Standard</span>
                {!currentFont && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.brandPrimary }} />}
              </button>

              {filteredFonts.map((font) => (
                <button
                  key={font.family}
                  type="button"
                  onClick={() => handleSelect(font.family)}
                  onMouseEnter={onItemEnter}
                  className={clsx(
                    'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all text-sm relative z-10',
                    currentFont !== font.family && 'glass-border-box'
                  )}
                  style={currentFont === font.family ? {
                    backgroundColor: `${currentTheme.colors.brandPrimary}10`,
                    border: `1px solid ${currentTheme.colors.brandPrimary}80`,
                    color: currentTheme.colors.brandPrimary,
                    fontFamily: `'${font.family}', sans-serif`,
                  } : {
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    fontFamily: `'${font.family}', sans-serif`,
                  }}
                >
                  <span>{font.family}</span>
                  {currentFont === font.family && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.brandPrimary }} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FontPickerModal;

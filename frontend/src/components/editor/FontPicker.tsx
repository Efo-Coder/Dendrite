import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useMagicHover } from '../../hooks/useMagicHover';
import { useSmartPopupStyle } from '../../hooks/useSmartPopupStyle';
import { useGoogleFonts } from '../../hooks/useGoogleFonts';
import { MagicInput } from '../ui/MagicInput';
import { useToolbarStateContext } from './ToolbarStateContext';
import { popupCls, popupPad, popupMotion, getPopupStyle } from './toolbarPopupUtils';

// Searchable Google-Fonts picker; state comes from ToolbarStateContext.
const FontPicker = () => {
  const { fontPickerPos, setFontPickerPos, fontFamily, applyFontFamily } = useToolbarStateContext();
  const { fonts: allFonts, loading, error } = useGoogleFonts();

  const [search, setSearch] = useState('');
  const filteredFonts = useMemo(
    () => allFonts.filter((f) => f.family.toLowerCase().includes(search.toLowerCase())),
    [allFonts, search]
  );
  useEffect(() => { if (!fontPickerPos) setSearch(''); }, [fontPickerPos]);

  const ref = useRef<HTMLDivElement>(null);
  const { onItemEnter, onItemLeave, Indicator } = useMagicHover({ mode: 'free', borderRadius: 8, ref });
  const { style, placement } = useSmartPopupStyle(fontPickerPos, ref, 0);

  return createPortal(
    <AnimatePresence>
      {fontPickerPos && (
      <>
      <div className="fixed inset-0" onClick={() => setFontPickerPos(null)} />
      <motion.div
        ref={ref}
        className={clsx(popupCls(placement, popupPad(placement, '1', '4')), 'magic-hover')}
        style={{ width: 220, ...style, ...getPopupStyle(placement) }}
        onMouseDown={(e) => e.preventDefault()}
        {...popupMotion(placement)}
      >
        {Indicator}
        <div className="flex flex-col px-1 py-1">
          <MagicInput
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search font..."
            className="w-full input border-(--line)"
            style={{
              background: 'var(--bg)',
              borderWidth: '0.5px',
              borderRadius: '8px',
              padding: '10px 14px',
              fontFamily: 'var(--serif-display)',
              fontSize: '15px',
              color: 'var(--ink)',
              transition: 'border-color .15s',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            wrapperStyle={{ borderRadius: '10px' }}
          />
          <div style={{ height: '0.5px', background: 'var(--line-soft)', margin: '8px 0' }} />
          {loading ? (
            <p style={{ color: 'var(--ink-dim)', fontFamily: 'var(--mono)', fontSize: 12 }}>Loading…</p>
          ) : error ? (
            <p style={{ color: 'var(--danger)', fontFamily: 'var(--mono)', fontSize: 12 }}>{error}</p>
          ) : (
            <div className="overflow-y-auto max-h-52">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => { applyFontFamily(''); setFontPickerPos(null); }}
                  onMouseEnter={onItemEnter} onMouseLeave={onItemLeave}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm"
                  style={!fontFamily ? {
                    backgroundColor: 'color-mix(in oklch, var(--accent) 10%, transparent)',
                    border: '1px solid color-mix(in oklch, var(--accent) 50%, transparent)',
                    color: 'var(--accent)',
                  } : { color: 'var(--ink-mid)' }}
                >
                  <span>Default</span>
                  {!fontFamily && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                </button>
                {filteredFonts.map((font) => (
                  <button
                    key={font.family}
                    type="button"
                    onClick={() => { applyFontFamily(font.family); setFontPickerPos(null); }}
                    onMouseEnter={onItemEnter} onMouseLeave={onItemLeave}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm"
                    style={fontFamily === font.family ? {
                      backgroundColor: 'color-mix(in oklch, var(--accent) 10%, transparent)',
                      border: '1px solid color-mix(in oklch, var(--accent) 50%, transparent)',
                      color: 'var(--accent)',
                      fontFamily: `'${font.family}', sans-serif`,
                    } : {
                      color: 'var(--ink-mid)',
                      fontFamily: `'${font.family}', sans-serif`,
                    }}
                  >
                    <span>{font.family}</span>
                    {fontFamily === font.family && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
      </>)}
    </AnimatePresence>,
    getModalPortalRoot()
  );
};

export default FontPicker;

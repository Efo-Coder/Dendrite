import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useSmartPopupStyle, type PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Pipette, X, Plus } from 'lucide-react';
import clsx from 'clsx';
import { hexToRgb, rgbToHex, hexToHsl, hslToHex } from './colorUtils';

interface ColorPickerPortalProps {
  position: PopupAnchor | null;
  onClose: () => void;
  color: string;
  onChange: (color: string) => void;
  presets: { label: string; value: string }[];
  storageKey: string;
  fallbackColor?: string;
  padding?: number;
  canFavorite?: boolean;
  canCustomColor?: boolean;
}

const ColorPickerPortal = ({
  position,
  onClose,
  color,
  onChange,
  presets,
  storageKey,
  fallbackColor = '#000000',
  padding = 8,
  canFavorite = true,
  canCustomColor = true,
}: ColorPickerPortalProps) => {
  const [inputMode, setInputMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const popupRef = useRef<HTMLDivElement>(null);
  const { style: popupStyle, placement } = useSmartPopupStyle(position, popupRef, padding);
  const isLeft = placement === 'left';
  const isAbove = placement === 'above';

  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  });

  const safeHex = color && color.startsWith('#') ? color : fallbackColor;

  const addToFavorites = () => {
    if (!color || favorites.includes(color) || presets.some(p => p.value === color) || favorites.length >= 13) return;
    const next = [...favorites, color];
    setFavorites(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const removeFromFavorites = (c: string) => {
    const next = favorites.filter(f => f !== c);
    setFavorites(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const openEyeDropper = async () => {
    if (!('EyeDropper' in window)) return;
    try {
      const eyeDropper = new (window as unknown as { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper();
      const { sRGBHex } = await eyeDropper.open();
      onChange(sRGBHex);
    } catch {}
  };

  const canAdd = color && !favorites.includes(color) && !presets.some(p => p.value === color) && favorites.length < 13;

  return createPortal(
    <>
      {position && !isLeft && <div className="fixed inset-0" onClick={onClose} />}
      <AnimatePresence>
      {position && (
      <motion.div
        // Re-mount when placement flips so framer's `initial` uses the final direction.
        key={placement}
        ref={popupRef}
        className={clsx(
          'fixed',
          isLeft
            ? 'z-3 overflow-y-auto glass-popup'
            : clsx('border border-(--line) overflow-hidden', isAbove ? 'border-b-0' : 'border-t-0'),
        )}
        style={{
          ...popupStyle,
          ...(isLeft
            // Surface comes from .glass-popup (identical to the panel); only the seam here.
            ? { borderRadius: '1rem 0 0 1rem', borderRightWidth: 0 }
            : {
                background: 'transparent',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: isAbove ? '1rem 1rem 0 0' : '0 0 1rem 1rem',
                clipPath: isAbove ? 'inset(0 round 1rem 1rem 0 0)' : 'inset(0 round 0 0 1rem 1rem)',
                transformOrigin: isAbove ? 'center bottom' : 'center top',
              }),
        }}
        {...(isLeft
          ? {
              // Fade + slide out of the panel's left edge — matches the More panel's motion.
              // y:-50% pairs with top:50% (from useSmartPopupStyle) to centre exactly like the panel.
              initial: { opacity: 0, x: '100%', y: '-50%' },
              animate: { opacity: 1, x: 0, y: '-50%' },
              exit: { opacity: 0, x: '100%', y: '-50%', transition: { duration: 0.18 } },
              transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
            }
          : {
              // Rest at the computed position and slide in from the opening direction:
              // above → upward (starts below), below → downward (starts above).
              initial: { opacity: 0, scale: 0.97, y: isAbove ? 14 : -14 },
              animate: { opacity: 1, scale: 1, y: 0 },
              exit: { opacity: 0, scale: 0.97, y: isAbove ? 14 : -14, transition: { duration: 0.1 } },
              transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
            })}
        onMouseDown={(e) => { if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-2 flex flex-col gap-1 ${isLeft ? '' : isAbove ? 'pb-7' : 'pt-7'}`}>
          <div className="flex flex-wrap gap-1">
            {presets.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => { onChange(value); onClose(); }}
                title={label}
                className={clsx(
                  'w-6 h-6 rounded-md transition-transform hover:scale-110 shrink-0',
                  color === value ? 'ring-2 ring-brand-primary' : 'ring-1 ring-white/20'
                )}
                style={{
                  backgroundColor: value || 'transparent',
                  backgroundImage: !value ? 'repeating-linear-gradient(45deg, rgba(150,150,150,0.5) 0, rgba(150,150,150,0.5) 1px, transparent 0, transparent 50%)' : undefined,
                  backgroundSize: !value ? '4px 4px' : undefined,
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 flex-wrap min-h-6">
            {favorites.map((fav) => (
              <div key={fav} className="relative group/fav w-6 h-6 shrink-0">
                <button
                  onClick={() => { onChange(fav); onClose(); }}
                  title={fav}
                  className={clsx(
                    'w-6 h-6 rounded-md transition-transform hover:scale-110',
                    color === fav ? 'ring-2 ring-brand-primary' : 'ring-1 ring-white/20'
                  )}
                  style={{ backgroundColor: fav }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromFavorites(fav); }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/70 text-white opacity-0 group-hover/fav:opacity-100 transition-opacity grid place-items-center leading-none"
                  title="Remove"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            ))}
            <button
              onClick={canFavorite ? addToFavorites : undefined}
              disabled={!canFavorite}
              title={canFavorite ? 'Add current color to favorites' : 'Favorites — Writer plan required'}
              data-plan-locked={!canFavorite || undefined}
              className={clsx(
                'w-6 h-6 rounded-md ring-1 ring-(--ink-low) flex items-center justify-center transition-colors shrink-0',
                !canFavorite
                  ? 'text-(--ink-low) opacity-30'
                  : canAdd
                    ? 'text-(--ink-low) hover:text-(--ink) hover:ring-(--ink)'
                    : 'text-(--ink-low) opacity-30 pointer-events-none'
              )}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div data-plan-locked={!canCustomColor || undefined} style={!canCustomColor ? { pointerEvents: 'none', opacity: 0.35 } : undefined}>
              <HexColorPicker
                color={safeHex}
                onChange={onChange}
                style={{ width: '100%', height: '140px' }}
              />

              <div className="flex items-center gap-1 relative rounded-lg overflow-hidden">
                {(['hex', 'rgb', 'hsl'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    className={clsx(
                      'flex-1 h-8 rounded text-xs font-medium uppercase tracking-wide transition-colors relative z-1',
                      inputMode === mode ? 'text-(--ink)' : 'text-(--ink-low) hover:text-(--ink)'
                    )}
                  >
                    {mode}
                  </button>
                ))}
                <button
                  onClick={openEyeDropper}
                  title="Eyedropper"
                  className={clsx(
                    'h-8 w-8 flex items-center justify-center rounded transition-colors relative z-1 shrink-0',
                    !('EyeDropper' in window) ? 'opacity-30 pointer-events-none text-(--ink-low)' : 'text-(--ink-low) hover:text-(--ink)'
                  )}
                >
                  <Pipette className="w-3.5 h-3.5" />
                </button>
              </div>

              {inputMode === 'hex' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-lg pb-2 text-(--ink-low) select-none">#</span>
                  <HexColorInput
                    color={safeHex}
                    onChange={onChange}
                    className="input text-xs h-7 px-2 flex-1"
                    style={{ minWidth: 0, fontFamily: 'Inter' }}
                  />
                </div>
              )}

              {inputMode === 'rgb' && (() => {
                const rgb = hexToRgb(safeHex) ?? { r: 0, g: 0, b: 0 };
                return (
                  <div className="grid grid-cols-3 gap-1">
                    {(['r', 'g', 'b'] as const).map((ch) => (
                      <div key={ch} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-(--ink-low) uppercase">{ch}</span>
                        <input
                          type="number" min={0} max={255}
                          value={rgb[ch]}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(255, Number(e.target.value)));
                            onChange(rgbToHex(ch === 'r' ? v : rgb.r, ch === 'g' ? v : rgb.g, ch === 'b' ? v : rgb.b));
                          }}
                          className="input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          style={{ fontFamily: 'Inter' }}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {inputMode === 'hsl' && (() => {
                const hsl = hexToHsl(safeHex);
                return (
                  <div className="grid grid-cols-3 gap-1">
                    {([['h', hsl.h, 360], ['s', hsl.s, 100], ['l', hsl.l, 100]] as const).map(([ch, val, max]) => (
                      <div key={ch} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-(--ink-low) uppercase">{ch}</span>
                        <input
                          type="number" min={0} max={max}
                          value={val}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(max, Number(e.target.value)));
                            onChange(hslToHex(ch === 'h' ? v : hsl.h, ch === 's' ? v : hsl.s, ch === 'l' ? v : hsl.l));
                          }}
                          className="input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          style={{ fontFamily: 'Inter' }}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
          </div>
        </div>
      </motion.div>
      )}
      </AnimatePresence>
    </>,
    getModalPortalRoot()
  );
};

export default ColorPickerPortal;

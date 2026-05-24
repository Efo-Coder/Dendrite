import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useSmartPopupStyle, type PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Pipette, X, Plus } from 'lucide-react';
import { useGlassPill } from '../../hooks/useGlassPill';
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
}

const ColorPickerPortal = ({
  position,
  onClose,
  color,
  onChange,
  presets,
  storageKey,
  fallbackColor = '#000000',
}: ColorPickerPortalProps) => {
  const [inputMode, setInputMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const modeTabsRef = useRef<HTMLDivElement>(null);
  const { pill, onEnter, onLeave } = useGlassPill(modeTabsRef);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupStyle = useSmartPopupStyle(position, popupRef);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  });

  if (!position) return null;

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
      const eyeDropper = new (window as any).EyeDropper();
      const { sRGBHex } = await eyeDropper.open();
      onChange(sRGBHex);
    } catch {}
  };

  const canAdd = color && !favorites.includes(color) && !presets.some(p => p.value === color) && favorites.length < 13;

  return createPortal(
    <>
      <div className="fixed inset-0" onClick={onClose} />
      <div
        ref={popupRef}
        className="fixed glass-popup rounded-xl shadow-xl"
        style={{ ...popupStyle, width: '220px' }}
        onMouseDown={(e) => { if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 flex flex-col gap-1">
          <div className="flex flex-wrap gap-1">
            {presets.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => { onChange(value); onClose(); }}
                title={label}
                className={clsx(
                  'w-6 h-6 rounded-md transition-transform hover:scale-110 flex-shrink-0',
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

          <div className="flex items-center gap-1 flex-wrap min-h-[1.5rem]">
            {favorites.map((fav) => (
              <div key={fav} className="relative group/fav w-6 h-6 flex-shrink-0">
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
                  title="Entfernen"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            ))}
            <button
              onClick={addToFavorites}
              title="Aktuelle Farbe zu Favoriten hinzufügen"
              className={clsx(
                'w-6 h-6 rounded-md ring-1 ring-text-muted flex items-center justify-center transition-colors flex-shrink-0',
                canAdd
                  ? 'text-text-muted hover:text-text-primary hover:ring-text-primary'
                  : 'text-text-muted opacity-30 pointer-events-none'
              )}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <HexColorPicker
            color={safeHex}
            onChange={onChange}
            style={{ width: '100%', height: '140px' }}
          />

          <div
            ref={modeTabsRef}
            className="flex items-center gap-1 relative rounded-lg overflow-hidden"
            onMouseLeave={onLeave}
          >
            {pill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height, opacity: pill.visible ? 1 : 0 }}
              />
            )}
            {(['hex', 'rgb', 'hsl'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                onMouseEnter={(e) => onEnter(e, inputMode === mode)}
                className={clsx(
                  'flex-1 h-8 rounded text-xs font-medium uppercase tracking-wide transition-colors relative z-10',
                  inputMode === mode ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {mode}
              </button>
            ))}
            <button
              onClick={openEyeDropper}
              onMouseEnter={(e) => onEnter(e, false)}
              title="Pipette"
              className={clsx(
                'h-8 w-8 flex items-center justify-center rounded transition-colors relative z-10 flex-shrink-0',
                !('EyeDropper' in window) ? 'opacity-30 pointer-events-none text-text-muted' : 'text-text-muted hover:text-text-primary'
              )}
            >
              <Pipette className="w-3.5 h-3.5" />
            </button>
          </div>

          {inputMode === 'hex' && (
            <div className="flex items-center gap-1.5">
              <span className="text-lg pb-2 text-text-muted select-none">#</span>
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
                    <span className="text-[10px] text-text-muted uppercase">{ch}</span>
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
                    <span className="text-[10px] text-text-muted uppercase">{ch}</span>
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
    </>,
    getModalPortalRoot()
  );
};

export default ColorPickerPortal;

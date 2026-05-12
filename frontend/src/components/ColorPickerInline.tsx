import { useRef, useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Pipette, X, Plus } from 'lucide-react';
import { useGlassPill } from '../hooks/useGlassPill';
import clsx from 'clsx';

const hexToRgb = (hex: string) => {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
};

const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');

const hexToHsl = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, l: 0 };
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToHex = (h: number, s: number, l: number) => {
  const sl = s / 100, ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

interface ColorPickerInlineProps {
  color: string;
  onChange: (color: string) => void;
  storageKey?: string;
  presets?: string[];
}

const ColorPickerInline = ({ color, onChange, storageKey = 'dendrite-picker-favorites', presets = [] }: ColorPickerInlineProps) => {
  const [inputMode, setInputMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const modeTabsRef = useRef<HTMLDivElement>(null);
  const { pill, onEnter, onLeave } = useGlassPill(modeTabsRef);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  });

  const safeHex = color && color.startsWith('#') ? color : '#000000';

  const addToFavorites = () => {
    if (!color || favorites.includes(color) || presets.includes(color) || favorites.length >= 19) return;
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
    } catch {
      // user cancelled
    }
  };

  const canAdd = color && !favorites.includes(color) && !presets.includes(color) && favorites.length < 19;

  return (
    <div className="flex flex-col gap-2">
      {/* Favorites row */}
      <div className="flex items-center gap-2 flex-wrap min-h-[1.5rem]">
        {favorites.map((fav) => (
          <div key={fav} className="relative group/fav w-8 h-8 flex-shrink-0">
            <button
              type="button"
              onClick={() => onChange(fav)}
              title={fav}
              className={clsx(
                'w-8 h-8 rounded-lg transition-transform hover:scale-110',
                color === fav ? 'ring-2 ring-brand-primary' : 'ring-1 ring-white/19'
              )}
              style={{ backgroundColor: fav }}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeFromFavorites(fav); }}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/70 text-white opacity-0 group-hover/fav:opacity-100 transition-opacity grid place-items-center leading-none"
              title="Entfernen"
            >
              <X className="w-2 h-2" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addToFavorites}
          title="Aktuelle Farbe zu Favoriten hinzufügen"
          className={clsx(
            'w-8 h-8 rounded-lg ring-1 ring-[color-mix(in_srgb,var(--color-text-secondary)_70%,transparent)] flex items-center justify-center transition-colors flex-shrink-0',
            canAdd
              ? 'text-[color-mix(in_srgb,var(--color-text-secondary)_70%,transparent)] hover:text-text-primary hover:ring-text-primary'
              : 'text-[color-mix(in_srgb,var(--color-text-secondary)_70%,transparent)] opacity-30 pointer-events-none'
          )}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <HexColorPicker
        color={safeHex}
        onChange={onChange}
        style={{ width: '100%', height: '160px' }}
      />

      {/* Format tabs + eyedropper */}
      <div
        ref={modeTabsRef}
        className="flex items-center gap-1 relative rounded-lg overflow-hidden"
        onMouseLeave={onLeave}
      >
        {pill && (
          <div
            className="glass-pill pointer-events-none"
            style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
          />
        )}
        {(['hex', 'rgb', 'hsl'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setInputMode(mode)}
            onMouseEnter={(e) => onEnter(e, inputMode === mode)}
            className={clsx(
              'flex-1 h-8 rounded text-[10px] font-medium uppercase tracking-wide transition-colors relative z-10',
              inputMode === mode ? 'text-text-primary' : 'text-[color-mix(in_srgb,var(--color-text-secondary)_70%,transparent)] hover:text-text-primary'
            )}
          >
            {mode}
          </button>
        ))}
        <button
          type="button"
          onClick={openEyeDropper}
          onMouseEnter={(e) => onEnter(e, false)}
          title="Pipette"
          className={clsx(
            'h-8 w-8 flex items-center justify-center rounded transition-colors relative z-10 flex-shrink-0',
            !('EyeDropper' in window) ? 'opacity-30 pointer-events-none text-text-secondary' : 'text-[color-mix(in_srgb,var(--color-text-secondary)_70%,transparent)] hover:text-text-primary'
          )}
        >
          <Pipette className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Format inputs */}
      {inputMode === 'hex' && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color-mix(in_srgb,var(--color-text-secondary)_70%,transparent)] select-none">#</span>
          <HexColorInput
            color={safeHex}
            onChange={onChange}
            className="input text-xs h-7 px-2 flex-1"
            style={{ minWidth: 0 }}
          />
        </div>
      )}

      {inputMode === 'rgb' && (() => {
        const rgb = hexToRgb(safeHex) ?? { r: 0, g: 0, b: 0 };
        return (
          <div className="grid grid-cols-3 gap-1">
            {(['r', 'g', 'b'] as const).map((ch) => (
              <div key={ch} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-text-secondary uppercase">{ch}</span>
                <input
                  type="number" min={0} max={255}
                  value={rgb[ch]}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(255, Number(e.target.value)));
                    onChange(rgbToHex(ch === 'r' ? v : rgb.r, ch === 'g' ? v : rgb.g, ch === 'b' ? v : rgb.b));
                  }}
                  className="input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                <span className="text-[10px] text-text-secondary uppercase">{ch}</span>
                <input
                  type="number" min={0} max={max}
                  value={val}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(max, Number(e.target.value)));
                    onChange(hslToHex(ch === 'h' ? v : hsl.h, ch === 's' ? v : hsl.s, ch === 'l' ? v : hsl.l));
                  }}
                  className="input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default ColorPickerInline;

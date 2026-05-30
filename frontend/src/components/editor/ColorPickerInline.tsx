import { useRef, useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Pipette, X, Plus } from 'lucide-react';
import clsx from 'clsx';
import { hexToRgb, rgbToHex, hexToHsl, hslToHex } from './colorUtils';

interface ColorPickerInlineProps {
  color: string;
  onChange: (color: string) => void;
  storageKey?: string;
  presets?: string[];
}

const ColorPickerInline = ({ color, onChange, storageKey = 'dendrite-picker-favorites', presets = [] }: ColorPickerInlineProps) => {
  const [inputMode, setInputMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
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
      {presets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              title={preset}
              className={clsx(
                'w-8 h-8 rounded-lg transition-transform hover:scale-110 shrink-0',
                color === preset ? 'ring-2 ring-(--accent)' : 'ring-1 ring-white/19'
              )}
              style={{ backgroundColor: preset }}
            />
          ))}
        </div>
      )}

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
              title="Remove"
            >
              <X className="w-2 h-2" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addToFavorites}
          title="Add current color to favorites"
          className={clsx(
            'w-8 h-8 rounded-lg ring-1 ring-[color-mix(in_srgb,var(--ink-mid)_70%,transparent)] flex items-center justify-center transition-colors flex-shrink-0',
            canAdd
              ? 'text-[color-mix(in_srgb,var(--ink-mid)_70%,transparent)] hover:text-(--ink) hover:ring-(--ink)'
              : 'text-[color-mix(in_srgb,var(--ink-mid)_70%,transparent)] opacity-30 pointer-events-none'
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
      <div className="flex items-center gap-1 relative rounded-lg overflow-hidden">
        {(['hex', 'rgb', 'hsl'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setInputMode(mode)}
            className={clsx(
              'flex-1 h-8 rounded text-base font-medium uppercase tracking-wide transition-colors relative z-10',
              inputMode === mode ? 'text-(--ink)' : 'text-[color-mix(in_srgb,var(--ink-mid)_70%,transparent)] hover:text-(--ink)'
            )}
          >
            {mode}
          </button>
        ))}
        <button
          type="button"
          onClick={openEyeDropper}
          title="Eyedropper"
          className={clsx(
            'h-8 w-8 flex items-center justify-center rounded transition-colors relative z-10 flex-shrink-0',
            !('EyeDropper' in window) ? 'opacity-30 pointer-events-none text-(--ink-mid)' : 'text-[color-mix(in_srgb,var(--ink-mid)_70%,transparent)] hover:text-(--ink)'
          )}
        >
          <Pipette className="w-4 h-4" />
        </button>
      </div>

      {/* Format inputs */}
      {inputMode === 'hex' && (
        <div className="flex items-center gap-1.5">
          <span className="text-xl pb-2 text-(--ink-dim) select-none">#</span>
          <HexColorInput
            color={safeHex}
            onChange={onChange}
            className="modal-input text-sm h-8 px-2 flex-1"
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
                <span className="text-[10px] text-(--ink-dim) uppercase">{ch}</span>
                <input
                  type="number" min={0} max={255}
                  value={rgb[ch]}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(255, Number(e.target.value)));
                    onChange(rgbToHex(ch === 'r' ? v : rgb.r, ch === 'g' ? v : rgb.g, ch === 'b' ? v : rgb.b));
                  }}
                  className="modal-input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                <span className="text-[10px] text-(--ink-dim) uppercase">{ch}</span>
                <input
                  type="number" min={0} max={max}
                  value={val}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(max, Number(e.target.value)));
                    onChange(hslToHex(ch === 'h' ? v : hsl.h, ch === 's' ? v : hsl.s, ch === 'l' ? v : hsl.l));
                  }}
                  className="modal-input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  style={{ fontFamily: 'Inter' }}
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

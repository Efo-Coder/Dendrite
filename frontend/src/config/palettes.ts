import { PaletteId } from '../store/useSettingsStore';

// Shared palette catalogue — used by the appearance settings and the PDF export
// picker so both stay in sync. The color is the swatch preview, not a token.
export const PALETTES: { id: PaletteId; name: string; color: string }[] = [
  { id: 'onyx',     name: 'Onyx & Champagne', color: 'oklch(0.2253 0.0084 79.15)' },
  { id: 'bordeaux', name: 'Bordeaux & Cream',  color: 'oklch(0.1518 0.0947 25)'   },
  { id: 'forest',   name: 'Forest & Brass',    color: 'oklch(0.2341 0.0306 165)'  },
  { id: 'midnight', name: 'Midnight & Rose',   color: 'oklch(0.2341 0.038 260)'   },
  { id: 'obsidian', name: 'Obsidian & Ivory',  color: 'oklch(0.3056 0.006 0)'     },
  { id: 'nacre',    name: 'Nacre & Rose Gold', color: 'oklch(0.2724 0.0429 15)'   },
];

// Card cover presets bundled with the frontend and served from /public (not the API),
// so their paths stay relative to the frontend origin — see resolveUrl in CoverCard.
// Random assignment on create skips the decorative "Flower" pieces (randomizable: false).

export interface CoverPreset {
  label: string;
  src: string;
  randomizable: boolean;
}

const BASE = '/img/presets';

export const COVER_PRESETS: CoverPreset[] = [
  { label: 'Book', src: `${BASE}/book.webp`, randomizable: true },
  { label: 'Clay', src: `${BASE}/clay.webp`, randomizable: true },
  { label: 'Clay 2', src: `${BASE}/clay-2.webp`, randomizable: true },
  { label: 'Flower 1', src: `${BASE}/flower-1.webp`, randomizable: false },
  { label: 'Flower 2', src: `${BASE}/flower-2.webp`, randomizable: false },
  { label: 'Handmade Paper', src: `${BASE}/handmade-paper.webp`, randomizable: true },
  { label: 'Learning', src: `${BASE}/learning.webp`, randomizable: true },
  { label: 'Learning 2', src: `${BASE}/learning-2.webp`, randomizable: true },
  { label: 'Learning 3', src: `${BASE}/learning-3.webp`, randomizable: true },
  { label: 'Linen', src: `${BASE}/linen.webp`, randomizable: true },
  { label: 'Sand Wall', src: `${BASE}/sand-wall.webp`, randomizable: true },
  { label: 'Stone', src: `${BASE}/stone.webp`, randomizable: true },
  { label: 'Walnut Wood', src: `${BASE}/walnut-wood.webp`, randomizable: true },
  { label: 'White Stone', src: `${BASE}/white-stone.webp`, randomizable: true },
  { label: 'Wood', src: `${BASE}/wood.webp`, randomizable: true },
];

// Pick a random preset for newly created notes/folders, skipping the flowers
// so they only appear when chosen on purpose.
export function randomCoverPreset(): string {
  const pool = COVER_PRESETS.filter((p) => p.randomizable);
  return pool[Math.floor(Math.random() * pool.length)].src;
}

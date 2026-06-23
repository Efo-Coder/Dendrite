import { useEffect, useState } from 'react';
import type { CardViewMode } from '../lib/viewMode';

const isMode = (v: unknown): v is CardViewMode => v === 'tile' || v === 'small' || v === 'list';
const read = (storageKey: string): CardViewMode => {
  const v = localStorage.getItem(storageKey);
  return isMode(v) ? v : 'tile';
};

// Persisted card-layout preference, scoped per key so each full view remembers its own
// layout. The key can change without a remount (e.g. switching note category), so it
// re-reads on a key change via the "adjust state during render" pattern.
export function useViewMode(key: string): [CardViewMode, (mode: CardViewMode) => void] {
  const storageKey = `view:${key}`;
  const [mode, setMode] = useState<CardViewMode>(() => read(storageKey));
  const [prevKey, setPrevKey] = useState(storageKey);
  if (storageKey !== prevKey) {
    setPrevKey(storageKey);
    setMode(read(storageKey));
  }
  useEffect(() => { localStorage.setItem(storageKey, mode); }, [storageKey, mode]);
  return [mode, setMode];
}

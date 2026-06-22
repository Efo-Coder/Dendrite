import { useEffect, useReducer, useRef } from 'react';

// Keeps just-removed items mounted briefly (flagged `leaving`) so they can play an
// exit animation before being dropped, re-inserting them at their previous slot so
// they fade in place. The removal is detected *during render* (not in an effect) so
// the card never unmounts first — otherwise there'd be nothing left to animate.
export function useLeaving<T>(
  list: T[],
  getId: (item: T) => string,
  ms = 260,
): { item: T; leaving: boolean }[] {
  const prevList = useRef<T[]>([]);
  const leaving = useRef<Map<string, { item: T; index: number }>>(new Map());
  const timers = useRef<Map<string, number>>(new Map());
  const [, force] = useReducer((c: number) => c + 1, 0);

  const ids = new Set(list.map(getId));

  // A reappeared/re-created item cancels its exit.
  for (const id of Array.from(leaving.current.keys())) {
    if (ids.has(id)) {
      leaving.current.delete(id);
      const t = timers.current.get(id);
      if (t) {
        clearTimeout(t);
        timers.current.delete(id);
      }
    }
  }
  // Items present last render but gone now start leaving, held at their old index.
  prevList.current.forEach((p, i) => {
    const id = getId(p);
    if (!ids.has(id) && !leaving.current.has(id)) leaving.current.set(id, { item: p, index: i });
  });
  prevList.current = list;

  const rendered = list.map((item) => ({ item, leaving: false }));
  for (const { item, index } of Array.from(leaving.current.values()).sort((a, b) => a.index - b.index)) {
    rendered.splice(Math.min(index, rendered.length), 0, { item, leaving: true });
  }

  // Schedule the actual drop once the exit animation has played.
  useEffect(() => {
    leaving.current.forEach((_, id) => {
      if (timers.current.has(id)) return;
      const t = window.setTimeout(() => {
        leaving.current.delete(id);
        timers.current.delete(id);
        force();
      }, ms);
      timers.current.set(id, t);
    });
  });

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => clearTimeout(id));
  }, []);

  return rendered;
}

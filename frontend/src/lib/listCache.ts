// Caches fetched lists in sessionStorage so a reload renders the previous content
// immediately (stable layout → exact scroll restore), then refreshes in the
// background. Best-effort: a stale/missing entry just means the list starts empty.

function read<T>(key: string): T | null {
  try {
    const v = sessionStorage.getItem(`dendrite:list:${key}`);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export function getCachedList<T>(key: string): T[] | null {
  return read<T[]>(key);
}

export function setCachedList<T>(key: string, data: T[]): void {
  try {
    sessionStorage.setItem(`dendrite:list:${key}`, JSON.stringify(data));
  } catch {
    /* ignore quota/serialization errors */
  }
}

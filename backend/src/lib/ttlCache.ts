// Minimal in-process TTL cache. Fits this deployment deliberately: the backend
// runs as a single instance (see notificationHub.ts), so an external store
// like Redis would be dead infrastructure. If the app ever scales
// horizontally, swap the internals here and the call sites stay unchanged.

interface Entry<T> {
  value: Promise<T>;
  expiresAt: number;
}

const PRUNE_THRESHOLD = 500; // keeps per-user keys from accumulating forever

export class TtlCache<T> {
  private entries = new Map<string, Entry<T>>();

  constructor(private ttlMs: number) {}

  // Concurrent callers of the same key share one in-flight build, so a cache
  // miss under load triggers exactly one expensive query, not a stampede.
  getOrBuild(key: string, build: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > now) return hit.value;

    if (this.entries.size >= PRUNE_THRESHOLD) this.prune(now);

    const value = build().catch((err) => {
      // A failed build must not be served as a hit for the rest of the TTL.
      this.entries.delete(key);
      throw err;
    });
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
    return value;
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}

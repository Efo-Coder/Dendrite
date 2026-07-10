// Monthly AI-summarize quota per plan. null = unlimited (author); 0 locks the
// feature (free). Shared by the enforcement path and the usage endpoint so both
// agree on the limit and on when a stored count still counts for "this month".

export const SUMMARIZE_LIMITS = { free: 0, writer: 10, author: null } as const;

export interface SummarizeUsage {
  used: number;
  limit: number | null;
}

// Calendar month in UTC, "YYYY-MM" — the key a user's count is scoped to.
export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

// A stored count only applies when its month is the current one; a stale month
// reads as zero used (the reset is materialised lazily on the next write).
export function resolveUsage(
  plan: string | null | undefined,
  month: string | null,
  count: number,
  period = currentPeriod(),
): SummarizeUsage {
  const p = (plan || 'free').toLowerCase();
  const limit = p in SUMMARIZE_LIMITS ? SUMMARIZE_LIMITS[p as keyof typeof SUMMARIZE_LIMITS] : 0;
  const used = month === period ? count : 0;
  return { used, limit };
}

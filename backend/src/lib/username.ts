// Username rules and helpers, shared by registration, profile updates, the
// availability check and the one-off backfill script — so the format can never
// drift between "derive a handle" and "validate a chosen handle".

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

// Lower-case letters, digits, dot and underscore. Case is normalised away so the
// unique constraint is effectively case-insensitive.
const USERNAME_REGEX = /^[a-z0-9_.]+$/;

// Reserved to keep route-like and impersonation handles free (e.g. /@admin).
const RESERVED = new Set([
  'admin', 'api', 'dendrite', 'support', 'help', 'settings',
  'about', 'root', 'system', 'user', 'me', 'explore',
]);

// German umlauts must be expanded before NFKD strips the remaining diacritics,
// otherwise "ä" would collapse to "a" and lose the "e".
function transliterate(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, ''); // strip remaining combining diacritics
}

// Aggressive cleanup for *deriving* a handle from a name or email. Always returns
// a format-valid base (length within bounds, only allowed characters); never throws.
export function deriveUsernameBase(source: string): string {
  let s = transliterate(source)
    .replace(/[^a-z0-9_.]+/g, '_') // invalid runs → single underscore
    .replace(/[_.]{2,}/g, '_') // collapse repeated separators
    .replace(/^[_.]+|[_.]+$/g, ''); // trim separators at the edges
  if (!s) s = 'user';
  if (s.length < USERNAME_MIN) s = s.padEnd(USERNAME_MIN, '0');
  return s.slice(0, USERNAME_MAX);
}

// Strict validation for a *user-chosen* handle. Lower-cases and trims first, then
// rejects rather than silently rewriting — clearer feedback in the UI.
export function validateUsername(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim().toLowerCase();
  if (value.length < USERNAME_MIN) {
    return { ok: false, error: `Username must be at least ${USERNAME_MIN} characters` };
  }
  if (value.length > USERNAME_MAX) {
    return { ok: false, error: `Username must be at most ${USERNAME_MAX} characters` };
  }
  if (!USERNAME_REGEX.test(value)) {
    return { ok: false, error: 'Only letters, numbers, "." and "_" are allowed' };
  }
  if (RESERVED.has(value)) {
    return { ok: false, error: 'This username is reserved' };
  }
  return { ok: true, value };
}

// Appends a numeric suffix until the candidate is free. `isTaken` is supplied by
// the caller (a Prisma lookup at runtime, an in-memory set during backfill), so
// this stays decoupled from the database.
export async function generateUniqueUsername(
  source: string,
  isTaken: (candidate: string) => boolean | Promise<boolean>,
): Promise<string> {
  const root = deriveUsernameBase(source);
  if (!(await isTaken(root))) return root;
  for (let n = 2; n < 1_000_000; n++) {
    const suffix = String(n);
    const candidate = root.slice(0, USERNAME_MAX - suffix.length) + suffix;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error('Could not generate a unique username');
}

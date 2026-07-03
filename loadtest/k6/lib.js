// Shared helpers for all k6 scenarios. Reads the fixture produced by
// backend/scripts/loadtest-seed.ts (see loadtest/README.md for the workflow).

import { check } from 'k6';

export const BASE = __ENV.BASE_URL || 'http://localhost:3000';

// The fixture stays in backend/ because the seed script runs inside the
// backend container, whose mount ends at that directory.
export const SEED = JSON.parse(open('../../backend/loadtest-seed.json'));

export const WRITERS = SEED.users.filter((u) => u.plan === 'writer');

// `name` collapses per-id URLs into one metric series; `kind` feeds thresholds.
export function authParams(user, name, kind) {
  return {
    headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
    tags: { name, kind },
  };
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Stable user per VU so parallel writers never touch each other's rows.
export function vuUser() {
  return SEED.users[(__VU - 1) % SEED.users.length];
}

// Distinct note per VU even when two VUs map to the same user.
export function vuNote(u) {
  return u.noteIds[Math.floor((__VU - 1) / SEED.users.length) % u.noteIds.length];
}

export function ok(res, label) {
  return check(res, { [`${label}: 2xx`]: (r) => r.status >= 200 && r.status < 300 });
}

export function paragraph() {
  const words = Array.from({ length: 12 }, () => pick(SEED.searchTerms));
  return `<p>${words.join(' ')}.</p>`;
}

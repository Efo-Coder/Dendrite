// Realistic mixed traffic against the local stack: browsing readers, editors
// autosaving, and social actions — the "app under normal load" reference run.
// Export the summary and compare it before/after performance changes:
//
//   k6 run baseline.js --summary-export ../results/baseline-<label>.json

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE, SEED, authParams, ok, pick, vuUser, vuNote, paragraph } from './lib.js';

export const options = {
  scenarios: {
    browse: {
      executor: 'constant-arrival-rate',
      rate: 15, timeUnit: '1s', duration: '2m',
      preAllocatedVUs: 30, maxVUs: 80,
      exec: 'browse',
    },
    editor: { executor: 'constant-vus', vus: 12, duration: '2m', exec: 'editor' },
    social: {
      executor: 'constant-arrival-rate',
      rate: 4, timeUnit: '1s', duration: '2m',
      preAllocatedVUs: 8, maxVUs: 20,
      exec: 'social',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:read}': ['p(95)<500'],
    'http_req_duration{kind:write}': ['p(95)<800'],
  },
};

// A reader session: own note list, one note, an explore feed, one article, a profile.
export function browse() {
  const u = pick(SEED.users);
  ok(http.get(`${BASE}/api/notes`, authParams(u, 'notes-list', 'read')), 'notes list');
  ok(http.get(`${BASE}/api/notes/${pick(u.noteIds)}`, authParams(u, 'note-detail', 'read')), 'note detail');
  const feed = pick(['trending', 'featured', '']);
  ok(http.get(`${BASE}/api/published?feed=${feed}`, authParams(u, 'explore-feed', 'read')), 'explore feed');
  ok(http.get(`${BASE}/api/published/${pick(SEED.allPublishedIds)}`, authParams(u, 'published-detail', 'read')), 'published detail');
  ok(http.get(`${BASE}/api/users/${pick(SEED.users).id}`, authParams(u, 'profile', 'read')), 'profile');
}

// A typing session: ~20 autosaves a couple of seconds apart, content growing
// like real edits, with an occasional in-note search.
export function editor() {
  const u = vuUser();
  const noteId = vuNote(u);
  let content = `<h2>k6 session</h2>`;
  for (let i = 0; i < 20; i++) {
    content += paragraph();
    ok(
      http.put(`${BASE}/api/notes/${noteId}`, JSON.stringify({ content }), authParams(u, 'autosave', 'write')),
      'autosave',
    );
    if (i % 6 === 5) {
      ok(
        http.get(`${BASE}/api/notes/search?q=${pick(SEED.searchTerms)}`, authParams(u, 'note-search', 'read')),
        'note search',
      );
    }
    sleep(1.5 + Math.random());
  }
}

// Social actions: like + unlike an article, follow someone.
export function social() {
  const u = pick(SEED.users);
  const target = pick(SEED.allPublishedIds);
  ok(http.post(`${BASE}/api/published/${target}/like`, null, authParams(u, 'like', 'write')), 'like');
  ok(http.del(`${BASE}/api/published/${target}/like`, null, authParams(u, 'unlike', 'write')), 'unlike');
  const other = pick(SEED.users);
  if (other.id !== u.id) {
    ok(http.post(`${BASE}/api/users/${other.id}/follow`, null, authParams(u, 'follow', 'write')), 'follow');
  }
}

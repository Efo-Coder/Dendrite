// Search under load: every request is an ILIKE '%q%' scan today, so this is
// the scenario that shows whether the pg_trgm indexes pay off. The power user
// (users[0], large corpus) also exercises the unpaginated full note list.
//
//   k6 run stress-search.js --summary-export ../results/search-<label>.json

import http from 'k6/http';
import { BASE, SEED, authParams, ok, pick } from './lib.js';

export const options = {
  scenarios: {
    search: {
      executor: 'ramping-arrival-rate',
      startRate: 5, timeUnit: '1s',
      stages: [
        { duration: '30s', target: 15 },
        { duration: '1m', target: 40 },
        { duration: '30s', target: 60 },
      ],
      preAllocatedVUs: 50, maxVUs: 200,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{name:note-search-power}': ['p(95)<1000'],
    'http_req_duration{name:explore-search}': ['p(95)<1000'],
  },
};

export default function () {
  const power = SEED.users[0];
  const q = pick(SEED.searchTerms);
  ok(http.get(`${BASE}/api/notes/search?q=${q}`, authParams(power, 'note-search-power', 'read')), 'power search');
  ok(http.get(`${BASE}/api/published?q=${q}`, authParams(pick(SEED.users), 'explore-search', 'read')), 'explore search');
  ok(http.get(`${BASE}/api/published?feed=trending`, authParams(pick(SEED.users), 'trending', 'read')), 'trending');
  ok(http.get(`${BASE}/api/notes`, authParams(power, 'notes-list-power', 'read')), 'power list');
}

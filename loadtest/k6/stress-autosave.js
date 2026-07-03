// Autosave storm: how many concurrent typing sessions the write path sustains.
// Ramps VUs with no think time; every VU hammers its own note, so the limit
// found here is the update pipeline (ownership lookup + update + versioning),
// not row-lock contention on a single shared row.
//
//   k6 run stress-autosave.js --summary-export ../results/autosave-<label>.json

import http from 'k6/http';
import { BASE, authParams, ok, vuUser, vuNote, paragraph } from './lib.js';

export const options = {
  scenarios: {
    storm: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 60 },
        { duration: '1m', target: 120 },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const u = vuUser();
  const noteId = vuNote(u);
  const body = JSON.stringify({ content: `<h2>storm ${__VU}</h2>${paragraph()}${paragraph()}` });
  ok(http.put(`${BASE}/api/notes/${noteId}`, body, authParams(u, 'autosave', 'write')), 'autosave');
}

// Large-note round trips near the 10 MB body limit: create, autosave, reload,
// then hard-delete so repeated runs don't accumulate megabyte rows. Verifies
// big payloads neither crash the JSON parser nor block other requests.
//
//   k6 run stress-payload.js --summary-export ../results/payload-<label>.json

import http from 'k6/http';
import { BASE, authParams, ok, vuUser, paragraph } from './lib.js';

const SIZES_MB = [1, 4, 8];

export const options = {
  scenarios: {
    big: { executor: 'per-vu-iterations', vus: 4, iterations: 3, maxDuration: '10m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

function bigHtml(megabytes) {
  const block = paragraph();
  return block.repeat(Math.ceil((megabytes * 1024 * 1024) / block.length));
}

export default function () {
  const u = vuUser();
  const content = bigHtml(SIZES_MB[(__ITER + __VU) % SIZES_MB.length]);

  const created = http.post(
    `${BASE}/api/notes`,
    JSON.stringify({ content }),
    authParams(u, 'big-create', 'write'),
  );
  if (!ok(created, 'big create')) return;

  const id = created.json('note.id');
  ok(
    http.put(`${BASE}/api/notes/${id}`, JSON.stringify({ content: content + paragraph() }), authParams(u, 'big-update', 'write')),
    'big update',
  );
  ok(http.get(`${BASE}/api/notes/${id}`, authParams(u, 'big-read', 'read')), 'big read');
  ok(http.del(`${BASE}/api/notes/${id}`, null, authParams(u, 'big-delete', 'write')), 'big delete');
}

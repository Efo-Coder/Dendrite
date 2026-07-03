// PDF export burst: today every request launches its own Chromium (~200 MB,
// 1–2 s startup), so a handful of parallel exports is already server-melting
// territory. Writer-plan users only — the endpoint rejects free accounts.
//
//   k6 run stress-pdf.js --summary-export ../results/pdf-<label>.json

import http from 'k6/http';
import { BASE, WRITERS, ok, pick } from './lib.js';

export const options = {
  scenarios: {
    burst: { executor: 'per-vu-iterations', vus: 8, iterations: 4, maxDuration: '10m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const u = WRITERS[(__VU - 1) % WRITERS.length];
  const res = http.get(`${BASE}/api/notes/${pick(u.noteIds)}/export/pdf`, {
    headers: { Authorization: `Bearer ${u.token}` },
    tags: { name: 'pdf-export', kind: 'read' },
    timeout: '180s',
  });
  ok(res, 'pdf export');
}

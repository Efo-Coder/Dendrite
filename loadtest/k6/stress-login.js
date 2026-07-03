// Login under load: bcrypt runs on the event loop, so rising login rates stall
// the whole process — this scenario measures exactly that. Only successful
// logins (correct fixture password) are sent: the limiter skips those and no
// account lockouts are triggered.
//
//   k6 run stress-login.js --summary-export ../results/login-<label>.json

import http from 'k6/http';
import { BASE, SEED, ok, pick } from './lib.js';

export const options = {
  scenarios: {
    logins: {
      executor: 'ramping-arrival-rate',
      startRate: 2, timeUnit: '1s',
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 12 },
        { duration: '30s', target: 20 },
      ],
      preAllocatedVUs: 40, maxVUs: 150,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const u = pick(SEED.users);
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: u.email, password: SEED.password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login', kind: 'write' } },
  );
  ok(res, 'login');
}

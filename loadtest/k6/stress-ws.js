// Collaboration socket flood: many concurrent connections, half on one hot
// document (the fixture shares it with every user — broadcast fan-out), half
// spread across each user's own notes. We never speak Yjs; holding sockets
// open and receiving the server's sync/heartbeat frames is the load.
//
//   k6 run stress-ws.js --summary-export ../results/ws-<label>.json

import ws from 'k6/ws';
import { check } from 'k6';
import { BASE, SEED, pick, vuUser } from './lib.js';

const WS_BASE = BASE.replace(/^http/, 'ws');
const HOLD_MS = 60_000;

export const options = {
  scenarios: {
    flood: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 150 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    ws_connecting: ['p(95)<1000'],
  },
};

export default function () {
  const u = vuUser();
  const docId = __VU % 2 === 0 ? SEED.hotDocId : pick(u.noteIds);
  const url = `${WS_BASE}/collaboration/${docId}?token=${u.token}`;

  let frames = 0;
  const res = ws.connect(url, { tags: { name: 'collab-ws' } }, (socket) => {
    socket.on('binaryMessage', () => { frames++; });
    socket.setTimeout(() => socket.close(), HOLD_MS);
  });

  check(res, { 'ws upgraded (101)': (r) => r && r.status === 101 });
  check(frames, { 'received sync frames': (f) => f > 0 });
}

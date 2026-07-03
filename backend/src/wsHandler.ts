import { WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { prisma } from './lib/prisma';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

// Trailing debounce for persisting doc state — frequent enough that a crash
// loses at most a few seconds, rare enough not to write on every keystroke.
const PERSIST_DEBOUNCE_MS = 3_000;

interface DocEntry {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Set<WebSocket>;
  connToClients: Map<WebSocket, Set<number>>;
  // Resolves once the persisted state (if any) has been applied. Connections
  // buffer incoming messages until then, so a client's early sync step never
  // races the DB load and sees an empty document.
  ready: Promise<void>;
  loadComplete: boolean;
  dirty: boolean;
  persistTimer: NodeJS.Timeout | null;
}

const docs = new Map<string, DocEntry>();

function persistDoc(docName: string, entry: DocEntry): Promise<void> {
  if (!entry.dirty) return Promise.resolve();
  entry.dirty = false;
  const state = Buffer.from(Y.encodeStateAsUpdate(entry.doc));
  return prisma.note
    .update({ where: { id: docName }, data: { yjsState: state } })
    .then(() => undefined)
    .catch(err => {
      // A deleted note has no row to update — nothing left worth persisting.
      if ((err as { code?: string }).code !== 'P2025') {
        console.error(`[Yjs] persist failed (${docName}):`, err);
      }
    });
}

function schedulePersist(docName: string, entry: DocEntry): void {
  entry.dirty = true;
  if (entry.persistTimer) return;
  entry.persistTimer = setTimeout(() => {
    entry.persistTimer = null;
    persistDoc(docName, entry);
  }, PERSIST_DEBOUNCE_MS);
}

function getDoc(docName: string): DocEntry {
  let entry = docs.get(docName);
  if (!entry) {
    const doc = new Y.Doc({ gc: true });
    const awareness = new awarenessProtocol.Awareness(doc);
    const conns: Set<WebSocket> = new Set();
    const connToClients = new Map<WebSocket, Set<number>>();

    const ready = prisma.note
      .findUnique({ where: { id: docName }, select: { yjsState: true } })
      .then(note => {
        if (note?.yjsState?.length) Y.applyUpdate(doc, new Uint8Array(note.yjsState));
      })
      .catch(err => console.error(`[Yjs] state load failed (${docName}):`, err));

    entry = { doc, awareness, conns, connToClients, ready, loadComplete: false, dirty: false, persistTimer: null };
    const self = entry;
    ready.then(() => { self.loadComplete = true; });

    doc.on('update', (update: Uint8Array) => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      syncProtocol.writeUpdate(enc, update);
      const msg = encoding.toUint8Array(enc);
      conns.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      });
      // Applying the persisted state during load must not re-persist itself.
      if (self.loadComplete) schedulePersist(docName, self);
    });

    docs.set(docName, entry);
  }
  return entry;
}

function toUint8Array(raw: Buffer | ArrayBuffer | Buffer[]): Uint8Array {
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  if (Array.isArray(raw)) return new Uint8Array(Buffer.concat(raw));
  return new Uint8Array(raw);
}

// Flush every dirty doc on shutdown; the caller awaits this before closing
// the database connection.
export function persistAllDocs(): Promise<void> {
  const writes: Promise<void>[] = [];
  for (const [docName, entry] of docs) {
    if (entry.persistTimer) clearTimeout(entry.persistTimer);
    entry.persistTimer = null;
    writes.push(persistDoc(docName, entry));
  }
  return Promise.all(writes).then(() => undefined);
}

export function setupYjsConnection(ws: WebSocket, docName: string): void {
  ws.binaryType = 'arraybuffer';

  const entry = getDoc(docName);

  // Hold the client's early frames (y-websocket sends its sync step 1 right on
  // open) until the persisted state is applied, then replay them in order.
  const pending: Uint8Array[] = [];
  const bufferMessages = (raw: Buffer | ArrayBuffer | Buffer[]) => {
    pending.push(toUint8Array(raw));
  };
  ws.on('message', bufferMessages);

  entry.ready.then(() => {
    ws.off('message', bufferMessages);
    if (ws.readyState !== WebSocket.OPEN) return;
    wireConnection(ws, docName, entry, pending);
  });
}

function wireConnection(ws: WebSocket, docName: string, entry: DocEntry, pending: Uint8Array[]): void {
  const { doc, awareness, conns, connToClients } = entry;
  conns.add(ws);
  connToClients.set(ws, new Set());

  // Send sync step 1
  const enc1 = encoding.createEncoder();
  encoding.writeVarUint(enc1, MSG_SYNC);
  syncProtocol.writeSyncStep1(enc1, doc);
  ws.send(encoding.toUint8Array(enc1));

  // Send current awareness states to the new client
  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const enc2 = encoding.createEncoder();
    encoding.writeVarUint(enc2, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      enc2,
      awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys())),
    );
    ws.send(encoding.toUint8Array(enc2));
  }

  // Broadcast awareness changes to all OTHER connections
  const onAwareness = ({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const changed = [...added, ...updated, ...removed];
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_AWARENESS);
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
    const msg = encoding.toUint8Array(enc);
    conns.forEach(other => {
      if (other !== ws && other.readyState === WebSocket.OPEN) other.send(msg);
    });
  };
  awareness.on('update', onAwareness);

  // Track which clientIds belong to this WebSocket connection.
  // Required to clean up awareness states when the connection closes,
  // preventing "ghost users" that accumulate across reconnects.
  const onAwarenessChange = (
    { added, updated }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === ws) {
      const clients = connToClients.get(ws);
      if (clients) {
        added.forEach(id => clients.add(id));
        updated.forEach(id => clients.add(id));
      }
    }
  };
  awareness.on('change', onAwarenessChange);

  const handleMessage = (data: Uint8Array) => {
    try {
      const decoder = decoding.createDecoder(data);
      const type = decoding.readVarUint(decoder);
      if (type === MSG_SYNC) {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MSG_SYNC);
        syncProtocol.readSyncMessage(decoder, enc, doc, ws);
        if (encoding.length(enc) > 1) ws.send(encoding.toUint8Array(enc));
      } else if (type === MSG_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(
          awareness,
          decoding.readVarUint8Array(decoder),
          ws,
        );
      }
    } catch (e) {
      console.error('[Yjs WS]', e);
    }
  };

  ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => handleMessage(toUint8Array(raw)));
  for (const data of pending) handleMessage(data);

  // Heartbeat: the y-websocket client drops the connection after 30s without an
  // onmessage event (raw ping frames don't count — the browser answers them
  // automatically and they never reach onmessage). Resend sync step 1 on an
  // interval so an idle client keeps receiving a real protocol message and stays
  // connected; the ping/pong tracks liveness to terminate dead sockets.
  let isAlive = true;
  ws.on('pong', () => { isAlive = true; });
  const heartbeat = setInterval(() => {
    if (!isAlive) { ws.terminate(); return; }
    if (ws.readyState !== WebSocket.OPEN) return;
    isAlive = false;
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    syncProtocol.writeSyncStep1(enc, doc);
    ws.send(encoding.toUint8Array(enc));
    ws.ping();
  }, 15_000);

  ws.on('close', () => {
    clearInterval(heartbeat);
    conns.delete(ws);
    awareness.off('update', onAwareness);
    awareness.off('change', onAwarenessChange);
    // Remove this connection's awareness states so other clients
    // don't see stale "ghost users" after reconnects.
    const clients = connToClients.get(ws);
    if (clients && clients.size > 0) {
      awarenessProtocol.removeAwarenessStates(awareness, Array.from(clients), null);
    }
    connToClients.delete(ws);
    if (conns.size === 0) {
      // Last participant left: flush now — no connections means no further
      // changes, and the eviction below would otherwise race the debounce.
      if (entry.persistTimer) clearTimeout(entry.persistTimer);
      entry.persistTimer = null;
      persistDoc(docName, entry);
      setTimeout(() => {
        if (docs.get(docName)?.conns.size === 0) docs.delete(docName);
      }, 30_000);
    }
  });
}

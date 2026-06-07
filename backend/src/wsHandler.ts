import { WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

interface DocEntry {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Set<WebSocket>;
  connToClients: Map<WebSocket, Set<number>>;
}

const docs = new Map<string, DocEntry>();

function getDoc(docName: string): DocEntry {
  let entry = docs.get(docName);
  if (!entry) {
    const doc = new Y.Doc({ gc: true });
    const awareness = new awarenessProtocol.Awareness(doc);
    const conns: Set<WebSocket> = new Set();
    const connToClients = new Map<WebSocket, Set<number>>();

    doc.on('update', (update: Uint8Array) => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      syncProtocol.writeUpdate(enc, update);
      const msg = encoding.toUint8Array(enc);
      conns.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      });
    });

    entry = { doc, awareness, conns, connToClients };
    docs.set(docName, entry);
  }
  return entry;
}

function toUint8Array(raw: Buffer | ArrayBuffer | Buffer[]): Uint8Array {
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  if (Array.isArray(raw)) return new Uint8Array(Buffer.concat(raw));
  return new Uint8Array(raw);
}

export function setupYjsConnection(ws: WebSocket, docName: string): void {
  ws.binaryType = 'arraybuffer';

  const entry = getDoc(docName);
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

  ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
    const data = toUint8Array(raw);
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
  });

  ws.on('close', () => {
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

    // Clean up orphaned awareness entries: clients whose state arrived but whose
    // connection was never tracked (e.g. connected with empty state before close).
    const trackedClients = new Set<number>();
    connToClients.forEach(set => set.forEach(id => trackedClients.add(id)));
    const orphans = Array.from(awareness.getStates().keys())
      .filter(id => !trackedClients.has(id));
    if (orphans.length > 0) {
      awarenessProtocol.removeAwarenessStates(awareness, orphans, null);
    }
    if (conns.size === 0) {
      setTimeout(() => {
        if (docs.get(docName)?.conns.size === 0) docs.delete(docName);
      }, 30_000);
    }
  });
}

import { Response } from 'express';

// In-memory SSE registry: recipient userId → their open stream responses. Fine for
// a single backend instance (this deployment doesn't scale horizontally).
const clients = new Map<string, Set<Response>>();

export function addClient(userId: string, res: Response): void {
  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }
  set.add(res);
}

export function removeClient(userId: string, res: Response): void {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

// Push a JSON event to every open stream of one user (no-op if they're offline).
export function pushToUser(userId: string, event: unknown): void {
  const set = clients.get(userId);
  if (!set) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) res.write(payload);
}

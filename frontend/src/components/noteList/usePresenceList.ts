import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Note } from '../../types';

export const EXIT_MS = 300;

export interface PresenceItem {
  note: Note;
  exiting: boolean;
}

// Hält gelöschte Notes für die Dauer der CSS-Exit-Transition gemountet
// (Port aus dem Dashboard_v2-Prototyp). Gleichzeitiges Add+Remove
// (View-/Filter-Wechsel) gilt als Reset: kein Exit, Items remounten und
// spielen ihre gestaffelte Entrance.
// resetKey: Bei Wechsel (z. B. Kategorie) wird die Liste sofort geleert —
// kein Exit der alten Ansicht, keine hängenden Gruppen-Labels — und die Notes
// der neuen Ansicht mounten frisch mit Entrance-Stagger.
export function usePresenceList(notes: Note[], resetKey?: string): PresenceItem[] {
  const [items, setItems] = useState<PresenceItem[]>(() =>
    notes.map((n) => ({ note: n, exiting: false })));
  const prevRef = useRef(notes);
  const prevKeyRef = useRef(resetKey);
  const pendingResetRef = useRef(false);
  const timers = useRef<Record<string, number>>({});

  // useLayoutEffect statt useEffect: Der Sync (insbesondere der Reset beim
  // Kategorie-Wechsel) muss VOR dem Paint passieren, sonst blitzt für einen
  // Frame die alte Liste unter der neuen Kategorie auf
  useLayoutEffect(() => {
    const keyChanged = prevKeyRef.current !== resetKey;
    prevKeyRef.current = resetKey;
    const prev = prevRef.current;
    const notesChanged = prev !== notes;
    prevRef.current = notes;
    if (!keyChanged && !notesChanged) return;

    // Kategorie-Wechsel: immer sofort leeren — auch wenn notes im selben Render
    // eine neue Identität haben (z. B. durch geänderte Sortier-Props ist das nur
    // der alte Datenstand, umsortiert). Erst ein SPÄTERER notes-Wechsel (der
    // Fetch der neuen Ansicht) füllt die Liste wieder.
    if (keyChanged) {
      pendingResetRef.current = true;
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
      setItems([]);
      return;
    }
    if (pendingResetRef.current) {
      // notesChanged ist hier garantiert true (sonst wären wir oben raus)
      pendingResetRef.current = false;
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
      setItems(notes.map((n) => ({ note: n, exiting: false })));
      return;
    }

    const nextIds = new Set(notes.map((n) => n.id));
    const prevIds = new Set(prev.map((n) => n.id));
    const removed = prev.filter((n) => !nextIds.has(n.id));
    const added = notes.filter((n) => !prevIds.has(n.id));

    if (removed.length && added.length) {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
      setItems(notes.map((n) => ({ note: n, exiting: false })));
      return;
    }

    // Wieder aufgetauchte Notes (Suche erweitert, Refetch-Races beim Spammen):
    // laufenden Exit-Timer verwerfen, sonst entstehen Live+Exit-Duplikate
    notes.forEach((n) => {
      const t = timers.current[n.id];
      if (t !== undefined) {
        clearTimeout(t);
        delete timers.current[n.id];
      }
    });

    setItems((cur) => {
      const base: PresenceItem[] = notes.map((n) => ({ note: n, exiting: false }));
      // Jede ID darf nur einmal in der Liste stehen — Duplikate erzeugen
      // React-Key-Kollisionen und übereinanderliegende Geister-Karten
      const included = new Set(nextIds);
      // Noch laufende Exits behalten — z. B. wenn der Refetch nach dem Löschen
      // landet, während die Exit-Transition noch spielt
      cur.forEach((it, idx) => {
        if (it.exiting && timers.current[it.note.id] !== undefined && !included.has(it.note.id)) {
          included.add(it.note.id);
          base.splice(Math.min(idx, base.length), 0, it);
        }
      });
      removed.forEach((rm) => {
        if (included.has(rm.id)) return;
        included.add(rm.id);
        const oldIdx = prev.findIndex((n) => n.id === rm.id);
        base.splice(Math.min(Math.max(oldIdx, 0), base.length), 0, { note: rm, exiting: true });
        clearTimeout(timers.current[rm.id]);
        timers.current[rm.id] = window.setTimeout(() => {
          // Nur die Exit-Kopie entfernen — niemals eine wieder live gewordene Note
          setItems((c) => c.filter((it) => !(it.exiting && it.note.id === rm.id)));
          delete timers.current[rm.id];
        }, EXIT_MS);
      });
      return base;
    });
  }, [notes, resetKey]);

  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
  }, []);

  return items;
}

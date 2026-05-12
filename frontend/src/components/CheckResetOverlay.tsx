import { useEffect, useRef, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, LexicalNode } from 'lexical';
import { $isListItemNode } from '@lexical/list';
import { useCheckResetStore, ResetTimer } from '../store/useCheckResetStore';

export function CheckResetOverlay() {
  const [editor] = useLexicalComposerContext();
  const { timers, setTimer, removeTimer } = useCheckResetStore();
  const timersRef = useRef(timers);
  timersRef.current = timers;

  // Tracks which resetIds have already had their initial clockwise draw animation,
  // so we don't replay it on every 5-second tick.
  const animatedIdsRef = useRef(new Set<string>());

  // ── helpers ──────────────────────────────────────────────────────────────

  const computeDeg = useCallback((timer: ResetTimer): number => {
    const now = Date.now();
    if (timer.type === 'countdown') {
      return Math.max(0, Math.min(1, (timer.endsAt - now) / timer.totalMs)) * 360;
    }
    const [h, m] = timer.time.split(':').map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next.getTime() <= now) next.setDate(next.getDate() + 1);
    return Math.max(0, Math.min(1, (next.getTime() - now) / (24 * 60 * 60 * 1000))) * 360;
  }, []);

  // Animates --ring-angle from 0 → targetDeg (clockwise draw) via rAF,
  // or sets it directly when animate=false (periodic update).
  const drawRing = useCallback((el: HTMLElement, targetDeg: number, animate: boolean) => {
    if (!animate) {
      el.style.setProperty('--ring-angle', targetDeg + 'deg');
      return;
    }
    const DURATION = 550;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.style.setProperty('--ring-angle', eased * targetDeg + 'deg');
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // Finds every unchecked <li> with a data-reset-id, looks up its timer,
  // and either runs the initial clockwise-draw animation or updates the angle.
  const updateRings = useCallback(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    rootEl.querySelectorAll<HTMLElement>('li.editor-listitem-unchecked[data-reset-id]').forEach(el => {
      const resetId = el.dataset.resetId!;
      const timer = timersRef.current[resetId];

      if (!timer) {
        // Stale ID (expired countdown) — erase and clean up the attribute.
        el.style.setProperty('--ring-angle', '0deg');
        delete el.dataset.resetId;
        animatedIdsRef.current.delete(resetId);
        return;
      }

      const deg = computeDeg(timer);
      const isNew = !animatedIdsRef.current.has(resetId);

      if (isNew) {
        animatedIdsRef.current.add(resetId);
        drawRing(el, deg, true);   // clockwise draw animation
      } else {
        drawRing(el, deg, false);  // direct update (counterclockwise erase)
      }
    });
  }, [editor, computeDeg, drawRing]);

  // Re-run immediately whenever the timer store changes so new timers
  // get their ring within one React paint cycle.
  useEffect(() => {
    updateRings();
  }, [timers, updateRings]);

  // Also tick every 5 s for ongoing counterclockwise progress.
  useEffect(() => {
    const id = setInterval(updateRings, 5_000);
    return () => clearInterval(id);
  }, [updateRings]);

  // ── timer reset loop (30 s) ───────────────────────────────────────────────

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const todayStr = new Date().toISOString().slice(0, 10);
      const nowTime = new Date().toTimeString().slice(0, 5);

      Object.entries(timersRef.current).forEach(([resetId, timer]) => {
        let shouldReset = false;
        if (timer.type === 'countdown' && timer.endsAt <= now) {
          shouldReset = true;
          removeTimer(resetId);
        } else if (timer.type === 'daily' && timer.time === nowTime && timer.lastResetDate !== todayStr) {
          shouldReset = true;
          setTimer(resetId, { ...timer, lastResetDate: todayStr });
        }

        if (shouldReset) {
          // Allow re-animation when the item is unchecked by the timer.
          animatedIdsRef.current.delete(resetId);

          editor.update(() => {
            function walk(node: LexicalNode): void {
              if ($isListItemNode(node)) {
                const el = editor.getElementByKey(node.getKey()) as HTMLElement | null;
                if (el?.dataset.resetId === resetId && node.getChecked()) {
                  node.setChecked(false);
                }
              }
              if ('getChildren' in node) {
                for (const child of (node as any).getChildren() as LexicalNode[]) walk(child);
              }
            }
            walk($getRoot());
          });
        }
      });
    };

    const id = setInterval(check, 30_000);
    check();
    return () => clearInterval(id);
  }, [editor, removeTimer, setTimer]);

  return null;
}

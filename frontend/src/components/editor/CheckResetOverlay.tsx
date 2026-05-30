import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import type { LexicalNode, NodeKey } from 'lexical';
import { $isTimerListItemNode, RING_CIRCUMFERENCE } from './TimerListItemNode';
import { useCheckResetStore } from '../../store/useCheckResetStore';

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function TimerCheckboxPlugin() {
  const [editor] = useLexicalComposerContext();
  const { setTimer, removeTimer } = useCheckResetStore();
  const expiringRef = useRef(new Set<string>());

  // Detect check/uncheck and start/stop timer
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, prevEditorState }) => {
      type NodeInfo = { checked: boolean | undefined; totalMs: number; resetId: string };
      const nowNodes = new Map<NodeKey, NodeInfo>();
      const prevChecked = new Map<NodeKey, boolean | undefined>();

      editorState.read(() => {
        function walk(node: LexicalNode) {
          if ($isTimerListItemNode(node)) {
            nowNodes.set(node.getKey(), {
              checked: node.getChecked(),
              totalMs: node.getTimerConfig().totalMs,
              resetId: node.getResetId(),
            });
          }
          if ('getChildren' in node)
            for (const child of (node as any).getChildren() as LexicalNode[]) walk(child);
        }
        walk($getRoot());
      });

      prevEditorState.read(() => {
        function walk(node: LexicalNode) {
          if ($isTimerListItemNode(node)) prevChecked.set(node.getKey(), node.getChecked());
          if ('getChildren' in node)
            for (const child of (node as any).getChildren() as LexicalNode[]) walk(child);
        }
        walk($getRoot());
      });

      nowNodes.forEach((curr, key) => {
        const prev = prevChecked.get(key);
        if (prev === undefined) {
          if (curr.checked && !useCheckResetStore.getState().timers[curr.resetId]) {
            setTimer(curr.resetId, {
              type: 'countdown',
              endsAt: Date.now() + curr.totalMs,
              totalMs: curr.totalMs,
            });
          }
          return;
        }
        if (prev === curr.checked) return;
        if (!curr.checked) {
          removeTimer(curr.resetId);
          expiringRef.current.delete(curr.resetId);
        } else {
          expiringRef.current.delete(curr.resetId);
          setTimer(curr.resetId, {
            type: 'countdown',
            endsAt: Date.now() + curr.totalMs,
            totalMs: curr.totalMs,
          });
        }
      });
    });
  }, [editor, setTimer, removeTimer]);

  useEffect(() => {
    let frameId: number;
    const columnLabels = new Map<string, HTMLSpanElement>();

    function getOrCreateLabel(resetId: string, infoColumn: HTMLElement): HTMLSpanElement {
      let el = columnLabels.get(resetId);
      if (!el) {
        el = document.createElement('span');
        el.dataset.timerLabel = resetId;
        el.classList.add('timer-label');
        infoColumn.appendChild(el);
        columnLabels.set(resetId, el);
      }
      return el;
    }

    function tick() {
      const now = Date.now();
      const timers = useCheckResetStore.getState().timers;
      const root = editor.getRootElement();
      const activeIds = new Set<string>();

      if (root) {
        const scrollContainer = root.closest('.editor-canvas') as HTMLElement | null;
        const infoColumn = scrollContainer?.parentElement?.querySelector<HTMLElement>('.editor-info-column') ?? null;

        root.querySelectorAll<SVGSVGElement>('.timer-ring[data-reset-id]').forEach(ring => {
          if (!ring.isConnected) return;
          const resetId = ring.dataset.resetId!;
          activeIds.add(resetId);

          const circle = ring.querySelector('.timer-ring-progress') as SVGCircleElement | null;
          const timer = timers[resetId];

          if (!timer) {
            ring.style.opacity = '0';
            if (circle) circle.setAttribute('stroke-dashoffset', String(RING_CIRCUMFERENCE));
            const label = columnLabels.get(resetId);
            if (label) label.style.opacity = '0';
            expiringRef.current.delete(resetId);
            return;
          }

          const remainingMs = Math.max(0, timer.endsAt - now);
          const progress = Math.min(1, remainingMs / timer.totalMs);
          const ringRect = ring.getBoundingClientRect();

          ring.style.opacity = '1';
          if (circle) circle.setAttribute('stroke-dashoffset', String(RING_CIRCUMFERENCE * (1 - progress)));

          if (infoColumn) {
            const label = getOrCreateLabel(resetId, infoColumn);
            const colRect = infoColumn.getBoundingClientRect();
            const scrollRect = scrollContainer!.getBoundingClientRect();
            const inView = ringRect.top >= scrollRect.top - 2 && ringRect.bottom <= scrollRect.bottom + 2;

            if (!inView) {
              label.style.opacity = '0';
            } else {
              label.textContent = formatMs(remainingMs);
              label.style.top = `${Math.round(ringRect.top - colRect.top + ringRect.height / 2)}px`;
              label.style.opacity = '1';
            }
          }

          if (remainingMs <= 0 && !expiringRef.current.has(resetId)) {
            expiringRef.current.add(resetId);
            removeTimer(resetId);
            editor.update(() => {
              function walk(node: LexicalNode): void {
                if ($isTimerListItemNode(node) && node.getResetId() === resetId && node.getChecked())
                  node.setChecked(false);
                if ('getChildren' in node)
                  for (const child of (node as any).getChildren() as LexicalNode[]) walk(child);
              }
              walk($getRoot());
            });
          }
        });
      }

      columnLabels.forEach((el, resetId) => {
        if (!activeIds.has(resetId)) {
          el.remove();
          columnLabels.delete(resetId);
        }
      });

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      columnLabels.forEach(el => el.remove());
      columnLabels.clear();
    };
  }, [editor, removeTimer]);

  return null;
}

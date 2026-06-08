import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { BLUR_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical';
import { animate } from 'motion';

const EXTEND = 40;     // px extension left + right
const LINE_PAD = 6;    // extra px above + below the cursor line
const DURATION = 0.5;
const EASE: [number, number, number, number] = [0.33, 1, 0.68, 1];

function highlightColor() {
  return 'color-mix(in oklch, var(--accent-hi) 15%, transparent)';
}

export function ActiveLinePlugin() {
  const [editor] = useLexicalComposerContext();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const prevTopRef = useRef<number | null>(null);
  const lastCursorHRef = useRef<number>(0);

  // Create overlay once, attach to editor-container
  useEffect(() => {
    const editorEl = editor.getRootElement();
    if (!editorEl) return;

    const container = editorEl.parentElement;
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      left: -${EXTEND}px;
      right: -${EXTEND}px;
      pointer-events: none;
      border-radius: 4px;
      opacity: 0;
      z-index: 0;
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
      mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
    `;
    container.appendChild(overlay);
    overlayRef.current = overlay;

    return () => {
      overlay.remove();
      overlayRef.current = null;
      visibleRef.current = false;
    };
  }, [editor]);

  // Hide on blur
  useEffect(() => {
    return editor.registerCommand(BLUR_COMMAND, () => {
      const overlay = overlayRef.current;
      if (overlay && visibleRef.current) {
        animate(overlay, { opacity: 0 }, { duration: DURATION, ease: EASE });
        visibleRef.current = false;
      }
      return false;
    }, COMMAND_PRIORITY_LOW);
  }, [editor]);

  // Track cursor position and update overlay
  useEffect(() => {
    return editor.registerUpdateListener(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      const nativeSel = window.getSelection();
      if (!nativeSel || nativeSel.rangeCount === 0) return;

      // Collapse to cursor position to get single-line rect.
      // Use anchor (collapse=true) only for same-paragraph selections (double-click on a word).
      // For cross-paragraph transitions (Enter, Backspace) anchor stays on the old line —
      // use focus instead so the overlay follows the actual cursor.
      const range = nativeSel.getRangeAt(0).cloneRange();
      const useAnchor = !nativeSel.isCollapsed && nativeSel.anchorNode === nativeSel.focusNode;
      range.collapse(useAnchor);
      let cursorRect = range.getBoundingClientRect();

      // Cache the height whenever we land on a real text line (ignore dropcap inflation)
      if (cursorRect.height > 0) {
        const rcEl = range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer as Element
          : (range.startContainer as Text).parentElement;
        if (rcEl) {
          const rcCs = getComputedStyle(rcEl);
          const rcFs = parseFloat(rcCs.fontSize) || 16;
          const rcLhRaw = rcCs.lineHeight;
          const rcLineH = rcLhRaw === 'normal' ? rcFs * 1.2 : (parseFloat(rcLhRaw) || rcFs * 1.2);
          if (cursorRect.height > rcLineH * 1.5) {
            // Dropcap-inflated rect — clamp to one normal line
            cursorRect = { top: cursorRect.top, height: rcLineH } as DOMRect;
          } else {
            lastCursorHRef.current = cursorRect.height;
          }
        } else {
          lastCursorHRef.current = cursorRect.height;
        }
      }

      // Empty line: range yields height 0 — find cursor line position
      if (cursorRect.height === 0) {
        // Use range.startContainer/startOffset (collapsed to anchor), NOT nativeSel.focusNode.
        // After a double-click, focusNode points to the END of the word selection (potentially
        // a different paragraph), while range.startContainer is the actual cursor position.
        const rangeNode = range.startContainer;
        if (!rangeNode) return;

        // Walk up to first element with non-zero height (e.g. <br> or empty <span> → <code> or <p>)
        let el: Element | null = rangeNode.nodeType === Node.ELEMENT_NODE
          ? rangeNode as Element
          : (rangeNode as Text).parentElement;
        while (el && el.getBoundingClientRect().height === 0) {
          el = el.parentElement;
        }
        if (!el) return;

        const cs = getComputedStyle(el);
        const lhRaw = cs.lineHeight;
        const lineH = lhRaw === 'normal'
          ? parseFloat(cs.fontSize) * 1.2
          : (parseFloat(lhRaw) || parseFloat(cs.fontSize) * 1.2);

        const elRect = el.getBoundingClientRect();

        if (elRect.height <= lineH * 1.5 || el.tagName !== 'CODE') {
          // Single-line element or non-code element — reuse last known cursor height so
          // the highlight matches non-empty lines exactly; fall back to fontSize if none recorded.
          // Non-CODE elements (e.g. wrapped <p>) stay here to avoid the multi-line branch
          // accidentally using a wrapped inline element's height as the overlay height.
          const fs = parseFloat(cs.fontSize);
          const h = lastCursorHRef.current > fs * 0.8 && lastCursorHRef.current < fs * 1.5
            ? lastCursorHRef.current
            : fs;
          cursorRect = { top: elRect.top + (elRect.height - h) / 2, height: h } as DOMRect;
        } else {
          // Multi-line <code> container — find position via siblings
          const focusEl: Element | null = rangeNode.nodeType === Node.ELEMENT_NODE
            ? rangeNode as Element
            : (rangeNode as Text).parentElement;

          let cursorChildIdx: number;
          if (focusEl && focusEl !== el && el.contains(focusEl)) {
            // Cursor is on a descendant — find its direct child of el
            let probe: Element | null = focusEl;
            while (probe && probe.parentElement !== el) probe = probe.parentElement;
            cursorChildIdx = el.childNodes.length;
            if (probe) {
              for (let i = 0; i < el.childNodes.length; i++) {
                if (el.childNodes[i] === probe) { cursorChildIdx = i; break; }
              }
            }
          } else {
            // rangeNode IS el — use startOffset directly
            cursorChildIdx = range.startOffset;
          }

          // Walk backward to find the last content span before the cursor.
          // <br> elements are skipped — their getBoundingClientRect() is unreliable in Chrome.
          // extraLines counts <br> separators to offset by empty lines between span and cursor.
          const paddingTop = parseFloat(cs.paddingTop) || 0;
          const fs2 = parseFloat(cs.fontSize);
          const halfLead = lineH > fs2 ? (lineH - fs2) / 2 : 0;
          let emBoxTop: number | null = null;
          let extraLines = 0;

          // Height: use cached cursor height if it looks like code-font (within 30% of fontSize).
          // span.getBoundingClientRect().height can exceed the actual cursor height, making
          // empty lines appear taller than text lines. lastCursorHRef was captured from
          // range.getBoundingClientRect() and matches what text lines use exactly.
          const codeLineH = (lastCursorHRef.current > fs2 * 0.7 && lastCursorHRef.current < fs2 * 1.3)
            ? lastCursorHRef.current
            : fs2;

          for (let i = cursorChildIdx - 1; i >= 0; i--) {
            const child = el.childNodes[i];
            if (child.nodeType !== Node.ELEMENT_NODE) continue;
            if ((child as Element).tagName === 'BR') { extraLines++; continue; }
            const r = (child as Element).getBoundingClientRect();
            if (r.height > 0) {
              // N = number of visual lines this span occupies (usually 1, >1 if a token wraps).
              // Position formula works for any N: r.bottom + N*lineH - r.height = r.bottom + lineH - emBoxH.
              const N = Math.max(1, Math.round(r.height / lineH));
              emBoxTop = r.bottom + N * lineH - r.height + Math.max(0, extraLines - 1) * lineH;
              break;
            }
          }

          if (emBoxTop === null) {
            // No content span found — all lines from start of block are empty.
            emBoxTop = elRect.top + paddingTop + halfLead + extraLines * lineH;
          }

          cursorRect = { top: emBoxTop, height: codeLineH } as DOMRect;
        }
      }

      const containerRect = overlay.parentElement!.getBoundingClientRect();
      const top = cursorRect.top - containerRect.top - LINE_PAD;
      const height = cursorRect.height + LINE_PAD * 2;
      const color = highlightColor();

      const lineChanged = prevTopRef.current === null || Math.abs(prevTopRef.current - top) > 2;
      prevTopRef.current = top;

      const setPosition = () => {
        overlay.style.background = color;
        overlay.style.top = `${top}px`;
        overlay.style.height = `${height}px`;
      };

      if (!visibleRef.current) {
        // First appearance: position instantly, then fade in
        setPosition();
        animate(overlay, { opacity: 1 }, { duration: DURATION, ease: EASE });
        visibleRef.current = true;
      } else if (lineChanged) {
        // Line switch: fade out → reposition → fade in
        animate(overlay, { opacity: 0 }, { duration: DURATION / 2, ease: EASE }).then(() => {
          setPosition();
          animate(overlay, { opacity: 1 }, { duration: DURATION / 2, ease: EASE });
        });
      } else {
        // Same line (typing): update position instantly, no animation
        setPosition();
      }
    });
  }, [editor]);

  return null;
}

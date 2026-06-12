import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { BLUR_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical';
import { animate } from 'motion';
import { useSettingsStore } from '../../store/useSettingsStore';

const EXTEND = 40;          // px extension left + right
const LINE_PAD = 6;         // extra px above + below the cursor line
const FADE_DURATION = 0.2;  // appear / disappear
const MOVE_DURATION = 0.18; // slide between lines
// Position deltas below this snap instantly instead of sliding. Estimated positions
// (empty line, dropcap) can be a few px off the real caret rect — animating that
// correction reads as wobble, while a real line change is at least one line height.
const SNAP_THRESHOLD = 8;
const EASE: [number, number, number, number] = [0.33, 1, 0.68, 1];

function highlightColor() {
  return 'color-mix(in oklch, var(--accent-hi) 15%, transparent)';
}

export function ActiveLinePlugin() {
  const [editor] = useLexicalComposerContext();
  const activeLine = useSettingsStore((s) => s.activeLine);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const prevTopRef = useRef<number | null>(null);
  const lastCursorHRef = useRef<number>(0);
  const moveAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const fadeAnimRef = useRef<ReturnType<typeof animate> | null>(null);

  // Create overlay once, attach to editor-container
  useEffect(() => {
    if (!activeLine) {
      if (overlayRef.current) {
        overlayRef.current.remove();
        overlayRef.current = null;
        visibleRef.current = false;
      }
      return;
    }

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
  }, [editor, activeLine]);

  // Hide on blur
  useEffect(() => {
    if (!activeLine) return;
    return editor.registerCommand(BLUR_COMMAND, () => {
      const overlay = overlayRef.current;
      if (overlay && visibleRef.current) {
        fadeAnimRef.current?.stop();
        fadeAnimRef.current = animate(overlay, { opacity: 0 }, { duration: FADE_DURATION, ease: EASE });
        visibleRef.current = false;
      }
      return false;
    }, COMMAND_PRIORITY_LOW);
  }, [editor, activeLine]);

  // Track cursor position and update overlay
  useEffect(() => {
    if (!activeLine) return;
    const updateOverlay = () => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      const nativeSel = window.getSelection();
      if (!nativeSel || nativeSel.rangeCount === 0) return;

      // Never show active line outside the editor body (e.g. title textarea)
      const rootEl = editor.getRootElement();
      const focusInEditor = rootEl && (
        rootEl.contains(nativeSel.focusNode) || rootEl.contains(nativeSel.anchorNode)
      );
      if (!focusInEditor) {
        if (visibleRef.current) {
          fadeAnimRef.current?.stop();
          fadeAnimRef.current = animate(overlay, { opacity: 0 }, { duration: FADE_DURATION, ease: EASE });
          visibleRef.current = false;
        }
        return;
      }

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
            // Caret adjacent to the floated ::first-letter — Chrome returns the dropcap
            // GLYPH box, which overflows above the paragraph (measured ~8px above block
            // top). The caret is always on the block's first line, so derive the caret
            // box from the block top + half-leading instead of the glyph rect.
            const caretH = lastCursorHRef.current > rcFs * 0.8 && lastCursorHRef.current < rcFs * 1.5
              ? lastCursorHRef.current
              : rcFs;
            const block = rcEl.closest('p, h1, h2, h3, h4, h5, h6, li') ?? rcEl;
            cursorRect = {
              top: block.getBoundingClientRect().top + Math.max(0, (rcLineH - caretH) / 2),
              height: caretH,
            } as DOMRect;
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
          // Truly empty line (<p><br></p>): the <br> rect is exactly the caret box a
          // typed character will get (measured identical in Chromium) — use it directly
          // so the highlight doesn't shift on the first keystroke.
          const brRect = !el.textContent ? el.querySelector('br')?.getBoundingClientRect() : null;
          if (brRect && brRect.height > 0) {
            // The br height IS the caret height — cache it so the dropcap branch has a
            // correct height even before the first character of a note is typed.
            lastCursorHRef.current = brRect.height;
            cursorRect = { top: brRect.top, height: brRect.height } as DOMRect;
          } else {
            // Single-line element or non-code element — reuse last known cursor height so
            // the highlight matches non-empty lines exactly; fall back to fontSize if none recorded.
            // Non-CODE elements (e.g. wrapped <p>) stay here to avoid the multi-line branch
            // accidentally using a wrapped inline element's height as the overlay height.
            const fs = parseFloat(cs.fontSize);
            const h = lastCursorHRef.current > fs * 0.8 && lastCursorHRef.current < fs * 1.5
              ? lastCursorHRef.current
              : fs;
            cursorRect = { top: elRect.top + (elRect.height - h) / 2, height: h } as DOMRect;
          }
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

      const lineChanged = prevTopRef.current === null || Math.abs(prevTopRef.current - top) > SNAP_THRESHOLD;
      prevTopRef.current = top;

      overlay.style.background = highlightColor();
      // Stop any in-flight slide so direct style writes below take effect
      moveAnimRef.current?.stop();

      if (!visibleRef.current) {
        // First appearance: position instantly, then fade in
        overlay.style.top = `${top}px`;
        overlay.style.height = `${height}px`;
        fadeAnimRef.current?.stop();
        fadeAnimRef.current = animate(overlay, { opacity: 1 }, { duration: FADE_DURATION, ease: EASE });
        visibleRef.current = true;
      } else if (lineChanged) {
        // Line switch: slide to the new line while staying visible.
        // Opacity untouched — an in-flight fade-in simply continues.
        moveAnimRef.current = animate(
          overlay,
          { top: `${top}px`, height: `${height}px` },
          { duration: MOVE_DURATION, ease: EASE }
        );
      } else {
        // Same line (typing): update position instantly, no animation
        overlay.style.top = `${top}px`;
        overlay.style.height = `${height}px`;
      }
    };

    const removeUpdateListener = editor.registerUpdateListener(updateOverlay);

    // Reposition when the editor reflows (e.g. sidebar toggle changes line wrapping)
    const rootEl = editor.getRootElement();
    const resizeObserver = rootEl ? new ResizeObserver(updateOverlay) : null;
    resizeObserver?.observe(rootEl!);

    return () => {
      removeUpdateListener();
      resizeObserver?.disconnect();
    };
  }, [editor, activeLine]);

  return null;
}

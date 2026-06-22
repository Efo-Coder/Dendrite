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
  return 'color-mix(in oklch, var(--accent) 15%, transparent)';
}

// Live vertical scale of the editor's open-morph transform (1 when none/identity), used to
// map viewport measurements back into the overlay's own (pre-transform) coordinate space.
function readScaleY(node: Element): number {
  const morphEl = node.closest('.editor-overlay');
  if (!morphEl) return 1;
  const t = getComputedStyle(morphEl).transform;
  if (!t || t === 'none') return 1;
  try {
    return new DOMMatrixReadOnly(t).d || 1;
  } catch {
    return 1;
  }
}

// Chrome's caret box is not perfectly centered in the line box (depends on font
// ascent/descent), so (lineH - h) / 2 estimates are ~1px off. Measure the real
// caret box (offset within the line box + height) for a text style via a hidden
// probe element once and cache it per style key.
const caretBoxCache = new Map<string, { offset: number; height: number }>();
function measureCaretBox(sourceEl: Element): { offset: number; height: number } {
  const cs = getComputedStyle(sourceEl);
  const key = `${cs.fontFamily}|${cs.fontSize}|${cs.lineHeight}|${cs.letterSpacing}|${cs.fontWeight}`;
  const cached = caretBoxCache.get(key);
  if (cached) return cached;
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;font-family:${cs.fontFamily};font-size:${cs.fontSize};line-height:${cs.lineHeight};letter-spacing:${cs.letterSpacing};font-weight:${cs.fontWeight};`;
  probe.textContent = 'x';
  document.body.appendChild(probe);
  const r = document.createRange();
  r.setStart(probe.firstChild!, 1);
  r.collapse(true);
  const cr = r.getBoundingClientRect();
  const pr = probe.getBoundingClientRect();
  const box = { offset: cr.top - pr.top, height: cr.height };
  probe.remove();
  caretBoxCache.set(key, box);
  return box;
}

export function ActiveLinePlugin() {
  const [editor] = useLexicalComposerContext();
  const activeLine = useSettingsStore((s) => s.activeLine);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const prevTopRef = useRef<number | null>(null);
  // Caret height cache with the font size it was measured at — code blocks use a
  // smaller font, so a code-measured height must never be reused for prose lines.
  const lastCaretRef = useRef<{ h: number; fs: number } | null>(null);
  const moveAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  // Target of the in-flight slide — lets redundant updates (ResizeObserver echo
  // after every Enter) detect that the running animation is already correct.
  const moveTargetRef = useRef<number | null>(null);
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

    // A ResizeObserver only catches size changes of the editor root, not pure position
    // shifts of the caret line. When an image collapses, the content drops below the
    // root's min-height: the root size freezes while text keeps reflowing upward, so the
    // observer goes silent and the overlay strands on a stale line. After any reposition
    // we re-measure per frame until the position holds still (or a cap), which tracks the
    // line through such animated reflows regardless of whether the root resizes.
    const SETTLE_CAP_MS = 700;
    const SETTLE_STABLE_FRAMES = 2;
    let settling = false;
    let settleRaf: number | null = null;
    let settleStableFrames = 0;
    let settleLastTop = Number.NaN;
    let settleDeadline = 0;

    const scheduleSettle = () => {
      settleDeadline = performance.now() + SETTLE_CAP_MS;
      if (settling) return; // loop already running — deadline just extended
      settling = true;
      settleStableFrames = 0;
      settleLastTop = prevTopRef.current ?? Number.NaN;
      const tick = () => {
        updateOverlay();
        const cur = prevTopRef.current ?? Number.NaN;
        if (Math.abs(cur - settleLastTop) < 0.5) settleStableFrames++;
        else settleStableFrames = 0;
        settleLastTop = cur;
        if (settleStableFrames < SETTLE_STABLE_FRAMES && performance.now() < settleDeadline) {
          settleRaf = requestAnimationFrame(tick);
        } else {
          settling = false;
          settleRaf = null;
        }
      };
      settleRaf = requestAnimationFrame(tick);
    };

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
            // GLYPH box, which overflows above the paragraph. The caret is always on the
            // block's first line: measure the real caret box for this text style via the
            // hidden probe and anchor it to the block top.
            const box = measureCaretBox(rcEl);
            const block = rcEl.closest('p, h1, h2, h3, h4, h5, h6, li') ?? rcEl;
            const blockCs = getComputedStyle(block);
            const blockPadTop = (parseFloat(blockCs.borderTopWidth) || 0) + (parseFloat(blockCs.paddingTop) || 0);
            cursorRect = {
              top: block.getBoundingClientRect().top + blockPadTop + box.offset,
              height: box.height,
            } as DOMRect;
          } else {
            lastCaretRef.current = { h: cursorRect.height, fs: rcFs };
          }
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

        // Truly empty block (<p><br></p>, <code><br></code>): the br rect is exactly
        // the caret box a typed character will get (measured identical in Chromium) —
        // use it directly so the highlight doesn't shift on the first keystroke.
        const brRect = !el.textContent ? el.querySelector('br')?.getBoundingClientRect() : null;

        if (brRect && brRect.height > 0) {
          lastCaretRef.current = { h: brRect.height, fs: parseFloat(cs.fontSize) };
          cursorRect = { top: brRect.top, height: brRect.height } as DOMRect;
        } else if (el === rootEl) {
          // Selection sits between blocks (e.g. click below the content) — there is no
          // line box to highlight; keep the previous position instead of centering on
          // the whole editor.
          return;
        } else if (elRect.height <= lineH * 1.5) {
          // Single-line element — reuse last known caret height (only if it was measured
          // at the same font size); fall back to fontSize if none recorded.
          const fs = parseFloat(cs.fontSize);
          const cached = lastCaretRef.current;
          const h = cached && Math.abs(cached.fs - fs) < 0.5 && cached.h > fs * 0.8 && cached.h < fs * 1.5
            ? cached.h
            : fs;
          cursorRect = { top: elRect.top + (elRect.height - h) / 2, height: h } as DOMRect;
        } else {
          // Multi-line container (<code>, or <p> with Shift-Enter line breaks) —
          // find the cursor line via siblings
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
          // <br> elements are skipped; extraLines counts them to offset by empty lines.
          const paddingTop = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.paddingTop) || 0);
          const box = measureCaretBox(el);
          let emBoxTop: number | null = null;
          let extraLines = 0;

          for (let i = cursorChildIdx - 1; i >= 0; i--) {
            const child = el.childNodes[i];
            if (child.nodeType !== Node.ELEMENT_NODE) continue;
            if ((child as Element).tagName === 'BR') { extraLines++; continue; }
            const r = (child as Element).getBoundingClientRect();
            if (r.height > 0) {
              // N = number of visual lines this span occupies (usually 1, >1 if a token wraps).
              // extraLines = 0 means the caret sits directly after this span (click on the
              // line end puts the selection on the code element, not the text node) — the
              // caret is then on the span's LAST line, not on a new one. General formula:
              // span line 1 top + (N - 1) lines into the span + one line per br after it.
              const N = Math.max(1, Math.round(r.height / lineH));
              emBoxTop = r.top + (N - 1 + extraLines) * lineH;
              break;
            }
          }

          if (emBoxTop === null) {
            // No content span found — all lines from start of block are empty.
            emBoxTop = elRect.top + paddingTop + box.offset + extraLines * lineH;
          }

          cursorRect = { top: emBoxTop, height: box.height } as DOMRect;
        }
      }

      const containerRect = overlay.parentElement!.getBoundingClientRect();
      // The editor opens via a transform-morph (scale): viewport rects come back scaled,
      // but the overlay's top/height are written in the container's own pre-transform space.
      // Read the exact live Y-scale off the morph element's matrix (1 at rest / identity) and
      // divide the vertical measurements by it, so the line lands right at any morph frame
      // without introducing any sub-px error when no morph is running.
      const scaleY = readScaleY(overlay);
      const top = (cursorRect.top - containerRect.top) / scaleY - LINE_PAD;
      const height = cursorRect.height / scaleY + LINE_PAD * 2;

      // A slide toward this exact target is already in flight — let it finish.
      // Stopping it and rewriting the style races motion's trailing frame
      // (measured: the stopped animation writes once more AFTER the direct
      // write), which freezes the overlay between two lines and kills the slide.
      if (
        visibleRef.current &&
        moveAnimRef.current &&
        moveTargetRef.current !== null &&
        Math.abs(moveTargetRef.current - top) < 0.5
      ) {
        prevTopRef.current = top;
        return;
      }

      const lineChanged = prevTopRef.current === null || Math.abs(prevTopRef.current - top) > SNAP_THRESHOLD;
      prevTopRef.current = top;

      overlay.style.background = highlightColor();
      // Stop any in-flight slide (different target) so the writes below win
      moveAnimRef.current?.stop();
      moveAnimRef.current = null;
      moveTargetRef.current = null;

      if (!visibleRef.current) {
        // First appearance: position instantly, then fade in
        overlay.style.top = `${top}px`;
        overlay.style.height = `${height}px`;
        fadeAnimRef.current?.stop();
        fadeAnimRef.current = animate(overlay, { opacity: 1 }, { duration: FADE_DURATION, ease: EASE });
        visibleRef.current = true;
        scheduleSettle();
      } else if (lineChanged) {
        // Line switch: slide to the new line while staying visible.
        // Opacity untouched — an in-flight fade-in simply continues.
        const anim = animate(
          overlay,
          { top: `${top}px`, height: `${height}px` },
          { duration: MOVE_DURATION, ease: EASE }
        );
        moveAnimRef.current = anim;
        moveTargetRef.current = top;
        anim.then(() => {
          if (moveAnimRef.current === anim) {
            moveAnimRef.current = null;
            moveTargetRef.current = null;
          }
        });
        scheduleSettle();
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
      if (settleRaf !== null) cancelAnimationFrame(settleRaf);
      settling = false;
    };
  }, [editor, activeLine]);

  return null;
}

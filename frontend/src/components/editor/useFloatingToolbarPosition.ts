import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

// Tracks the native selection and computes a locked position for the floating
// toolbar above it. Hides the bar when the selection collapses or scrolls out
// of the editor's scroll container.
export function useFloatingToolbarPosition(disabled: boolean, barRef: RefObject<HTMLDivElement | null>) {
  const [editor] = useLexicalComposerContext();

  const [visible, setVisible] = useState(false);
  const [scrolledOut, setScrolledOut] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const rafRef = useRef<number>(0);
  const posLockedRef = useRef(false);
  // While a picker/modal owned by the bar is open, the bar must not hide
  const keepVisibleRef = useRef(false);
  const codeFormattingRef = useRef(false);
  const isMouseSelectingRef = useRef(false);
  const toolbarWidthRef = useRef(320);

  const updatePosition = useCallback(() => {
    if (isMouseSelectingRef.current) return;
    if (disabled) { setVisible(false); posLockedRef.current = false; return; }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      if (!keepVisibleRef.current && !codeFormattingRef.current) { setVisible(false); posLockedRef.current = false; }
      return;
    }
    const range = sel.getRangeAt(0);
    const root = editor.getRootElement();
    if (!root || !root.contains(range.commonAncestorContainer)) { setVisible(false); posLockedRef.current = false; return; }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { setVisible(false); posLockedRef.current = false; return; }

    if (!posLockedRef.current) {
      let scrollParent: HTMLElement | null = root.parentElement;
      while (scrollParent) {
        const { overflow, overflowY } = window.getComputedStyle(scrollParent);
        if (/auto|scroll/.test(overflow + overflowY)) break;
        scrollParent = scrollParent.parentElement;
      }
      if (scrollParent) {
        const cr = scrollParent.getBoundingClientRect();
        if (rect.bottom < cr.top || rect.top > cr.bottom) { setVisible(false); return; }
      }

      const pad = 8;
      const toolbarH = 44;
      let top = rect.top - toolbarH - pad;
      if (top < pad) top = rect.bottom + pad;

      const halfW = toolbarWidthRef.current / 2;
      const editorRect = root.getBoundingClientRect();
      const rawLeft = rect.left + rect.width / 2;
      const left = Math.max(editorRect.left + halfW + pad, Math.min(editorRect.right - halfW - pad, rawLeft));

      setPos({ top, left });
      posLockedRef.current = true;
    }
    setScrolledOut(false);
    codeFormattingRef.current = false;
    setVisible(true);
  }, [editor, disabled]);

  const checkScrollVisibility = useCallback(() => {
    if (!posLockedRef.current) return;
    if (keepVisibleRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const root = editor.getRootElement();
    if (!root || !root.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    let scrollParent: HTMLElement | null = root.parentElement;
    while (scrollParent) {
      const { overflow, overflowY } = window.getComputedStyle(scrollParent);
      if (/auto|scroll/.test(overflow + overflowY)) break;
      scrollParent = scrollParent.parentElement;
    }
    if (!scrollParent) return;
    const cr = scrollParent.getBoundingClientRect();
    setScrolledOut(rect.bottom < cr.top || rect.top > cr.bottom);
  }, [editor]);

  useEffect(() => {
    const schedule = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };
    return editor.registerUpdateListener(schedule);
  }, [editor, updatePosition]);

  useEffect(() => {
    const onMouseDown = () => { isMouseSelectingRef.current = true; };
    const onMouseUp = () => {
      isMouseSelectingRef.current = false;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };
    window.addEventListener('scroll', checkScrollVisibility, true);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('scroll', checkScrollVisibility, true);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updatePosition, checkScrollVisibility]);

  useEffect(() => {
    if (visible && barRef.current) {
      toolbarWidthRef.current = barRef.current.offsetWidth;
    }
  }, [visible, barRef]);

  return { visible, scrolledOut, pos, keepVisibleRef, codeFormattingRef };
}

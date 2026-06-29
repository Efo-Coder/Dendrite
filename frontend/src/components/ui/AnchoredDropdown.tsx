import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';

// Sticky custom dropdown: the menu is portalled and pinned flush under the trigger
// (top-rounded button + border-t-0 menu read as one shape, same look as the Settings
// font picker). The anchor is re-measured on scroll/resize so the menu stays glued to
// the trigger even when the modal body scrolls — hence "sticky".
type Anchor = { top: number; left: number; width: number };

interface AnchoredDropdownProps {
  // Trigger content; receives `open` so the caller can rotate a chevron etc.
  label: (open: boolean) => React.ReactNode;
  // Popup content; `close` lets options dismiss the menu after a choice.
  children: (close: () => void) => React.ReactNode;
  buttonClassName?: string;
  // Popup width when it should not just match the trigger (e.g. the calendar grid).
  popupWidth?: number;
  showChevron?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

const AnchoredDropdown = ({
  label,
  children,
  buttonClassName,
  popupWidth,
  showChevron = true,
  disabled = false,
  'aria-label': ariaLabel,
}: AnchoredDropdownProps) => {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  const close = () => setAnchor(null);

  const measure = useCallback(() => {
    const r = btnRef.current!.getBoundingClientRect();
    // Clamp so a popup wider than the trigger stays inside the viewport.
    const width = popupWidth ?? r.width;
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setAnchor({ top: r.bottom, left: Math.max(8, left), width });
  }, [popupWidth]);

  const toggle = () => (open ? close() : measure());

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      close();
    };
    const reposition = () => measure();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', reposition);
    // Capture phase so the scrolling modal body (not just window) keeps us pinned.
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, measure]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={toggle}
        className={clsx(
          'flex items-center justify-between gap-2 border border-(--line) bg-(--bg) px-3 py-2 text-(--ink) transition-colors hover:border-(--ink-dim) disabled:opacity-50',
          buttonClassName,
        )}
        style={{ borderRadius: open ? '8px 8px 0 0' : 8 }}
      >
        {label(open)}
        {showChevron && (
          <ChevronDown
            className={clsx('w-3.5 h-3.5 shrink-0 text-(--ink-dim) transition-transform duration-200', open && 'rotate-180')}
          />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {anchor && (
            <motion.div
              ref={popupRef}
              className="fixed z-7 overflow-hidden border border-(--line) border-t-0 bg-(--bg)"
              style={{
                top: anchor.top,
                left: anchor.left,
                width: anchor.width,
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                transformOrigin: 'center top',
              }}
              initial={{ opacity: 0, scaleY: 0.96, y: -4 }}
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              exit={{ opacity: 0, scaleY: 0.96, y: -4, transition: { duration: 0.1 } }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            >
              {children(close)}
            </motion.div>
          )}
        </AnimatePresence>,
        getModalPortalRoot(),
      )}
    </>
  );
};

export default AnchoredDropdown;

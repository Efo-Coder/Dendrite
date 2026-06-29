import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type CSSProperties, type MutableRefObject, type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import {
  useSmartPopupStyle, type PopupAnchor, type PopupDirection, type PopupPlacement,
} from '../../hooks/useSmartPopupStyle';
import { popupCls, popupPad, popupMotion, getPopupStyle } from '../editor/toolbarPopupUtils';

// One sticky sub-popup for the whole app: portalled, glued to its anchor, with a
// configurable opening direction and optional smart flipping. Callers pass either a
// pre-measured `anchor` (e.g. computed on click) or an `anchorEl` ref the popup
// measures itself — the latter enables `track` (re-measure on scroll/resize).
export type SubPopupVariant = 'glass' | 'bordered' | 'plain';

interface SubPopupProps {
  // Visibility. Optional in anchor-mode (derived from `anchor != null`); required when
  // using `anchorEl`, since a ref is always present.
  open?: boolean;
  onClose: () => void;
  anchor?: PopupAnchor | null;
  anchorEl?: RefObject<HTMLElement | null>;
  direction?: PopupDirection;
  smart?: boolean;
  track?: boolean;
  variant?: SubPopupVariant;
  width?: number;
  padding?: number;
  closeOnOutside?: boolean;
  // Cascading menus: clicks inside this element must not trigger the outside-close.
  excludeRef?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
  // Exposes the popup root so a parent menu can exclude it from its own outside-click.
  popupRef?: RefObject<HTMLDivElement | null>;
}

// Non-glass variants fade + slide a few px out of the anchor's direction.
const ENTER_OFFSET: Record<PopupPlacement, { x?: number; y?: number }> = {
  above: { y: 6 },
  below: { y: -6 },
  left: { x: 6 },
  right: { x: -6 },
};

const SubPopup = ({
  open,
  onClose,
  anchor,
  anchorEl,
  direction = 'bottom',
  smart = true,
  track = false,
  variant = 'bordered',
  width,
  padding = 8,
  closeOnOutside = true,
  excludeRef,
  className,
  children,
  popupRef,
}: SubPopupProps) => {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const assignRef = useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el;
      if (popupRef) (popupRef as MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [popupRef],
  );

  const isOpen = open ?? anchor != null;

  // Element-anchored mode measures the trigger itself; `track` keeps it glued on scroll/resize.
  const [measured, setMeasured] = useState<PopupAnchor | null>(null);
  const measure = useCallback(() => {
    const el = anchorEl?.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMeasured({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom, left: r.left, width: r.width });
  }, [anchorEl]);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    if (isOpen) measure();
    else setMeasured(null);
  }, [anchorEl, isOpen, measure]);

  useEffect(() => {
    if (!anchorEl || !isOpen || !track) return;
    const onMove = () => measure();
    window.addEventListener('resize', onMove);
    // Capture phase so a scrolling modal body (not just window) keeps us pinned.
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [anchorEl, isOpen, track, measure]);

  const resolvedAnchor = anchorEl ? measured : isOpen ? anchor ?? null : null;
  const { style, placement } = useSmartPopupStyle(resolvedAnchor, innerRef, { padding, prefer: direction, smart });

  useEffect(() => {
    if (!isOpen || !closeOnOutside) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (innerRef.current?.contains(t)) return;
      if (anchorEl?.current?.contains(t)) return;
      if (excludeRef?.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, closeOnOutside, onClose, anchorEl, excludeRef]);

  const motionProps =
    variant === 'glass'
      ? popupMotion(placement)
      : {
          initial: { opacity: 0, ...ENTER_OFFSET[placement] },
          animate: { opacity: 1, x: 0, y: 0 },
          exit: { opacity: 0, ...ENTER_OFFSET[placement], transition: { duration: 0.1 } },
          transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
        };

  const cls =
    variant === 'glass'
      ? clsx(popupCls(placement, popupPad(placement)), className)
      : variant === 'bordered'
        ? clsx('fixed glass-popup rounded-xl shadow-lg overflow-hidden z-4', className)
        : clsx('fixed', className);

  const mergedStyle: CSSProperties = {
    ...style,
    ...(variant === 'glass' ? getPopupStyle(placement) : {}),
    // bordered uses minWidth so content can grow; others take the width verbatim.
    ...(width !== undefined ? (variant === 'bordered' ? { minWidth: width } : { width }) : {}),
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && resolvedAnchor && (
        <motion.div
          ref={assignRef}
          className={cls}
          style={mergedStyle}
          // Glass popups live over the editor and must not steal the text selection.
          onMouseDown={variant === 'glass' ? (e) => e.preventDefault() : undefined}
          {...motionProps}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    getModalPortalRoot(),
  );
};

export default SubPopup;

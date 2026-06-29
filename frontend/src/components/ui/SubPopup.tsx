import {
  useCallback, useEffect, useRef,
  type CSSProperties, type MutableRefObject, type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useSmartPopupStyle, type PopupAnchor, type PopupDirection } from '../../hooks/useSmartPopupStyle';
import { popupCls, popupPad, popupMotion, getPopupStyle } from '../editor/toolbarPopupUtils';

// One sticky sub-popup for the editor toolbars: portalled, glued to its anchor box, with a
// configurable opening direction and optional smart flipping. The anchor is pre-measured by
// the caller (e.g. on click); when it carries `dockSide` the popup mirrors a side panel
// (see useSmartPopupStyle). Surface is the shared glass look from toolbarPopupUtils.
interface SubPopupProps {
  anchor: PopupAnchor | null;
  onClose: () => void;
  direction?: PopupDirection;
  smart?: boolean;
  padding?: number;
  // Inner [near, far] padding scale passed to popupPad (above/below only).
  glassPad?: [string, string];
  // mousedown-outside + Escape close the popup. Off when closing is driven externally
  // (e.g. the More panel owns its pickers).
  closeOnOutside?: boolean;
  // Click-catching overlay behind the popup that closes it (and swallows the click).
  backdrop?: boolean;
  className?: string;
  children: ReactNode;
  // Exposes the popup root (e.g. so useMagicHover can attach to it).
  popupRef?: RefObject<HTMLDivElement | null>;
}

const SubPopup = ({
  anchor,
  onClose,
  direction = 'bottom',
  smart = true,
  padding = 8,
  glassPad,
  closeOnOutside = true,
  backdrop = false,
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

  const isOpen = anchor != null;
  const { style, placement } = useSmartPopupStyle(anchor, innerRef, { padding, prefer: direction, smart });

  useEffect(() => {
    if (!isOpen || !closeOnOutside) return;
    const onDown = (e: MouseEvent) => {
      if (innerRef.current?.contains(e.target as Node)) return;
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
  }, [isOpen, closeOnOutside, onClose]);

  const mergedStyle: CSSProperties = { ...style, ...getPopupStyle(placement) };

  return createPortal(
    <>
      {backdrop && isOpen && <div className="fixed inset-0" onClick={onClose} />}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={assignRef}
            className={clsx(popupCls(placement, popupPad(placement, glassPad?.[0], glassPad?.[1])), className)}
            style={mergedStyle}
            // Lives over the editor and must not steal the text selection.
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion(placement)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    getModalPortalRoot(),
  );
};

export default SubPopup;

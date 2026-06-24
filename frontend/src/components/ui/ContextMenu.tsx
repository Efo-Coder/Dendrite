import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useMagicHover } from '../../hooks/useMagicHover';
import clsx from 'clsx';

export interface ContextMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  // Keep the menu open after this item is clicked (e.g. it opens a submenu).
  keepOpen?: boolean;
  // Highlight the item while its submenu/popup is open (e.g. Share / Export).
  active?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: ContextMenuItem[];
  minWidth?: string;
  // 'right' anchors position.x to the menu's right edge so it opens left under a
  // right-side button (mirrors the notifications panel's right: 0).
  align?: 'left' | 'right';
  // The toggle button that opens this menu — excluded from outside-click so its
  // own click closes the menu instead of the mousedown reopening it.
  triggerRef?: React.RefObject<HTMLElement | null>;
  // A submenu spawned from this menu — excluded from outside-click so clicking
  // into it doesn't close this menu.
  ignoreRef?: React.RefObject<HTMLElement | null>;
  // Exposes the menu's root element so a caller can anchor a submenu to its box.
  panelRef?: React.RefObject<HTMLDivElement | null>;
  // Extra classes on the menu root (e.g. a z-index layer for cascades).
  className?: string;
}

const ContextMenu = ({
  isOpen,
  position,
  onClose,
  items,
  minWidth = '160px',
  align = 'left',
  triggerRef,
  ignoreRef,
  panelRef,
  className,
}: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Merge the internal ref with an optional external panelRef.
  const assignRef = useCallback(
    (el: HTMLDivElement | null) => {
      menuRef.current = el;
      if (panelRef) (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [panelRef]
  );
  const { onItemEnter, onItemLeave, Indicator } = useMagicHover({
    mode: 'free',
    borderRadius: 6,
    ref: menuRef,
    background: 'color-mix(in oklch, var(--accent) 16%, transparent)',
  });

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const menu = menuRef.current;
    const { width, height } = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8;

    const finalY =
      position.y + height > vh - MARGIN ? Math.max(MARGIN, position.y - height) : position.y;

    const finalX =
      align === 'right'
        ? Math.max(MARGIN, position.x - width)
        : position.x + width > vw - MARGIN
          ? Math.max(MARGIN, position.x - width)
          : position.x;

    menu.style.top = `${finalY}px`;
    menu.style.left = `${finalX}px`;
  }, [isOpen, position, align]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !triggerRef?.current?.contains(target) &&
        !ignoreRef?.current?.contains(target)
      ) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, triggerRef, ignoreRef]);

  if (!isOpen) return null;

  return createPortal(
    <motion.div
      ref={assignRef}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className={clsx('fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden', className)}
      style={{
        left: position.x,
        top: position.y,
        minWidth,
        transformOrigin: align === 'right' ? 'top right' : 'top left',
        position: 'fixed',
      }}
    >
      {Indicator}
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.onClick();
            if (!item.keepOpen) onClose();
          }}
          onMouseEnter={onItemEnter}
          onMouseLeave={onItemLeave}
          className={clsx(
            'w-full flex items-center space-x-2 px-3 py-2 text-sm relative z-1',
            item.variant === 'danger'
              ? 'text-red-400'
              : item.active
                ? 'text-(--accent)'
                : 'text-(--ink)'
          )}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </motion.div>,
    getModalPortalRoot()
  );
};

export default ContextMenu;

import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useGlassPill } from '../../hooks/useGlassPill';
import clsx from 'clsx';

export interface ContextMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: ContextMenuItem[];
  minWidth?: string;
}

const ContextMenu = ({ isOpen, position, onClose, items, minWidth = '160px' }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { pill, onEnter, onLeave } = useGlassPill(menuRef);

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const menu = menuRef.current;
    const { width, height } = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8;

    const finalY = position.y + height > vh - MARGIN
      ? Math.max(MARGIN, position.y - height)
      : position.y;

    const finalX = position.x + width > vw - MARGIN
      ? Math.max(MARGIN, position.x - width)
      : position.x;

    menu.style.top  = `${finalY}px`;
    menu.style.left = `${finalX}px`;
  }, [isOpen, position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden"
      style={{ left: position.x, top: position.y, minWidth, transformOrigin: 'top left' }}
      onMouseLeave={onLeave}
    >
      {pill && (
        <div
          className="glass-pill pointer-events-none"
          style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height, opacity: pill.visible ? 1 : 0 }}
        />
      )}
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose(); }}
          onMouseEnter={onEnter}
          className={clsx(
            'relative z-10 w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors',
            item.variant === 'danger' ? 'text-red-400' : 'text-text-primary'
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

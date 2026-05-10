import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGlassPill } from '../hooks/useGlassPill';
import clsx from 'clsx';

export interface ContextMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface GlassContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: ContextMenuItem[];
  minWidth?: string;
}

const GlassContextMenu = ({ isOpen, position, onClose, items, minWidth = '160px' }: GlassContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { pill, onEnter, onLeave } = useGlassPill(menuRef);

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
    <div
      ref={menuRef}
      className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden"
      style={{ left: position.x, top: position.y, zIndex: 9999, minWidth }}
      onMouseLeave={onLeave}
    >
      {pill && (
        <div
          className="glass-pill pointer-events-none"
          style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
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
    </div>,
    document.body
  );
};

export default GlassContextMenu;

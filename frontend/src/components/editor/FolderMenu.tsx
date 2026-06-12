import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { FolderOpen, Check } from 'lucide-react';
import clsx from 'clsx';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useFolderStore } from '../../store/useFolderStore';
import { useMagicHover } from '../../hooks/useMagicHover';
import { MenuPos, useMenuClamp } from './noteEditorUtils';

interface FolderMenuProps {
  pos: MenuPos | null;
  currentFolderId: string | null | undefined;
  onSelect: (folderId: string | null) => void;
  onClose: () => void;
}

const FolderMenu = ({ pos, currentFolderId, onSelect, onClose }: FolderMenuProps) => {
  const { folders } = useFolderStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const { onItemEnter, onItemLeave, Indicator } = useMagicHover({ mode: 'free', borderRadius: 6, ref: menuRef });
  useMenuClamp(pos, menuRef);

  useEffect(() => {
    if (!pos) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pos, onClose]);

  return createPortal(
    <>
      {pos && <div className="fixed inset-0" onClick={onClose} />}
      <AnimatePresence>
        {pos && (
          <motion.div
            key="folder-popup"
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden"
            style={{ left: pos.x, top: pos.y, minWidth: '200px', transformOrigin: 'top left' }}
          >
            {Indicator}
            <button
              onClick={() => onSelect(null)}
              onMouseEnter={onItemEnter}
              onMouseLeave={onItemLeave}
              className={clsx(
                'w-full flex items-center space-x-2 px-3 py-2 text-sm relative z-1',
                !currentFolderId ? 'text-(--ink)' : ''
              )}
            >
              <FolderOpen className="w-4 h-4 text-(--ink-mid) shrink-0" />
              <span className="flex-1 text-left">No folder</span>
              {!currentFolderId && <Check className="w-3 h-3 text-(--accent) shrink-0" />}
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => onSelect(folder.id)}
                onMouseEnter={onItemEnter}
                onMouseLeave={onItemLeave}
                className={clsx(
                  'w-full flex items-center space-x-2 px-3 py-2 text-sm relative z-1',
                  currentFolderId === folder.id ? 'text-(--ink)' : ''
                )}
              >
                <FolderOpen className="w-4 h-4 shrink-0" style={{ color: folder.color || '#10b981' }} />
                <span className="flex-1 text-left">{folder.name}</span>
                {currentFolderId === folder.id && <Check className="w-3 h-3 text-(--accent) shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    getModalPortalRoot()
  );
};

export default FolderMenu;

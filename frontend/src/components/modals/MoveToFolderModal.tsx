import { useState, useEffect, useRef } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useFolderStore } from '../../store/useFolderStore';
import { useToast } from '../ToastContainer';
import Modal from './Modal';
import CreateFolderModal from './CreateFolderModal';
import { useGlassPill } from '../../hooks/useGlassPill';

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string | null) => void;
  currentFolderId?: string | null;
}

const MoveToFolderModal = ({ isOpen, onClose, onMove, currentFolderId }: MoveToFolderModalProps) => {
  const { folders, fetchFolders } = useFolderStore();
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const toast = useToast();

  const listRef = useRef<HTMLDivElement>(null);
  const { pill, onEnter, onLeave } = useGlassPill(listRef);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen, fetchFolders]);

  const handleMove = (folderId: string | null) => {
    onMove(folderId);
    onClose();
  };

  const handleCreateFolder = () => {
    setShowCreateFolderModal(true);
  };

  const handleFolderCreated = () => {
    setShowCreateFolderModal(false);
    fetchFolders();
    toast.success('Ordner erstellt');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Notiz verschieben">
        <div className="space-y-4">
          <p className="text-sm text-accent-secondary">
            Wähle einen Ordner aus, in den die Notiz verschoben werden soll:
          </p>

          <div ref={listRef} className="relative" onMouseLeave={onLeave}>
            {pill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
              />
            )}
            <div className="max-h-64 overflow-y-auto space-y-1">
              <button
                onClick={() => handleMove(null)}
                onMouseEnter={onEnter}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors relative z-10 ${
                  currentFolderId === null
                    ? 'bg-accent-brand/10 text-accent-brand'
                    : 'text-accent-fg'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-accent-subtle" />
                <span className="text-sm">Kein Ordner</span>
              </button>

              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMove(folder.id)}
                  onMouseEnter={onEnter}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors relative z-10 ${
                    currentFolderId === folder.id
                      ? 'bg-accent-brand/10 text-accent-brand'
                      : 'text-accent-fg'
                  }`}
                >
                  <FolderOpen
                    className="w-4 h-4"
                    style={{ color: folder.color || '#10b981' }}
                  />
                  <span className="text-sm">{folder.name}</span>
                </button>
              ))}

              <button
                onClick={handleCreateFolder}
                onMouseEnter={onEnter}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-accent-fg border-t glass-divider pt-3 mt-3 relative z-10"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Neuen Ordner erstellen</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-accent-fg hover:text-accent-brand transition-all relative group"
            >
              <span className="relative">Abbrechen</span>
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </button>
          </div>
        </div>
      </Modal>

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onFolderCreated={handleFolderCreated}
      />
    </>
  );
};

export default MoveToFolderModal;
import { useState, useEffect, useRef } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useFolderStore } from '../../store/useFolderStore';
import { useToast } from '../ui/ToastContainer';
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
          <p className="text-sm text-text-secondary">
            Wähle einen Ordner aus, in den die Notiz verschoben werden soll:
          </p>

          <div ref={listRef} className="relative" onMouseLeave={onLeave}>
            {pill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height, opacity: pill.visible ? 1 : 0 }}
              />
            )}
            <div className="max-h-64 overflow-y-auto space-y-1">
              <button
                onClick={() => handleMove(null)}
                onMouseEnter={onEnter}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors relative z-10 ${
                  currentFolderId === null || currentFolderId === undefined
                    ? 'text-text-primary'
                    : 'text-text-secondary'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-text-secondary" />
                <span className="text-sm">Kein Ordner</span>
              </button>

              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMove(folder.id)}
                  onMouseEnter={onEnter}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors relative z-10 ${
                    currentFolderId === folder.id
                      ? 'text-text-primary'
                      : 'text-text-secondary'
                  }`}
                >
                  <FolderOpen
                    className="w-4 h-4"
                    style={{ color: folder.color || '#10b981' }}
                  />
                  <span className="text-sm">{folder.name}</span>
                </button>
              ))}

              <div className="border-b glass-divider" />

              <button
                onClick={handleCreateFolder}
                onMouseEnter={onEnter}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-text-primary relative z-10"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Neuen Ordner erstellen</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={onClose} className="btn">Abbrechen</button>
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
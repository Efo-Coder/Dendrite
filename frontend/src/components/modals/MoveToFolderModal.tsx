import { useState, useEffect } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useFolderStore } from '../../store/useFolderStore';
import { useToast } from '../ToastContainer';
import Modal from './Modal';
import CreateFolderModal from './CreateFolderModal';

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
          <p className="text-sm text-dark-text-secondary">
            Wähle einen Ordner aus, in den die Notiz verschoben werden soll:
          </p>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {/* No folder option */}
            <button
              onClick={() => handleMove(null)}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
                currentFolderId === null
                  ? 'bg-accent-green-500/10 text-accent-green-500'
                  : 'hover:bg-dark-elevated text-dark-text-primary'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-dark-text-muted" />
              <span className="text-sm">Kein Ordner</span>
            </button>

            {/* Existing folders */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMove(folder.id)}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentFolderId === folder.id
                    ? 'bg-accent-green-500/10 text-accent-green-500'
                    : 'hover:bg-dark-elevated text-dark-text-primary'
                }`}
              >
                <FolderOpen 
                  className="w-4 h-4" 
                  style={{ color: folder.color || '#10b981' }} 
                />
                <span className="text-sm">{folder.name}</span>
              </button>
            ))}

            {/* Create new folder option */}
            <button
              onClick={handleCreateFolder}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-dark-elevated text-dark-text-primary border-t border-dark-border pt-3 mt-3"
            >
              <Plus className="w-4 h-4 text-accent-green-500" />
              <span className="text-sm text-accent-green-500">Neuen Ordner erstellen</span>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-dark-elevated text-dark-text-primary hover:bg-dark-border transition-colors"
            >
              Abbrechen
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

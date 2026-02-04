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
          <p className="text-sm text-accent-800">
            Wähle einen Ordner aus, in den die Notiz verschoben werden soll:
          </p>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {/* No folder option */}
            <button
              onClick={() => handleMove(null)}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors relative group ${
                currentFolderId === null
                  ? 'bg-accent-500/10 text-accent-500'
                  : 'hover-highlight text-accent-900'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-accent-700" />
              <span className="text-sm relative z-10">Kein Ordner</span>
              {currentFolderId !== null && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              )}
            </button>

            {/* Existing folders */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMove(folder.id)}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors relative group ${
                  currentFolderId === folder.id
                    ? 'bg-accent-500/10 text-accent-500'
                    : 'hover-highlight text-accent-900'
                }`}
              >
                <FolderOpen
                  className="w-4 h-4"
                  style={{ color: folder.color || '#10b981' }}
                />
                <span className="text-sm relative z-10">{folder.name}</span>
                {currentFolderId !== folder.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                )}
              </button>
            ))}

            {/* Create new folder option */}
            <button
              onClick={handleCreateFolder}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors hover-highlight text-accent-900 border-t glass-divider pt-3 mt-3 relative group"
            >
              <Plus className="w-4 h-4 text-accent-500" />
              <span className="text-sm text-accent-500 relative z-10">Neuen Ordner erstellen</span>
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </button>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all relative group"
            >
              <span className="relative z-10">Abbrechen</span>
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


import { useState, useEffect } from 'react';
import Modal from './Modal';
import { MagicInput } from '../ui/MagicInput';
import { useFolderStore } from '../../store/useFolderStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canAccess } from '../../lib/planFeatures';
import ColorPickerInline from '../editor/ColorPickerInline';
import IconPickerDropdown from '../ui/IconPickerDropdown';
import { getApiErrorMessage } from '../../lib/apiError';

// Edits either a space or a folder — both carry name/color/icon.
export interface EditTarget {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderUpdated?: () => void;
  kind: 'space' | 'folder';
  folder: EditTarget | null;
}

const presets = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
  '#f59e0b', '#ec4899', '#06b6d4', '#84cc16',
  '#ffffff', '#000000',
];

const EditFolderModal = ({ isOpen, onClose, onFolderUpdated, kind, folder }: EditFolderModalProps) => {
  const { updateFolder } = useFolderStore();
  const { updateSpace } = useSpaceStore();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setSelectedColor(folder.color || '#10b981');
      setSelectedIcon(folder.icon ?? null);
    }
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!folder) {
      setError(kind === 'space' ? 'Space not found' : 'Folder not found');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = { name: name.trim(), color: selectedColor, icon: selectedIcon ?? undefined };
      if (kind === 'space') await updateSpace(folder.id, data);
      else await updateFolder(folder.id, data);
      onFolderUpdated?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, kind === 'space' ? 'Error updating space' : 'Error updating folder'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedColor('#10b981');
    setSelectedIcon(null);
    setError('');
    onClose();
  };

  if (!folder) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={kind === 'space' ? 'Edit Space' : 'Edit Folder'} className="folder-picker-modal">
      <form onSubmit={handleSubmit}>
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label htmlFor="folder-name" className="modal-label">Name</label>
          <MagicInput
            id="folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="modal-input"
            placeholder="e.g. Work, Personal, Projects"
            autoFocus
            required
            wrapperStyle={{ borderRadius: '10px' }}
          />
        </div>

        <div className="modal-field">
          <label className="modal-label">Icon</label>
          <IconPickerDropdown value={selectedIcon} onChange={setSelectedIcon} />
        </div>

        <div className="modal-field">
          <label className="modal-label">Color</label>
          <ColorPickerInline
            color={selectedColor}
            onChange={setSelectedColor}
            storageKey="dendrite-tag-folder-favorites"
            presets={presets}
            canFavorite={canAccess(user?.plan, 'colorFavorites')}
            canCustomColor={canAccess(user?.plan, 'customColor')}
          />
        </div>

        <div className="modal-form-ft">
          <button type="button" onClick={handleClose} className="btn-ghost" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditFolderModal;

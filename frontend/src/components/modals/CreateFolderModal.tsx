import { useState } from 'react';
import Modal from './Modal';
import { MagicInput } from '../ui/MagicInput';
import { useFolderStore } from '../../store/useFolderStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canAccess } from '../../lib/planFeatures';
import ColorPickerInline from '../editor/ColorPickerInline';
import IconPickerDropdown from '../ui/IconPickerDropdown';
import { getApiErrorMessage } from '../../lib/apiError';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated?: () => void;
  // With a spaceId this creates a folder inside that space (optionally under parentId);
  // without it, it creates a top-level space.
  spaceId?: string;
  parentId?: string;
}

const presets = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
  '#f59e0b', '#ec4899', '#06b6d4', '#84cc16',
  '#ffffff', '#000000',
];

const CreateFolderModal = ({ isOpen, onClose, onFolderCreated, spaceId, parentId }: CreateFolderModalProps) => {
  const { createFolder } = useFolderStore();
  const { createSpace } = useSpaceStore();
  const { user } = useAuthStore();
  const isFolder = !!spaceId;
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (spaceId) {
        await createFolder({ name: name.trim(), spaceId, parentId, color: selectedColor, icon: selectedIcon ?? undefined });
      } else {
        await createSpace({ name: name.trim(), color: selectedColor, icon: selectedIcon ?? undefined });
      }
      setName('');
      setSelectedColor('#10b981');
      setSelectedIcon(null);
      onFolderCreated?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, isFolder ? 'Error creating folder' : 'Error creating space'));
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isFolder ? 'New Folder' : 'New Space'} className="folder-picker-modal">
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

        <div className="modal-field" style={{ marginTop: '12px' }}>
          <label className="modal-label">Icon</label>
          <IconPickerDropdown value={selectedIcon} onChange={setSelectedIcon} />
        </div>

        <div className="modal-field" style={{ marginTop: '12px' }}>
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
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateFolderModal;

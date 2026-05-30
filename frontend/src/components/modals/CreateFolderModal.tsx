import { useState } from 'react';
import Modal from './Modal';
import { useFolderStore } from '../../store/useFolderStore';
import ColorPickerInline from '../editor/ColorPickerInline';
import { FOLDER_ICONS } from '../../lib/folderIcons';
import clsx from 'clsx';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated?: () => void;
}

const presets = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
  '#f59e0b', '#ec4899', '#06b6d4', '#84cc16',
  '#ffffff', '#000000',
];

const CreateFolderModal = ({ isOpen, onClose, onFolderCreated }: CreateFolderModalProps) => {
  const { createFolder } = useFolderStore();
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
      await createFolder({ name: name.trim(), color: selectedColor, icon: selectedIcon ?? undefined });
      setName('');
      setSelectedColor('#10b981');
      setSelectedIcon(null);
      onFolderCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error creating folder');
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
    <Modal isOpen={isOpen} onClose={handleClose} title="New Folder" className="folder-picker-modal">
      <form onSubmit={handleSubmit}>
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label htmlFor="folder-name" className="modal-label">Name</label>
          <input
            id="folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="modal-input"
            placeholder="e.g. Work, Personal, Projects"
            autoFocus
            required
          />
        </div>

        <div className="modal-field" style={{ marginTop: '12px' }}>
          <label className="modal-label">Icon</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(FOLDER_ICONS).map(([name, IconComp]) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => setSelectedIcon(selectedIcon === name ? null : name)}
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                  selectedIcon === name
                    ? 'bg-(--surface-hi) ring-2 ring-(--accent) text-(--accent)'
                    : 'bg-(--surface) ring-1 ring-(--line) text-(--ink-mid) hover:text-(--ink) hover:bg-(--surface-hi)'
                )}
              >
                <IconComp style={{ width: 14, height: 14 }} />
              </button>
            ))}
          </div>
        </div>

        <div className="modal-field" style={{ marginTop: '12px' }}>
          <label className="modal-label">Color</label>
          <ColorPickerInline
            color={selectedColor}
            onChange={setSelectedColor}
            storageKey="dendrite-tag-folder-favorites"
            presets={presets}
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

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { MagicInput } from '../ui/MagicInput';
import { useTagStore } from '../../store/useTagStore';
import { Tag } from '../../types';
import ColorPickerInline from '../editor/ColorPickerInline';

interface EditTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagUpdated?: () => void;
  tag: Tag | null;
}

const presets = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
  '#f59e0b', '#ec4899', '#06b6d4', '#84cc16',
  '#ffffff', '#000000',
];

const EditTagModal = ({ isOpen, onClose, onTagUpdated, tag }: EditTagModalProps) => {
  const { updateTag } = useTagStore();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setSelectedColor(tag.color);
    }
  }, [tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!tag) {
      setError('Tag not found');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTag(tag.id, { name: name.trim(), color: selectedColor });
      onTagUpdated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error updating tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedColor('#10b981');
    setError('');
    onClose();
  };

  if (!tag) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Tag">
      <form onSubmit={handleSubmit}>
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label htmlFor="tag-name" className="modal-label">Name</label>
          <MagicInput
            id="tag-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="modal-input"
            placeholder="e.g. Important, Idea, Todo"
            autoFocus
            required
            wrapperStyle={{ borderRadius: '10px' }}
          />
        </div>

        <div className="modal-field">
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
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTagModal;

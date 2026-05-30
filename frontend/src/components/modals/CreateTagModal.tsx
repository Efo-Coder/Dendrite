import { useState } from 'react';
import Modal from './Modal';
import { useTagStore } from '../../store/useTagStore';
import ColorPickerInline from '../editor/ColorPickerInline';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagCreated?: () => void;
}

const presets = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
  '#f59e0b', '#ec4899', '#06b6d4', '#84cc16',
  '#ffffff', '#000000',
];

const CreateTagModal = ({ isOpen, onClose, onTagCreated }: CreateTagModalProps) => {
  const { createTag } = useTagStore();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    if (name.trim().length > 20) {
      setError('Tag name must be 20 characters or fewer');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTag({ name: name.trim(), color: selectedColor });
      setName('');
      setSelectedColor('#10b981');
      onTagCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error creating tag');
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Tag">
      <form onSubmit={handleSubmit}>
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label htmlFor="tag-name" className="modal-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            Name
            <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: name.length >= 18 ? 'var(--accent)' : 'var(--ink-dim)', letterSpacing: '0.05em' }}>
              {name.length}/20
            </span>
          </label>
          <input
            id="tag-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="modal-input"
            placeholder="e.g. Important, Idea, Todo"
            maxLength={20}
            autoFocus
            required
          />
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

export default CreateTagModal;

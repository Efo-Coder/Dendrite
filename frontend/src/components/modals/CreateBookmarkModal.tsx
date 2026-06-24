import { useEffect, useState } from 'react';
import Modal from './Modal';
import { MagicInput } from '../ui/MagicInput';
import { Bookmark } from '../../types';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canAccess } from '../../lib/planFeatures';
import ColorPickerInline from '../editor/ColorPickerInline';
import { getApiErrorMessage } from '../../lib/apiError';

interface CreateBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookmarkSaved?: () => void;
  // When set, the modal edits this bookmark instead of creating a new one.
  editBookmark?: Bookmark;
}

const presets = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
  '#f59e0b', '#ec4899', '#06b6d4', '#84cc16',
  '#ffffff', '#000000',
];

const CreateBookmarkModal = ({ isOpen, onClose, onBookmarkSaved, editBookmark }: CreateBookmarkModalProps) => {
  const { createBookmark, updateBookmark } = useBookmarkStore();
  const { user } = useAuthStore();
  const isEdit = !!editBookmark;
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Seed the fields from the edited bookmark (or reset for create) whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setName(editBookmark?.name ?? '');
    setSelectedColor(editBookmark?.color ?? '#10b981');
    setError('');
  }, [isOpen, editBookmark]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    if (name.trim().length > 20) {
      setError('Bookmark name must be 20 characters or fewer');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editBookmark) await updateBookmark(editBookmark.id, { name: name.trim(), color: selectedColor });
      else await createBookmark({ name: name.trim(), color: selectedColor });
      onBookmarkSaved?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, isEdit ? 'Error saving bookmark' : 'Error creating bookmark'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Bookmark' : 'New Bookmark'}>
      <form onSubmit={handleSubmit}>
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label htmlFor="bookmark-name" className="modal-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            Name
            <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: name.length >= 18 ? 'var(--accent)' : 'var(--ink-dim)', letterSpacing: '0.05em' }}>
              {name.length}/20
            </span>
          </label>
          <MagicInput
            id="bookmark-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="modal-input"
            placeholder="e.g. Important, Idea, Todo"
            maxLength={20}
            autoFocus
            required
            wrapperStyle={{ borderRadius: '10px' }}
          />
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
          <button type="button" onClick={onClose} className="btn-ghost" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save' : 'Create')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBookmarkModal;

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useFolderStore } from '../../store/useFolderStore';
import { Folder } from '../../types';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderUpdated?: () => void;
  folder: Folder | null;
}

const colors = [
  '#10b981', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ef4444', // red
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

const EditFolderModal = ({ isOpen, onClose, onFolderUpdated, folder }: EditFolderModalProps) => {
  const { updateFolder } = useFolderStore();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setSelectedColor(folder.color);
    }
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Bitte gib einen Namen ein');
      return;
    }

    if (!folder) {
      setError('Ordner nicht gefunden');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateFolder(folder.id, {
        name: name.trim(),
        color: selectedColor,
      });
      onFolderUpdated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Aktualisieren des Ordners');
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

  if (!folder) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ordner bearbeiten">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Name Input */}
        <div>
          <label htmlFor="folder-name" className="block text-sm font-medium text-dark-text-primary mb-2">
            Name
          </label>
          <input
            id="folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="z.B. Arbeit, Persönlich, Projekte"
            autoFocus
            required
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-dark-text-primary mb-2">
            Farbe
          </label>
          <div className="grid grid-cols-8 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-lg transition-all ${
                  selectedColor === color
                    ? 'ring-2 ring-offset-2 ring-offset-dark-surface ring-accent-green-500 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditFolderModal;

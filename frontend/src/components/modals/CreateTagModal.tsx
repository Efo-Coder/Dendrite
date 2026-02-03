import { useState } from 'react';
import Modal from './Modal';
import { useTagStore } from '../../store/useTagStore';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagCreated?: () => void;
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
      setError('Bitte gib einen Namen ein');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTag({
        name: name.trim(),
        color: selectedColor,
      });
      setName('');
      setSelectedColor('#10b981');
      onTagCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen des Tags');
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Neuer Tag">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Name Input */}
        <div>
          <label htmlFor="tag-name" className="block text-xs font-medium text-accent-900 mb-2 uppercase tracking-wide">
            Name
          </label>
          <input
            id="tag-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 bg-black/10 backdrop-blur-sm border border-accent-300 rounded-lg text-accent-900 text-sm placeholder:text-accent-700 focus:outline-none focus:border-accent-500 transition-all"
            placeholder="z.B. Wichtig, Idee, ToDo"
            autoFocus
            required
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-medium text-accent-900 mb-2 uppercase tracking-wide">
            Farbe
          </label>
          <div className="grid grid-cols-8 gap-2 mb-3">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-lg transition-all relative group ${
                  selectedColor === color
                    ? 'ring-1 ring-accent-500 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Custom Color Picker */}
          <div className="flex items-center gap-3">
            <label htmlFor="custom-color" className="text-sm text-accent-800">
              Oder eigene Farbe:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  id="custom-color"
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                  title="Eigene Farbe wählen"
                />
                <div
                  className={`w-8 h-8 rounded-lg cursor-pointer transition-all relative group ${
                    !colors.includes(selectedColor)
                      ? 'ring-1 ring-accent-500 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: selectedColor }}
                  onClick={() => document.getElementById('custom-color')?.click()}
                />
              </div>
              <span className="text-xs text-accent-700 font-mono">
                {selectedColor}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all relative group"
            disabled={isSubmitting}
          >
            <span className="relative z-10">Abbrechen</span>
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all relative group disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            <span className="relative z-10">{isSubmitting ? 'Erstelle...' : 'Erstellen'}</span>
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity"></span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTagModal;

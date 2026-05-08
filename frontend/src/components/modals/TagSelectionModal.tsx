import { useState, useEffect, useRef } from 'react';
import { Tag, Plus } from 'lucide-react';
import { useTagStore } from '../../store/useTagStore';
import { useToast } from '../ToastContainer';
import Modal from './Modal';
import CreateTagModal from './CreateTagModal';
import { useGlassPill } from '../../hooks/useGlassPill';

interface TagSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTags: (tagIds: string[]) => void;
  currentTagIds: string[];
}

const TagSelectionModal = ({ isOpen, onClose, onUpdateTags, currentTagIds }: TagSelectionModalProps) => {
  const { tags, fetchTags } = useTagStore();
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(currentTagIds);
  const toast = useToast();

  const listRef = useRef<HTMLDivElement>(null);
  const { pill, onEnter, onLeave } = useGlassPill(listRef);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      setSelectedTagIds(currentTagIds);
    }
    // currentTagIds creates a new array reference on every render (.map()),
    // so we only sync on open to avoid an infinite re-render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = () => {
    onUpdateTags(selectedTagIds);
    onClose();
  };

  const handleCreateTag = () => {
    setShowCreateTagModal(true);
  };

  const handleTagCreated = () => {
    setShowCreateTagModal(false);
    fetchTags();
    toast.success('Tag erstellt');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Tags verwalten">
        <div className="space-y-4">
          <p className="text-sm text-accent-secondary">
            Wähle die Tags aus, die mit dieser Notiz verknüpft werden sollen:
          </p>

          <div ref={listRef} className="relative" onMouseLeave={onLeave}>
            {pill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
              />
            )}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {tags.length === 0 ? (
                <div className="text-center py-8 text-accent-subtle">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine Tags vorhanden</p>
                </div>
              ) : (
                tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      onMouseEnter={onEnter}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors relative z-10 ${
                        isSelected
                          ? 'bg-accent-brand/10 text-accent-brand'
                          : 'text-accent-fg'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-white/30 flex-shrink-0"
                        style={{ accentColor: tag.color }}
                      />
                      <Tag className="w-4 h-4 flex-shrink-0" style={{ color: tag.color }} />
                      <span className="text-sm">{tag.name}</span>
                    </button>
                  );
                })
              )}

              <button
                onClick={handleCreateTag}
                onMouseEnter={onEnter}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-accent-fg border-t glass-divider pt-3 mt-3 relative z-10"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Neuen Tag erstellen</span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-xs text-accent-subtle">
              {selectedTagIds.length} Tag{selectedTagIds.length !== 1 ? 's' : ''} ausgewählt
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-accent-fg hover:text-accent-brand transition-all relative group"
              >
                <span className="relative">Abbrechen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm text-accent-fg hover:text-accent-brand transition-all relative group"
              >
                <span className="relative">Speichern</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <CreateTagModal
        isOpen={showCreateTagModal}
        onClose={() => setShowCreateTagModal(false)}
        onTagCreated={handleTagCreated}
      />
    </>
  );
};

export default TagSelectionModal;

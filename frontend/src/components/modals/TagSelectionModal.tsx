import { useState, useEffect } from 'react';
import { Tag, Plus } from 'lucide-react';
import { useTagStore } from '../../store/useTagStore';
import { useToast } from '../ToastContainer';
import Modal from './Modal';
import CreateTagModal from './CreateTagModal';

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

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      setSelectedTagIds(currentTagIds);
    }
  }, [isOpen, fetchTags, currentTagIds]);

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
          <p className="text-sm text-accent-800">
            Wähle die Tags aus, die mit dieser Notiz verknüpft werden sollen:
          </p>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {tags.length === 0 ? (
              <div className="text-center py-8 text-accent-700">
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
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors relative group ${
                      isSelected
                        ? 'bg-accent-500/10 text-accent-500'
                        : 'hover:bg-accent-200 text-accent-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-accent-300 flex-shrink-0"
                      style={{ accentColor: tag.color }}
                    />
                    <Tag className="w-4 h-4 flex-shrink-0" style={{ color: tag.color }} />
                    <span className="text-sm relative z-10">{tag.name}</span>
                    {!isSelected && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    )}
                  </button>
                );
              })
            )}

            {/* Create new tag option */}
            <button
              onClick={handleCreateTag}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-accent-200 text-accent-900 border-t border-accent-300 pt-3 mt-3 relative group"
            >
              <Plus className="w-4 h-4 text-accent-500" />
              <span className="text-sm text-accent-500 relative z-10">Neuen Tag erstellen</span>
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-xs text-accent-700">
              {selectedTagIds.length} Tag{selectedTagIds.length !== 1 ? 's' : ''} ausgewählt
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all relative group"
              >
                <span className="relative z-10">Abbrechen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all relative group"
              >
                <span className="relative z-10">Speichern</span>
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

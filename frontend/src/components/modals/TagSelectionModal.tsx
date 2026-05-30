import { useState, useEffect, useRef } from 'react';
import { Tag, Plus } from 'lucide-react';
import { useTagStore } from '../../store/useTagStore';
import { useToast } from '../ui/ToastContainer';
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
    // currentTagIds creates a new array reference on every render (.map()),
    // so we only sync on open to avoid an infinite re-render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) return prev.filter(id => id !== tagId);
      if (prev.length >= 4) { toast.error('Maximum 4 tags per note'); return prev; }
      return [...prev, tagId];
    });
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
    toast.success('Tag created');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage tags"
        showFooter={true}
        confirmLabel="Save"
        onConfirm={handleSave}
      >
        <div className="space-y-4">
          <p className="text-sm text-(--ink-mid)">
            Select the tags to associate with this note:
          </p>

          <div className="modal-list-scroll space-y-1">
              {tags.length === 0 ? (
                <div className="text-center py-8 text-(--ink-mid)">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tags yet</p>
                </div>
              ) : (
                tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  const atLimit = selectedTagIds.length >= 4 && !isSelected;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      disabled={atLimit}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        atLimit
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-(--surface-hi)'
                      } ${isSelected ? 'text-(--ink)' : 'text-(--ink-mid)'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-white/30 shrink-0"
                        style={{ accentColor: tag.color }}
                      />
                      <Tag className="w-4 h-4 shrink-0" style={{ color: tag.color }} />
                      <span className="text-sm">{tag.name}</span>
                    </button>
                  );
                })
              )}

              <div className="border-b border-(--line-soft)" />

              <button
                onClick={handleCreateTag}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-(--ink) hover:bg-(--surface-hi)"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Create new tag</span>
              </button>
          </div>

          <div className="text-xs text-(--ink-mid)">
            {selectedTagIds.length}/4 tags selected
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

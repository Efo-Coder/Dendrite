import ImageInsertModal from '../modals/ImageInsertModal';
import { useNoteStore } from '../../store/useNoteStore';
import { useFolderStore } from '../../store/useFolderStore';
import { useSpaceStore } from '../../store/useSpaceStore';

const API_URL = import.meta.env.VITE_API_URL || '';
// Store covers relative so the value stays portable across environments (like avatarUrl).
const toRelative = (url: string) => (API_URL && url.startsWith(API_URL) ? url.slice(API_URL.length) : url);

export interface CoverTarget {
  kind: 'note' | 'folder' | 'space';
  id: string;
}

interface CoverPickerModalProps {
  target: CoverTarget | null;
  onClose: () => void;
  // The store update only reaches store-backed lists; views that keep notes/folders in
  // local state (favorites/archived/shared, category pages, containers) use this to patch
  // their copy instantly instead of waiting for the next refetch.
  onCoverChange?: (target: CoverTarget, coverImage: string) => void;
}

// Reuses the editor's image modal (URL or upload) to set a card's cover image.
const CoverPickerModal = ({ target, onClose, onCoverChange }: CoverPickerModalProps) => {
  const updateNote = useNoteStore((s) => s.updateNote);
  const updateFolder = useFolderStore((s) => s.updateFolder);
  const updateSpace = useSpaceStore((s) => s.updateSpace);

  const handleInsert = (src: string) => {
    if (!target) return;
    const coverImage = toRelative(src);
    if (target.kind === 'note') void updateNote(target.id, { coverImage });
    else if (target.kind === 'space') void updateSpace(target.id, { coverImage });
    else void updateFolder(target.id, { coverImage });
    onCoverChange?.(target, coverImage);
  };

  return <ImageInsertModal isOpen={!!target} onClose={onClose} onInsert={handleInsert} showPresets />;
};

export default CoverPickerModal;

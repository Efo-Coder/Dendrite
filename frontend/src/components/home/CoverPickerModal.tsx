import ImageInsertModal from '../modals/ImageInsertModal';
import { useNoteStore } from '../../store/useNoteStore';
import { useFolderStore } from '../../store/useFolderStore';

const API_URL = import.meta.env.VITE_API_URL || '';
// Store covers relative so the value stays portable across environments (like avatarUrl).
const toRelative = (url: string) => (API_URL && url.startsWith(API_URL) ? url.slice(API_URL.length) : url);

export interface CoverTarget {
  kind: 'note' | 'folder';
  id: string;
}

interface CoverPickerModalProps {
  target: CoverTarget | null;
  onClose: () => void;
}

// Reuses the editor's image modal (URL or upload) to set a card's cover image.
const CoverPickerModal = ({ target, onClose }: CoverPickerModalProps) => {
  const updateNote = useNoteStore((s) => s.updateNote);
  const updateFolder = useFolderStore((s) => s.updateFolder);

  const handleInsert = (src: string) => {
    if (!target) return;
    const coverImage = toRelative(src);
    if (target.kind === 'note') void updateNote(target.id, { coverImage });
    else void updateFolder(target.id, { coverImage });
  };

  return <ImageInsertModal isOpen={!!target} onClose={onClose} onInsert={handleInsert} />;
};

export default CoverPickerModal;

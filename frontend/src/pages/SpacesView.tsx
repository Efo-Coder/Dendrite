import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useFolderStore } from '../store/useFolderStore';
import { useLenisScroll } from '../hooks/useLenisScroll';
import CoverCard from '../components/home/CoverCard';
import CoverPickerModal, { type CoverTarget } from '../components/home/CoverPickerModal';
import BackButton from '../components/home/BackButton';
import CreateFolderModal from '../components/modals/CreateFolderModal';

interface SpacesViewProps {
  onOpenSpace: (id: string) => void;
  onBack: () => void;
}

const SpacesView = ({ onOpenSpace, onBack }: SpacesViewProps) => {
  const folders = useFolderStore((s) => s.folders);
  const fetchFolders = useFolderStore((s) => s.fetchFolders);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  return (
    <main ref={scrollRef} className="home-main">
      <div ref={contentRef} className="home-content">
        <div className="home-view-topbar">
          <button type="button" className="home-view-action" onClick={() => setShowCreate(true)}>
            <Plus size={16} strokeWidth={1.75} /> New Space
          </button>
          <BackButton onClick={onBack} />
        </div>
        <header className="home-header">
          <p className="home-greeting">Your spaces</p>
          <h1 className="home-headline">Where your thinking lives.</h1>
        </header>

        {folders.length === 0 ? (
          <p className="home-empty">No spaces yet — create one in the workspace to organise your notes.</p>
        ) : (
          <div className="home-card-grid">
            {folders.map((folder) => (
              <CoverCard
                key={folder.id}
                title={folder.name}
                subtitle={`${folder.notes?.length ?? 0} ${(folder.notes?.length ?? 0) === 1 ? 'note' : 'notes'}`}
                cover={folder.coverImage}
                seed={folder.id}
                onClick={() => onOpenSpace(folder.id)}
                onSetCover={() => setCoverTarget({ kind: 'folder', id: folder.id })}
              />
            ))}
          </div>
        )}
      </div>

      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} />
      <CreateFolderModal isOpen={showCreate} onClose={() => setShowCreate(false)} onFolderCreated={fetchFolders} />
    </main>
  );
};

export default SpacesView;

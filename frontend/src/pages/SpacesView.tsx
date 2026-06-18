import { useEffect } from 'react';
import { useFolderStore } from '../store/useFolderStore';
import CoverCard from '../components/home/CoverCard';

interface SpacesViewProps {
  onOpenSpace: (id: string) => void;
}

const SpacesView = ({ onOpenSpace }: SpacesViewProps) => {
  const folders = useFolderStore((s) => s.folders);
  const fetchFolders = useFolderStore((s) => s.fetchFolders);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  return (
    <main className="home-main">
      <div className="home-content">
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
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default SpacesView;

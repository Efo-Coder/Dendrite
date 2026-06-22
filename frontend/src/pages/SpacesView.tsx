import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Space } from '../types';
import { useSpaceStore } from '../store/useSpaceStore';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useCardFlip } from '../hooks/useCardFlip';
import { useLeaving } from '../hooks/useLeaving';
import CoverCard from '../components/home/CoverCard';
import CoverPickerModal, { type CoverTarget } from '../components/home/CoverPickerModal';
import BackButton from '../components/home/BackButton';
import CreateFolderModal from '../components/modals/CreateFolderModal';
import { useSpaceCardMenu } from '../components/home/useSpaceCardMenu';

interface SpacesViewProps {
  onOpenSpace: (id: string, name: string) => void;
  onBack: () => void;
}

// Space cards with FLIP shift + enter/leave animations (matches the note grids).
interface SpaceGridProps {
  spaces: Space[];
  onOpen: (id: string, name: string) => void;
  onSetCover: (space: Space) => void;
  onMenu: (e: React.MouseEvent, space: Space) => void;
}

const SpaceGrid = ({ spaces, onOpen, onSetCover, onMenu }: SpaceGridProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useCardFlip(ref);
  const rendered = useLeaving(spaces, (s) => s.id);
  return (
    <div ref={ref} className="home-card-grid">
      {rendered.map(({ item: space, leaving }, i) => (
        <CoverCard
          key={space.id}
          index={i}
          leaving={leaving}
          flipId={space.id}
          title={space.name}
          subtitle={`${space.notes?.length ?? 0} ${(space.notes?.length ?? 0) === 1 ? 'note' : 'notes'}`}
          cover={space.coverImage}
          seed={space.id}
          onClick={() => onOpen(space.id, space.name)}
          onSetCover={() => onSetCover(space)}
          onContextMenu={(e) => onMenu(e, space)}
        />
      ))}
    </div>
  );
};

const SpacesView = ({ onOpenSpace, onBack }: SpacesViewProps) => {
  const spaces = useSpaceStore((s) => s.spaces);
  const fetchSpaces = useSpaceStore((s) => s.fetchSpaces);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef, 'spaces');

  const setCover = (s: Space) => setCoverTarget({ kind: 'space', id: s.id });
  const spaceMenu = useSpaceCardMenu({ onAfterChange: fetchSpaces, onSetCover: setCover });

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const pinned = useMemo(() => spaces.filter((s) => s.isPinned), [spaces]);
  const rest = useMemo(() => spaces.filter((s) => !s.isPinned), [spaces]);

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

        {spaces.length === 0 ? (
          <p className="home-empty">No spaces yet — create one to organise your thinking.</p>
        ) : pinned.length > 0 ? (
          <>
            <section className="notes-month-group">
              <div className="notes-month-label">Pinned</div>
              <SpaceGrid spaces={pinned} onOpen={onOpenSpace} onSetCover={setCover} onMenu={spaceMenu.openMenu} />
            </section>
            {rest.length > 0 && (
              <section className="notes-month-group notes-rest">
                <SpaceGrid spaces={rest} onOpen={onOpenSpace} onSetCover={setCover} onMenu={spaceMenu.openMenu} />
              </section>
            )}
          </>
        ) : (
          <SpaceGrid spaces={rest} onOpen={onOpenSpace} onSetCover={setCover} onMenu={spaceMenu.openMenu} />
        )}
      </div>

      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} />
      <CreateFolderModal isOpen={showCreate} onClose={() => setShowCreate(false)} onFolderCreated={fetchSpaces} />
      {spaceMenu.element}
    </main>
  );
};

export default SpacesView;

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
import ViewModeToggle from '../components/home/ViewModeToggle';
import { gridClassFor, type CardViewMode } from '../lib/viewMode';
import { useViewMode } from '../hooks/useViewMode';
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
  // Set true once the first network load has landed (gates the mount FLIP).
  armed?: boolean;
  // Card layout: tile (default), small or list.
  view: CardViewMode;
}

const SpaceGrid = ({ spaces, onOpen, onSetCover, onMenu, armed, view }: SpaceGridProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useCardFlip(ref, armed);
  const rendered = useLeaving(spaces, (s) => s.id);
  return (
    <div ref={ref} className={gridClassFor(view)}>
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
          list={view === 'list'}
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
  const [view, setView] = useViewMode('spaces');
  // FLIP stays silent until the first network load lands, so the cache→network reconcile
  // doesn't glide the cards when the view opens.
  const [armed, setArmed] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef, 'spaces');

  const setCover = (s: Space) => setCoverTarget({ kind: 'space', id: s.id });
  const spaceMenu = useSpaceCardMenu({ onAfterChange: fetchSpaces, onSetCover: setCover });

  useEffect(() => {
    fetchSpaces().then(() => setArmed(true));
  }, [fetchSpaces]);

  const pinned = useMemo(() => spaces.filter((s) => s.isPinned), [spaces]);
  const rest = useMemo(() => spaces.filter((s) => !s.isPinned), [spaces]);

  return (
    <main ref={scrollRef} className="home-main">
      <div ref={contentRef} className="home-content">
        <div className="home-view-topbar">
          {spaces.length > 0 && <ViewModeToggle value={view} onChange={setView} />}
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
              <SpaceGrid spaces={pinned} onOpen={onOpenSpace} onSetCover={setCover} onMenu={spaceMenu.openMenu} armed={armed} view={view} />
            </section>
            {rest.length > 0 && (
              <section className="notes-month-group notes-rest">
                <SpaceGrid spaces={rest} onOpen={onOpenSpace} onSetCover={setCover} onMenu={spaceMenu.openMenu} armed={armed} view={view} />
              </section>
            )}
          </>
        ) : (
          <SpaceGrid spaces={rest} onOpen={onOpenSpace} onSetCover={setCover} onMenu={spaceMenu.openMenu} armed={armed} view={view} />
        )}
      </div>

      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} />
      <CreateFolderModal isOpen={showCreate} onClose={() => setShowCreate(false)} onFolderCreated={fetchSpaces} />
      {spaceMenu.element}
    </main>
  );
};

export default SpacesView;

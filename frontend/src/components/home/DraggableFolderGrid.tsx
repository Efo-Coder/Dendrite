import { useRef } from 'react';
import { Folder } from '../../types';
import { useGridReorder } from './useGridReorder';
import { useLeaving } from '../../hooks/useLeaving';
import CoverCard from './CoverCard';

interface DraggableFolderGridProps {
  folders: Folder[];
  onOpen: (folder: Folder) => void;
  onMenu: (e: React.MouseEvent, folder: Folder) => void;
  onSetCover: (folder: Folder) => void;
  // Omit to render a plain (non-draggable) grid.
  onReorder?: (folders: Folder[]) => void;
  // Set true once the view's first network load has landed (gates the mount FLIP).
  armed?: boolean;
}

const NOOP = () => {};

// Flat cover-card grid of folders. With onReorder set, cards reorder via 2D
// pointer-drag + FLIP (useGridReorder) and the caller persists the new order.
const DraggableFolderGrid = ({ folders, onOpen, onMenu, onSetCover, onReorder, armed }: DraggableFolderGridProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggable = !!onReorder;
  const { order, draggingId, onCardPointerDown } = useGridReorder({
    items: folders,
    getId: (f) => f.id,
    containerRef,
    onReorder: onReorder ?? NOOP,
    armed,
  });
  const list = draggable ? order : folders;
  const rendered = useLeaving(list, (f) => f.id);

  return (
    <div ref={containerRef} className="home-card-grid">
      {rendered.map(({ item: folder, leaving }, i) => (
        <CoverCard
          key={folder.id}
          index={i}
          leaving={leaving}
          flipId={folder.id}
          dragging={draggingId === folder.id}
          onPointerDown={draggable && !leaving ? (e) => onCardPointerDown(e, folder) : undefined}
          title={folder.name}
          subtitle={`${(folder.children?.length ?? 0) + (folder.notes?.length ?? 0)} inside`}
          cover={folder.coverImage}
          seed={folder.id}
          onClick={() => onOpen(folder)}
          onSetCover={() => onSetCover(folder)}
          onContextMenu={(e) => onMenu(e, folder)}
        />
      ))}
    </div>
  );
};

export default DraggableFolderGrid;

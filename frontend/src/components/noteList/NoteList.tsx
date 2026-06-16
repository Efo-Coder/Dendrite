import { Note } from '../../types';
import { Plus, Trash2 } from 'lucide-react';
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNoteStore } from '../../store/useNoteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToast } from '../ui/ToastContainer';
import NoteContextMenu from './NoteContextMenu';
import MoveToFolderModal from '../modals/MoveToFolderModal';
import TagSelectionModal from '../modals/TagSelectionModal';
import NoteListItem, { type ExitRect } from './NoteItem';
import NoteListHeader from './NoteListHeader';
import { getFirstLine, groupKeyOf, type SortOption } from './noteListUtils';
import { useNoteDrag } from './useNoteDrag';
import { usePresenceList, type PresenceItem } from './usePresenceList';

export type { SortOption };

interface NoteListProps {
  notes: Note[];
  currentNote: Note | null;
  onSelectNote: (note: Note | null) => void;
  onNotesReordered?: () => void;
  viewLabel?: string;
  contextType: string;
  contextId?: string;
  isTrash?: boolean;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: SortOption, sortOrder: 'asc' | 'desc') => void;
  onCreateNote?: () => void;
  isCreating?: boolean;
  justCreatedNoteIds?: string[];
  onEmptyTrash?: () => void;
  focusSearchTrigger?: number;
}

const NoteList = ({
  notes, currentNote, onSelectNote, onNotesReordered,
  viewLabel, contextType, contextId, isTrash,
  sortBy, sortOrder, onSortChange,
  onCreateNote, isCreating, justCreatedNoteIds, onEmptyTrash, focusSearchTrigger,
}: NoteListProps) => {

  // ── Hooks ──────────────────────────────────────────────────────────────────

  // Targeted selectors instead of subscribing to the whole store: isLoading
  // flips from fetches must not re-render the list mid-animation
  const { updateNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, deleteNote, noteCounts } = useNoteStore(
    useShallow((s) => ({
      updateNote: s.updateNote, togglePin: s.togglePin, toggleFavorite: s.toggleFavorite,
      toggleArchive: s.toggleArchive, toggleTrash: s.toggleTrash, deleteNote: s.deleteNote,
      noteCounts: s.noteCounts,
    })),
  );
  const dateDisplayMode = useSettingsStore((s) => s.dateDisplayMode);
  const toast = useToast();

  // ── State ──────────────────────────────────────────────────────────────────

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    note: Note | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, note: null });

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────

  // Stable reference for use inside async callbacks (drag persisting)
  const localNotesRef = useRef<Note[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  // FLIP data for the pop exit: positions of all cards/labels from the last
  // commit (relative to the scroll container, its offsetParent)
  const flipRectsRef = useRef<Map<string, ExitRect>>(new Map());
  const prevExitingIdsRef = useRef<Set<string>>(new Set());

  const { dragNotes, dragNoteId, dragStateRef, handleCardPointerDown } = useNoteDrag({
    notes, localNotesRef, flipRectsRef, contextType, contextId, sortOrder, onSortChange, onNotesReordered,
  });

  // ── Derived values ─────────────────────────────────────────────────────────

  const displayNotes = useMemo(() => {
    if (isTrash) {
      return notes.filter(n => n.isDeleted);
    }
    // Drop optimistically trashed notes immediately so their exit starts right away
    return notes.filter(n => !n.isDeleted);
  }, [notes, isTrash]);

  // Sorted/reordered notes — computed synchronously so renders never see stale data.
  // During drag, dragNotes holds the live reorder snapshot; otherwise derived from displayNotes.
  const localNotes = useMemo(() => {
    if (dragNotes) return dragNotes;
    let sorted: Note[];
    if (sortBy === 'manual') {
      sorted = displayNotes;
    } else {
      sorted = [...displayNotes].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        let cmp = 0;
        switch (sortBy) {
          case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
          case 'updatedAt': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
          case 'title': {
            const aT = a.title || getFirstLine(a.content);
            const bT = b.title || getFirstLine(b.content);
            cmp = aT.localeCompare(bT);
            break;
          }
          case 'pinned': cmp = a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1; break;
        }
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }
    if (justCreatedNoteIds?.length) {
      const idSet = new Set(justCreatedNoteIds);
      const pinned = sorted.filter(n => n.isPinned);
      const created = sorted.filter(n => !n.isPinned && idSet.has(n.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const rest = sorted.filter(n => !n.isPinned && !idSet.has(n.id));
      sorted = [...pinned, ...created, ...rest];
    }
    return sorted;
  }, [dragNotes, displayNotes, sortBy, sortOrder, justCreatedNoteIds]);

  // Exiting notes stay in the list for the duration of their CSS exit transition;
  // a category switch resets without exit choreography
  const presence = usePresenceList(localNotes, contextType + (contextId ?? ''));

  // Group into pinned + month buckets for the reorder view (built from the
  // presence list so exiting cards keep their position)
  const groups = useMemo(() => {
    const pinned = presence.filter(it => it.note.isPinned);
    const rest   = presence.filter(it => !it.note.isPinned);
    const monthMap = new Map<string, PresenceItem[]>();
    rest.forEach(it => {
      const key = groupKeyOf(it.note);
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(it);
    });
    const result: { label: string; items: PresenceItem[] }[] = [];
    if (pinned.length) result.push({ label: 'PINNED', items: pinned });
    monthMap.forEach((items, label) => result.push({ label, items }));
    return result;
  }, [presence]);

  // Count shown in the header — uses pre-computed store totals for global views
  const displayCount =
    contextType === 'all'       ? noteCounts.all :
    contextType === 'favorites' ? noteCounts.favorites :
    contextType === 'archive'   ? noteCounts.archive :
    contextType === 'trash'     ? noteCounts.trash :
    localNotes.length;

  // ── Effects ────────────────────────────────────────────────────────────────

  // Keep ref in sync for use inside async callbacks
  useEffect(() => { localNotesRef.current = localNotes; }, [localNotes]);

  // FLIP for pop exit and drag preview: when elements change their layout
  // position (card deleted or order changed while dragging), they glide back
  // from their old offset to 0 via a compositor transform. Positions are
  // captured on every commit (the "before" snapshot).
  const prevDragIdRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    const container = scrollRef.current;
    const prevExiting = prevExitingIdsRef.current;
    const currentExiting = new Set(presence.filter(it => it.exiting).map(it => it.note.id));
    prevExitingIdsRef.current = currentExiting;
    const dragActive = dragNoteId !== null || prevDragIdRef.current !== null;
    prevDragIdRef.current = dragNoteId;
    if (!container) {
      flipRectsRef.current = new Map();
      return;
    }
    const els = Array.from(container.querySelectorAll<HTMLElement>('[data-flip-id]'));
    const hasNewExit = [...currentExiting].some(id => !prevExiting.has(id));
    if ((hasNewExit || dragActive) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => {
        const id = el.dataset.flipId!;
        const st = dragStateRef.current;
        if (st && id === st.id) {
          // Card hangs on the cursor — compensate the layout jump instead of animating
          el.style.transform = `translateY(${st.startTop + st.lastDy - el.offsetTop}px)`;
          return;
        }
        if (currentExiting.has(id)) return;
        const old = flipRectsRef.current.get(id);
        if (old == null) return;
        const delta = old.top - el.offsetTop;
        if (Math.abs(delta) < 0.5) return;
        el.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
          { duration: 280, easing: 'cubic-bezier(.3,1.25,.35,1)' },
        );
      });
    }
    const next = new Map<string, ExitRect>();
    els.forEach(el => next.set(el.dataset.flipId!, { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight }));
    flipRectsRef.current = next;
  });

  // ── Context menu handlers ──────────────────────────────────────────────────

  const handleNoteRightClick = useCallback((e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, note });
  }, []);

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false, position: { x: 0, y: 0 } }));
  };

  const handleEdit = () => {
    if (contextMenu.note) onSelectNote(contextMenu.note);
  };

  const handleMove = () => setShowMoveModal(true);
  const handleTag  = () => setShowTagModal(true);

  // ── Note action handlers ───────────────────────────────────────────────────

  const handleMoveToFolder = async (folderId: string | null) => {
    if (!contextMenu.note) return;
    try {
      await updateNote(contextMenu.note.id, { folderId });
      toast.success('Note moved');
      onNotesReordered?.();
    } catch { toast.error('Error moving note'); }
  };

  const handlePin = async () => {
    if (!contextMenu.note) return;
    try {
      await togglePin(contextMenu.note.id);
      toast.success(contextMenu.note.isPinned ? 'Unpinned' : 'Note pinned');
      onNotesReordered?.();
    } catch { toast.error('Error pinning note'); }
  };

  const handleFavorite = async () => {
    if (!contextMenu.note) return;
    try {
      await toggleFavorite(contextMenu.note.id);
      toast.success(contextMenu.note.isFavorite ? 'Removed from favorites' : 'Added to favorites');
      onNotesReordered?.();
    } catch { toast.error('Error updating favorites'); }
  };

  const handleArchive = async () => {
    if (!contextMenu.note) return;
    try {
      await toggleArchive(contextMenu.note.id);
      toast.success(contextMenu.note.isArchived ? 'Unarchived' : 'Note archived');
      onNotesReordered?.();
    } catch { toast.error('Error archiving note'); }
  };

  const handleUpdateTags = async (tagIds: string[]) => {
    if (!contextMenu.note) return;
    try {
      await updateNote(contextMenu.note.id, { tags: tagIds });
      toast.success('Tags updated');
      onNotesReordered?.();
    } catch { toast.error('Error updating tags'); }
  };

  const handleDelete = async () => {
    if (!contextMenu.note) return;
    const isCurrentNote = currentNote?.id === contextMenu.note.id;
    try {
      if (contextMenu.note.isDeleted) {
        await deleteNote(contextMenu.note.id);
        toast.success('Note permanently deleted');
      } else {
        await toggleTrash(contextMenu.note.id);
        toast.success('Note deleted');
      }
      if (isCurrentNote) onSelectNote(null);
      onNotesReordered?.();
    } catch { toast.error('Error deleting note'); }
  };

  const handleRestore = async () => {
    if (!contextMenu.note) return;
    try {
      await toggleTrash(contextMenu.note.id);
      toast.success('Note restored');
      onNotesReordered?.();
    } catch { toast.error('Error restoring note'); }
  };

  // ── JSX fragments ──────────────────────────────────────────────────────────

  const header = (
    <NoteListHeader
      viewLabel={viewLabel}
      count={displayCount}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      onSearchCleared={onNotesReordered}
      focusSearchTrigger={focusSearchTrigger}
    />
  );

  const sharedModals = (
    <>
      <NoteContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onEdit={handleEdit}
        onMove={handleMove}
        onPin={handlePin}
        onFavorite={handleFavorite}
        onArchive={handleArchive}
        onTag={handleTag}
        onDelete={handleDelete}
        onRestore={handleRestore}
        note={contextMenu.note || { isPinned: false, isFavorite: false, isArchived: false, isDeleted: false }}
      />
      <MoveToFolderModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleMoveToFolder}
        currentFolderId={contextMenu.note?.folderId}
      />
      <TagSelectionModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onUpdateTags={handleUpdateTags}
        currentTagIds={contextMenu.note?.tags?.map(t => t.id) || []}
      />
    </>
  );

  const emptyTrashFooter = onEmptyTrash ? (
    <div className="notelist-footer">
      <button type="button" onClick={onEmptyTrash} disabled={notes.length === 0} className="notelist-trash-btn">
        <Trash2 style={{ width: 13, height: 13, flexShrink: 0 }} />
        Empty Trash
      </button>
    </div>
  ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  // Keep rendering the list while exits are still running (e.g. last note deleted)
  if (displayNotes.length === 0 && !presence.some(it => it.exiting)) {
    return (
      <>
        {header}
        <div className="notelist-empty">
          <p>{isTrash ? 'Trash is empty' : 'No notes'}</p>
        </div>
        {onCreateNote && (
          <div className="notelist-footer">
            <button type="button" onClick={onCreateNote} disabled={isCreating} className="btn primary notelist-new-btn">
              <Plus style={{ width: 14, height: 14, flexShrink: 0 }} />
              {isCreating ? 'Creating…' : 'New Note'}
            </button>
          </div>
        )}
        {isTrash && onEmptyTrash && emptyTrashFooter}
        {sharedModals}
      </>
    );
  }

  if (isTrash) {
    let trashIndex = 0;
    return (
      <>
        {header}
        <div key="trash" ref={scrollRef} className="notelist-scroll" style={{ position: 'relative' }}>
          <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
            {presence.map((it) => {
              const stagger = Math.min(trashIndex++, 8) * 28;
              return (
                <NoteListItem
                  key={it.note.id}
                  note={it.note}
                  exiting={it.exiting}
                  exitRect={it.exiting ? flipRectsRef.current.get(it.note.id) ?? null : null}
                  stagger={stagger}
                  isSelected={currentNote?.id === it.note.id}
                  onSelectNote={onSelectNote}
                  showDragHandle={false}
                  dateDisplayMode={dateDisplayMode}
                  onRightClick={handleNoteRightClick}
                />
              );
            })}
          </ul>
        </div>
        {onEmptyTrash && emptyTrashFooter}
        {sharedModals}
      </>
    );
  }

  let renderIndex = 0;

  return (
    <>
      {header}
      <div key={contextType + (contextId ?? '')} ref={scrollRef} className="notelist-scroll" style={{ position: 'relative' }}>
          {groups.map((group) => (
            <Fragment key={group.label}>
              <div className="notelist-group-label" data-flip-id={`label:${group.label}`}>{group.label}</div>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
                {group.items.map((it) => {
                  const stagger = Math.min(renderIndex++, 8) * 28;
                  return (
                    <NoteListItem
                      key={it.note.id}
                      note={it.note}
                      exiting={it.exiting}
                      exitRect={it.exiting ? flipRectsRef.current.get(it.note.id) ?? null : null}
                      stagger={stagger}
                      isSelected={currentNote?.id === it.note.id}
                      onSelectNote={onSelectNote}
                      showDragHandle={!isTrash}
                      dateDisplayMode={dateDisplayMode}
                      onRightClick={handleNoteRightClick}
                      isDragSource={dragNoteId === it.note.id}
                      onCardPointerDown={handleCardPointerDown}
                    />
                  );
                })}
              </ul>
            </Fragment>
          ))}
        </div>
      {onCreateNote && (
        <div className="notelist-footer">
          <button type="button" onClick={onCreateNote} disabled={isCreating} className="btn primary notelist-new-btn">
            <Plus style={{ width: 14, height: 14, flexShrink: 0 }} />
            {isCreating ? 'Creating…' : 'New Note'}
          </button>
        </div>
      )}
      {sharedModals}
    </>
  );
};

export default NoteList;

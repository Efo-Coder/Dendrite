import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNoteStore } from '../store/useNoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/ui/ToastContainer';
import Sidebar from '../components/sidebar/Sidebar';
import NoteList, { type SortOption } from '../components/noteList/NoteList';
import NoteEditor from '../components/editor/NoteEditor';
import { FileText } from 'lucide-react';
import EmptyTrashModal from '../components/modals/EmptyTrashModal';
import clsx from 'clsx';
import { ViewType } from '../types';

type NoteFilters = {
  archived?: boolean;
  deleted?: boolean;
  favorite?: boolean;
  folderId?: string;
  tagId?: string;
};

function buildFilters(view: ViewType, folderId?: string, tagId?: string): NoteFilters {
  switch (view) {
    case 'all':       return { archived: false, deleted: false };
    case 'favorites': return { favorite: true, archived: false, deleted: false };
    case 'archive':   return { archived: true, deleted: false };
    case 'trash':     return { deleted: true };
    case 'folder':    return { folderId, archived: false, deleted: false };
    case 'tag':       return { tagId, archived: false, deleted: false };
  }
}

const DashboardPage = () => {
  const { notes, fetchNotes, createNote, currentNote, setCurrentNote, deleteNote } = useNoteStore();
  const { user } = useAuthStore();
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);

  // View State
  const [currentView, setCurrentView] = useState<ViewType>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>();
  const [selectedTagId, setSelectedTagId] = useState<string>();

  const listSortContextKey = useMemo(() => {
    const contextType =
      currentView === 'folder' ? 'folder' :
      currentView === 'tag' ? 'tag' :
      currentView === 'favorites' ? 'favorites' :
      currentView === 'archive' ? 'archive' :
      currentView === 'trash' ? 'trash' :
      'all';
    const contextId =
      currentView === 'folder' ? selectedFolderId :
      currentView === 'tag' ? selectedTagId :
      undefined;
    return `${contextType}-${contextId || '_none'}`;
  }, [currentView, selectedFolderId, selectedTagId]);

  const [contextSortStates, setContextSortStates] = useState<
    Record<string, { sortBy: SortOption; sortOrder: 'asc' | 'desc' }>
  >(() => {
    try {
      const saved = localStorage.getItem('dendrite-sort-states');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem('dendrite-sort-states');
      const states = saved ? JSON.parse(saved) : {};
      return states['all-_none']?.sortBy ?? 'createdAt';
    } catch { return 'createdAt'; }
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    try {
      const saved = localStorage.getItem('dendrite-sort-states');
      const states = saved ? JSON.parse(saved) : {};
      return states['all-_none']?.sortOrder ?? 'desc';
    } catch { return 'desc'; }
  });

  useEffect(() => {
    const saved = contextSortStates[listSortContextKey];
    if (saved) {
      setSortBy(saved.sortBy);
      setSortOrder(saved.sortOrder);
    } else {
      setSortBy('createdAt');
      setSortOrder('desc');
    }
  }, [listSortContextKey]);

  const handleSortChange = useCallback(
    (by: SortOption, order: 'asc' | 'desc') => {
      setSortBy(by);
      setSortOrder(order);
      setContextSortStates((prev) => {
        const next = { ...prev, [listSortContextKey]: { sortBy: by, sortOrder: order } };
        try { localStorage.setItem('dendrite-sort-states', JSON.stringify(next)); } catch {}
        return next;
      });
    },
    [listSortContextKey]
  );

  // Animation State
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    fetchNotes({ archived: false, deleted: false });
  }, []);

  const refreshCurrentView = () => {
    fetchNotes(buildFilters(currentView, selectedFolderId, selectedTagId));
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewChange = (view: ViewType, id?: string) => {
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentView(view);
      setCurrentNote(null);

      if (view === 'folder') {
        setSelectedFolderId(id);
        setSelectedTagId(undefined);
      } else if (view === 'tag') {
        setSelectedTagId(id);
        setSelectedFolderId(undefined);
      } else {
        setSelectedFolderId(undefined);
        setSelectedTagId(undefined);
      }

      fetchNotes(buildFilters(view, view === 'folder' ? id : undefined, view === 'tag' ? id : undefined));

      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  };

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      const newNote = await createNote({
        content: '',
        folderId: currentView === 'folder' ? selectedFolderId : undefined,
        tags: currentView === 'tag' && selectedTagId ? [selectedTagId] : undefined,
      });
      setCurrentNote(newNote);
      refreshCurrentView();
      toast.success('Notiz erstellt');
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error creating note:', error);
      toast.error(error.response?.data?.error || 'Notiz konnte nicht erstellt werden');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const trashedNotes = notes.filter(n => n.isDeleted);
      if (trashedNotes.length === 0) {
        setShowEmptyTrashModal(false);
        return;
      }
      await Promise.all(trashedNotes.map(n => deleteNote(n.id)));
      await fetchNotes({ deleted: true });
      toast.success('Papierkorb geleert');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Papierkorb konnte nicht geleert werden');
    } finally {
      setShowEmptyTrashModal(false);
      setRefreshTrigger(prev => prev + 1);
    }
  };


  return (
    <motion.div
      className="flex h-dvh min-h-0 flex-col overflow-hidden p-3 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18, ease: 'easeInOut' } }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
      <div
        className="flex min-h-0 flex-1 w-full flex-row items-stretch overflow-hidden rounded-[1.25rem] border border-divider shadow-[0_24px_64px_color-mix(in_srgb,#000_32%,transparent)]"
        style={{
          background: 'color-mix(in srgb, var(--color-bg-secondary) 82%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          selectedFolderId={selectedFolderId}
          selectedTagId={selectedTagId}
          refreshTrigger={refreshTrigger}
          onTagUpdated={refreshCurrentView}
          user={user}
        />

        <div className="flex min-h-0 min-w-0 flex-1">
          <div className="flex w-[min(100%,380px)] sm:w-96 shrink-0 flex-col border-r border-divider min-h-0">
            <div
              className={clsx(
                'flex-1 flex flex-col overflow-hidden min-h-0 transition-opacity duration-300',
                isTransitioning ? 'opacity-0' : 'opacity-100'
              )}
            >
              <NoteList
                notes={notes}

                currentNote={currentNote}
                onSelectNote={setCurrentNote}
                onNotesReordered={refreshCurrentView}
                contextType={
                  currentView === 'folder' ? 'folder' :
                  currentView === 'tag' ? 'tag' :
                  currentView === 'favorites' ? 'favorites' :
                  currentView === 'archive' ? 'archive' :
                  'all'
                }
                contextId={
                  currentView === 'folder' ? selectedFolderId :
                  currentView === 'tag' ? selectedTagId :
                  undefined
                }
                isTrash={currentView === 'trash'}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                onCreateNote={
                  (currentView === 'all' || currentView === 'folder' || currentView === 'tag')
                    ? handleCreateNote
                    : undefined
                }
                isCreating={isCreating}
                onEmptyTrash={currentView === 'trash' ? () => setShowEmptyTrashModal(true) : undefined}
              />
            </div>
          </div>

          <div className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col bg-[color-mix(in_srgb,var(--color-bg-primary)_18%,transparent)]">
            {currentNote ? (
              <NoteEditor
                note={currentNote}
                onNoteUpdate={refreshCurrentView}
              />
            ) : (
              <div className="flex h-full flex-1 items-center justify-center select-none">
                <div className="flex flex-col items-center gap-5">
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-3xl blur-2xl opacity-30 pointer-events-none"
                      style={{ background: 'color-mix(in srgb, var(--color-brand-primary) 60%, transparent)' }}
                    />
                    <div
                      className="relative flex h-20 w-20 items-center justify-center rounded-3xl glass-border"
                      style={{ background: 'color-mix(in srgb, var(--color-brand-primary) 8%, transparent)' }}
                    >
                      <FileText className="h-9 w-9 text-text-muted" />
                    </div>
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-medium text-text-secondary">Keine Notiz geöffnet</p>
                    <p className="text-xs text-text-muted">Wähle eine Notiz aus der Liste oder erstelle eine neue</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <EmptyTrashModal
        isOpen={showEmptyTrashModal}
        onClose={() => setShowEmptyTrashModal(false)}
        onConfirm={handleEmptyTrash}
      />
    </motion.div>
  );
};

export default DashboardPage;

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { BetaBadge } from '../components/ui/BetaBadge';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import SplitText from '../components/ui/SplitText';
import { useNoteStore } from '../store/useNoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFolderStore } from '../store/useFolderStore';
import { useTagStore } from '../store/useTagStore';
import { useToast } from '../components/ui/ToastContainer';
import Sidebar from '../components/sidebar/Sidebar';
import NoteList, { type SortOption } from '../components/noteList/NoteList';
import NoteEditor from '../components/editor/NoteEditor';
import EmptyTrashModal from '../components/modals/EmptyTrashModal';
import SettingsModal from '../components/modals/SettingsModal';
import UserProfileModal from '../components/modals/UserProfileModal';
import { User } from 'lucide-react';
import DarkModeToggle from '../components/sidebar/DarkModeToggle';
import { Icons } from '../components/ui/Icons';
import { LOGO_SRC } from '../config/brand';
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
  const { notes, fetchNotes, createNote, currentNote, setCurrentNote, deleteNote, togglePin } = useNoteStore();
  const { user } = useAuthStore();
  const { folders } = useFolderStore();
  const { tags } = useTagStore();
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [showGreeting, setShowGreeting] = useState(() => !!sessionStorage.getItem('justLoggedIn'));
  const hadGreeting = useRef(!!sessionStorage.getItem('justLoggedIn'));
  const greetingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sessionStorage.removeItem('justLoggedIn');
  }, []);

  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0];
  const greetingText = (() => {
    const hour = new Date().getHours();
    const salutation =
      hour >= 5 && hour < 12 ? 'Good morning' :
      hour >= 12 && hour < 18 ? 'Hey' :
      hour >= 18 && hour < 22 ? 'Good evening' :
      'Good night';
    return firstName ? `${salutation}, ${firstName}!` : `${salutation}!`;
  })();

  const handleGreetingComplete = () => {
    greetingTimer.current = setTimeout(() => setShowGreeting(false), 900);
  };

  useEffect(() => () => {
    if (greetingTimer.current) clearTimeout(greetingTimer.current);
  }, []);

  const [currentView, setCurrentView] = useState<ViewType>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>();
  const [selectedTagId, setSelectedTagId] = useState<string>();

  const viewLabel = useMemo(() => {
    switch (currentView) {
      case 'all':       return 'All Notes';
      case 'favorites': return 'Favorites';
      case 'archive':   return 'Archive';
      case 'trash':     return 'Trash';
      case 'folder':    return folders.find(f => f.id === selectedFolderId)?.name || 'Folder';
      case 'tag':       return tags.find(t => t.id === selectedTagId)?.name || 'Tag';
    }
  }, [currentView, selectedFolderId, selectedTagId, folders, tags]);

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
    } catch { return {}; }
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

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusSearchTrigger, setFocusSearchTrigger] = useState(0);

  useEffect(() => {
    fetchNotes({ archived: false, deleted: false });
  }, []);

  const refreshCurrentView = () => {
    fetchNotes(buildFilters(currentView, selectedFolderId, selectedTagId));
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewChange = (view: ViewType, id?: string) => {
    setIsTransitioning(true);
    setTimeout(async () => {
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
      await fetchNotes(buildFilters(view, view === 'folder' ? id : undefined, view === 'tag' ? id : undefined));
      setIsTransitioning(false);
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
      toast.success('Note created');
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error creating note:', error);
      toast.error(error.response?.data?.error || 'Could not create note');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const trashedNotes = notes.filter(n => n.isDeleted);
      if (trashedNotes.length === 0) { setShowEmptyTrashModal(false); return; }
      await Promise.all(trashedNotes.map(n => deleteNote(n.id)));
      await fetchNotes({ deleted: true });
      toast.success('Trash emptied');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Could not empty trash');
    } finally {
      setShowEmptyTrashModal(false);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  useKeyboardShortcuts({
    onNewNote: useCallback(() => {
      if (currentView === 'all' || currentView === 'folder' || currentView === 'tag') {
        handleCreateNote();
      }
    }, [currentView, handleCreateNote]),
    onToggleSidebar: useCallback(() => setSidebarCollapsed(v => !v), []),
    onOpenSettings: useCallback(() => setShowSettingsModal(true), []),
    onPinNote: useCallback(() => { if (currentNote) togglePin(currentNote.id); }, [currentNote, togglePin]),
    onFocusSearch: useCallback(() => setFocusSearchTrigger(v => v + 1), []),
  });

  return (
    <motion.div
      className="app-stage"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18, ease: 'easeInOut' } }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
      <div className="win">
        {/* macOS window titlebar */}
        <div className="app-titlebar">
          <div className="titlebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src={LOGO_SRC} alt="Dendrite" className="brand-glyph" />
            <BetaBadge />
          </div>
          <div className="app-titlebar-title" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
              {showGreeting ? (
                <motion.span
                  key="greeting"
                  style={{ display: 'flex', alignItems: 'center', lineHeight: '1', fontFamily: 'var(--serif-display)', fontStyle: 'italic', fontSize: '22px', fontWeight: 500, color: 'var(--ink)' }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
                >
                  <SplitText
                    text={greetingText}
                    tag="span"
                    splitType="chars"
                    delay={40}
                    duration={0.5}
                    ease="power3.out"
                    from={{ opacity: 0, y: 14 }}
                    to={{ opacity: 1, y: 0 }}
                    threshold={0}
                    rootMargin="0px"
                    textAlign="center"
                    onLetterAnimationComplete={handleGreetingComplete}
                  />
                </motion.span>
              ) : (
                <motion.span
                  key="title"
                  style={{ display: 'inline-block' }}
                  initial={hadGreeting.current ? { opacity: 0, y: 8 } : false}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] } }}
                >
                  Dendrite <span className="brand-mark">·</span> a notebook
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="app-titlebar-actions" style={{ gap: 12 }}>
            <AnimatePresence>
              {sidebarCollapsed && (
                <motion.button
                  key="profile-btn"
                  type="button"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="icon-btn-auth fill-slide rounded-full w-7 h-7 flex items-center justify-center"
                  onClick={() => setShowProfileModal(true)}
                  title="Profile"
                >
                  <User size={13} />
                </motion.button>
              )}
            </AnimatePresence>
            <DarkModeToggle className="icon-btn-auth fill-slide rounded-full w-7 h-7 flex items-center justify-center" />
            <button
              type="button"
              className="icon-btn-auth fill-slide rounded-full w-7 h-7 flex items-center justify-center"
              onClick={() => setShowSettingsModal(true)}
              title="Settings"
            >
              <Icons.settings size={13} />
            </button>
          </div>
        </div>

        {/* Three-column layout */}
        <div className="app-row">
          <Sidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            selectedFolderId={selectedFolderId}
            selectedTagId={selectedTagId}
            refreshTrigger={refreshTrigger}
            onTagUpdated={refreshCurrentView}
            user={user}
            collapsed={sidebarCollapsed}
          />

          {/* Notes panel */}
          <div
            className={clsx('notelist-panel', 'transition-opacity duration-300')}
            style={{ opacity: isTransitioning ? 0 : 1 }}
          >
            <NoteList
              notes={notes}
              currentNote={currentNote}
              onSelectNote={setCurrentNote}
              onNotesReordered={refreshCurrentView}
              viewLabel={viewLabel}
              contextType={
                currentView === 'folder' ? 'folder' :
                currentView === 'tag' ? 'tag' :
                currentView === 'favorites' ? 'favorites' :
                currentView === 'archive' ? 'archive' :
                currentView === 'trash' ? 'trash' :
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
              focusSearchTrigger={focusSearchTrigger}
            />
          </div>

          {/* Editor panel */}
          <div className="editor-panel">
            <AnimatePresence mode="wait">
              {currentNote ? (
                <motion.div
                  key={currentNote.id}
                  className="h-full flex flex-col"
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  <NoteEditor
                    note={currentNote}
                    onNoteUpdate={refreshCurrentView}
                    onToggleSidebar={() => setSidebarCollapsed(v => !v)}
                    sidebarCollapsed={sidebarCollapsed}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="editor-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                >
                  <div className="glyph">❦</div>
                  <h3>Select a note</h3>
                  <p>Open a note from the list or create a new one.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <EmptyTrashModal
        isOpen={showEmptyTrashModal}
        onClose={() => setShowEmptyTrashModal(false)}
        onConfirm={handleEmptyTrash}
      />
    </motion.div>
  );
};

export default DashboardPage;

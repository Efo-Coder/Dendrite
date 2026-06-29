import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useNoteStore } from '../store/useNoteStore';
import { useUpgradeModal } from '../store/useUpgradeModal';
import { noteService } from '../services/note.service';
import { Note } from '../types';
import { PAGE_FADE } from '../lib/pageMotion';
import { loadNav, saveNav, markNavigated } from '../lib/viewState';
import { RenameProvider } from '../components/home/RenameContext';
import AppSidebar from '../components/sidebar/AppSidebar';
import EditorOverlay from './EditorOverlay';
import HomeView from './HomeView';
import SpacesView from './SpacesView';
import LibraryView from './LibraryView';
import ReflectionView from './ReflectionView';
import ContainerView from './ContainerView';
import NotesView, { type NoteCategory } from './NotesView';
import { Folder } from '../types';
import ExploreView from './ExploreView';
import ProfileView from './ProfileView';
import UpgradePlansModal from '../components/modals/UpgradePlansModal';

// The constellations view pulls in three/R3F; load it only when opened so the
// heavy WebGL bundle never weighs down the rest of the app.
const ConstellationsView = lazy(() => import('./ConstellationsView'));

// The editor is not a view here — it renders as an overlay above the current view
// (so closing it reveals exactly where you were, scroll and all).
type AppView = 'home' | 'spaces' | 'library' | 'reflection' | 'notes' | 'container' | 'constellations' | 'explore' | 'profile';

interface ContainerRef {
  kind: 'space' | 'folder';
  id: string;
  name: string;
}

// Shell for authenticated users: the calm Home dashboard with its Spaces, category,
// folder and inline-editor views, switched via AppSidebar and card clicks.
const DashboardPage = () => {
  const user = useAuthStore((s) => s.user);
  const upgradeOpen = useUpgradeModal((s) => s.isOpen);
  const closeUpgrade = useUpgradeModal((s) => s.close);
  const currentNote = useNoteStore((s) => s.currentNote);
  const setCurrentNote = useNoteStore((s) => s.setCurrentNote);
  // Restore the last view/drill-path/open-note from the previous page load.
  const [persisted] = useState(loadNav);
  const [appView, setAppView] = useState<AppView>((persisted?.appView as AppView) ?? 'home');
  // Only the inline editor may hide the Home sidebar; reset whenever it opens.
  const [editorSidebarCollapsed, setEditorSidebarCollapsed] = useState(false);
  // The note shown in the editor overlay; origin is the rect it grows from, and
  // editorClosing drives the shrink-back morph before it actually unmounts.
  const [editorNote, setEditorNote] = useState<Note | null>(null);
  const [editorOrigin, setEditorOrigin] = useState<DOMRect | null>(null);
  const [editorClosing, setEditorClosing] = useState(false);
  // Bumped when the editor closes so the local-list views refetch (a just-created
  // note then appears, and edits reflect).
  const [refreshSignal, setRefreshSignal] = useState(0);
  // Drill-down stack for spaces → folders → subfolders; the last entry is shown.
  const [containerStack, setContainerStack] = useState<ContainerRef[]>(persisted?.stack ?? []);
  // Where the back button returns once the drill-down is fully popped.
  const [containerReturn, setContainerReturn] = useState<AppView>((persisted?.containerReturn as AppView) ?? 'home');
  // The author whose public profile is shown.
  const [profileUserId, setProfileUserId] = useState<string | null>(persisted?.profileUserId ?? null);
  // Where the profile's back button returns to (+ an Explore reader to restore).
  const [profileReturn, setProfileReturn] = useState<{ view: AppView; readerId: string | null }>({
    view: 'explore',
    readerId: null,
  });
  const [exploreInitialReader, setExploreInitialReader] = useState<string | null>(null);

  const appViewRef = useRef(appView);
  useEffect(() => {
    appViewRef.current = appView;
  }, [appView]);

  // Sidebar navigation also dismisses an open editor overlay (it sits above the view).
  const goHome = useCallback(() => { setCurrentNote(null); setAppView('home'); }, [setCurrentNote]);
  const goSpaces = useCallback(() => { setCurrentNote(null); setAppView('spaces'); }, [setCurrentNote]);
  const goLibrary = useCallback(() => { setCurrentNote(null); setAppView('library'); }, [setCurrentNote]);
  const goReflection = useCallback(() => { setCurrentNote(null); setAppView('reflection'); }, [setCurrentNote]);
  const goConstellations = useCallback(() => { setCurrentNote(null); setAppView('constellations'); }, [setCurrentNote]);
  const goExplore = useCallback(() => {
    setCurrentNote(null);
    setExploreInitialReader(null);
    setAppView('explore');
  }, [setCurrentNote]);
  const goProfile = useCallback((id: string, fromReaderId?: string) => {
    setProfileReturn({ view: appViewRef.current, readerId: fromReaderId ?? null });
    setProfileUserId(id);
    setAppView('profile');
  }, []);
  // Back from a profile returns to wherever it was opened from (Explore list,
  // an Explore reader, or Home), restoring the reader when applicable.
  const profileBack = useCallback(() => {
    setExploreInitialReader(profileReturn.readerId);
    setAppView(profileReturn.view);
  }, [profileReturn]);

  // Each Home category opens its own full view (like Spaces).
  const [notesCategory, setNotesCategory] = useState<NoteCategory>((persisted?.category as NoteCategory) ?? 'all');
  const openCategory = useCallback((cat: NoteCategory) => {
    setNotesCategory(cat);
    setAppView('notes');
  }, []);

  // A space card opens that space (its folders + notes); folder cards drill deeper.
  const openSpace = useCallback((id: string, name: string) => {
    setContainerReturn(appViewRef.current === 'spaces' ? 'spaces' : 'home');
    setContainerStack([{ kind: 'space', id, name }]);
    setAppView('container');
  }, []);
  const openFolder = useCallback((folder: Folder) => {
    setContainerStack((prev) => [...prev, { kind: 'folder', id: folder.id, name: folder.name }]);
    setAppView('container');
  }, []);
  // Where back goes: the parent container's name, else the root return (Home/Spaces).
  const containerBackLabel =
    containerStack.length > 1
      ? containerStack[containerStack.length - 2].name
      : containerReturn === 'spaces' ? 'Spaces' : 'Home';
  // Back goes up one level; once the stack holds only the space, leave the drill-down.
  const containerBack = useCallback(() => {
    setContainerStack((prev) => {
      if (prev.length > 1) return prev.slice(0, -1);
      setAppView(containerReturn);
      return prev;
    });
  }, [containerReturn]);

  // The inline editor opens as an overlay above the current view; it grows from the
  // origin rect (the clicked card, found by id, or an explicit rect for new notes).
  const openEditor = useCallback((note: Note, originRect?: DOMRect) => {
    const origin = originRect ?? document.querySelector(`[data-flip-id="${note.id}"]`)?.getBoundingClientRect() ?? null;
    setEditorOrigin(origin);
    setEditorClosing(false);
    setEditorNote(note);
    setCurrentNote(note);
    setEditorSidebarCollapsed(false);
  }, [setCurrentNote]);

  // Cards and constellations hand over a note id — resolve it from the
  // store, or fetch it directly when it isn't in the loaded list.
  const openNote = useCallback((id: string) => {
    const note = useNoteStore.getState().notes.find((n) => n.id === id);
    if (note) {
      openEditor(note);
      return;
    }
    noteService.getNoteById(id).then((n) => openEditor(n)).catch(() => {});
  }, [openEditor]);

  // Keep the overlay's note fresh while open (pin/fav/title edits).
  useEffect(() => {
    if (currentNote) setEditorNote(currentNote);
  }, [currentNote]);

  // Editor closed itself (X / move-to-trash) → play the shrink-back morph.
  useEffect(() => {
    if (!currentNote && editorNote) setEditorClosing(true);
  }, [currentNote, editorNote]);

  const handleEditorClosed = useCallback(() => {
    setEditorNote(null);
    setEditorOrigin(null);
    setEditorClosing(false);
    setRefreshSignal((n) => n + 1);
  }, []);

  // Reopen the note that was open before a reload (no origin → fades in).
  useEffect(() => {
    const id = persisted?.openNoteId;
    if (!id) return;
    noteService.getNoteById(id).then((n) => { setEditorNote(n); setCurrentNote(n); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the nav state for the next reload; the first change away from the
  // initial state counts as an in-app navigation (stops scroll-restoring). The open
  // note isn't part of the signature, so opening/closing it doesn't disable restore.
  const openNoteId = currentNote?.id ?? null;
  const initialSig = useRef<string | null>(null);
  useEffect(() => {
    const sig = JSON.stringify({ appView, category: notesCategory, stack: containerStack, containerReturn, profileUserId });
    saveNav({ appView, category: notesCategory, stack: containerStack, containerReturn, profileUserId, openNoteId });
    if (initialSig.current === null) initialSig.current = sig;
    else if (sig !== initialSig.current) markNavigated();
  }, [appView, notesCategory, containerStack, containerReturn, profileUserId, openNoteId]);

  return (
    <motion.div className="home-stage" {...PAGE_FADE}>
      <RenameProvider>
      <div className="home-shell">
        <AppSidebar
          active={
            appView === 'spaces' || appView === 'container' ? 'spaces'
            : appView === 'library' ? 'library'
            : appView === 'reflection' ? 'reflection'
            : appView === 'constellations' ? 'constellations'
            : appView === 'explore' || appView === 'profile' ? 'explore'
            : 'home'
          }
          collapsed={!!editorNote && editorSidebarCollapsed}
          onHome={goHome}
          onSpaces={goSpaces}
          onLibrary={goLibrary}
          onReflection={goReflection}
          onConstellations={goConstellations}
          onExplore={goExplore}
          user={user}
        />
        <div className="home-page">
          {/* mode="wait" + one shared PAGE_FADE → every switch fades out, then in, identically. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={appView === 'container' ? `container-${containerStack.length}-${containerStack[containerStack.length - 1]?.id}` : appView}
              className="home-page-view"
              {...PAGE_FADE}
            >
              {appView === 'spaces' ? (
                <SpacesView onOpenSpace={openSpace} onBack={goHome} />
              ) : appView === 'library' ? (
                <LibraryView onOpenInline={openEditor} onBack={goHome} refreshSignal={refreshSignal} />
              ) : appView === 'notes' ? (
                <NotesView category={notesCategory} onOpenInline={openEditor} onBack={goHome} refreshSignal={refreshSignal} />
              ) : appView === 'container' && containerStack.length > 0 ? (
                <ContainerView
                  kind={containerStack[containerStack.length - 1].kind}
                  id={containerStack[containerStack.length - 1].id}
                  backLabel={containerBackLabel}
                  onOpenFolder={openFolder}
                  onOpenInline={openEditor}
                  onBack={containerBack}
                  refreshSignal={refreshSignal}
                />
              ) : appView === 'reflection' ? (
                <ReflectionView />
              ) : appView === 'constellations' ? (
                <Suspense fallback={<div className="constellations-stage" />}>
                  <ConstellationsView onBack={goHome} onOpenNote={openNote} />
                </Suspense>
              ) : appView === 'explore' ? (
                <ExploreView
                  onOpenInline={openEditor}
                  onOpenProfile={goProfile}
                  initialReadingId={exploreInitialReader}
                />
              ) : appView === 'profile' && profileUserId ? (
                <ProfileView
                  userId={profileUserId}
                  onOpenInline={openEditor}
                  onOpenProfile={goProfile}
                  onBack={profileBack}
                />
              ) : (
                <HomeView
                  onOpenNote={openNote}
                  onOpenInline={openEditor}
                  onOpenSpace={openSpace}
                  onOpenCategory={openCategory}
                  onAllSpaces={goSpaces}
                  onReflection={goReflection}
                  onOpenProfile={goProfile}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Editor overlays the current view, growing from / shrinking back into the card. */}
          {editorNote && (
            <EditorOverlay
              note={editorNote}
              origin={editorOrigin}
              closing={editorClosing}
              onClosed={handleEditorClosed}
              onToggleSidebar={() => setEditorSidebarCollapsed((v) => !v)}
              sidebarCollapsed={editorSidebarCollapsed}
            />
          )}
        </div>
      </div>

      <UpgradePlansModal
        isOpen={upgradeOpen}
        currentPlan={(user?.plan || 'free').toLowerCase()}
        onClose={closeUpgrade}
      />
      </RenameProvider>
    </motion.div>
  );
};

export default DashboardPage;

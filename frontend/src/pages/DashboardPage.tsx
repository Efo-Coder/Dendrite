import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useNoteStore } from '../store/useNoteStore';
import { noteService } from '../services/note.service';
import { Note } from '../types';
import { PAGE_FADE } from '../lib/pageMotion';
import AppSidebar from '../components/sidebar/AppSidebar';
import NoteEditor from '../components/editor/NoteEditor';
import HomeView from './HomeView';
import SpacesView from './SpacesView';
import ReflectionView from './ReflectionView';
import FolderView from './FolderView';
import NotesView, { type NoteCategory } from './NotesView';
import BrowseView from './BrowseView';

// The constellations view pulls in three/R3F; load it only when opened so the
// heavy WebGL bundle never weighs down the rest of the app.
const ConstellationsView = lazy(() => import('./ConstellationsView'));

type AppView = 'home' | 'spaces' | 'reflection' | 'editor' | 'notes' | 'folder' | 'constellations' | 'browse';

// Shell for authenticated users: the calm Home dashboard with its Spaces, category,
// folder and inline-editor views, switched via AppSidebar and card clicks.
const DashboardPage = () => {
  const user = useAuthStore((s) => s.user);
  const currentNote = useNoteStore((s) => s.currentNote);
  const setCurrentNote = useNoteStore((s) => s.setCurrentNote);
  const [appView, setAppView] = useState<AppView>('home');
  // Only the inline editor may hide the Home sidebar; reset whenever it opens.
  const [editorSidebarCollapsed, setEditorSidebarCollapsed] = useState(false);
  // Editor's note, kept separate from currentNote so it stays mounted through the
  // closing transition (currentNote clears one render before appView switches).
  const [editorNote, setEditorNote] = useState<Note | null>(null);
  // The space whose notes the folder view shows.
  const [folderId, setFolderId] = useState<string | undefined>();

  const goHome = useCallback(() => setAppView('home'), []);
  const goSpaces = useCallback(() => setAppView('spaces'), []);
  const goReflection = useCallback(() => setAppView('reflection'), []);
  const goConstellations = useCallback(() => setAppView('constellations'), []);
  const goBrowse = useCallback(() => setAppView('browse'), []);

  // Each Home category opens its own full view (like Spaces).
  const [notesCategory, setNotesCategory] = useState<NoteCategory>('all');
  const openCategory = useCallback((cat: NoteCategory) => {
    setNotesCategory(cat);
    setAppView('notes');
  }, []);

  // A space card opens that folder's notes in its own view.
  const openSpace = useCallback((id: string) => {
    setFolderId(id);
    setAppView('folder');
  }, []);

  // Inline editor lives inside the Home shell (beside AppSidebar); a created or
  // opened note shows here. currentNote is the single source.
  const openEditor = useCallback((note: Note) => {
    setEditorNote(note);
    setCurrentNote(note);
    setEditorSidebarCollapsed(false);
    setAppView('editor');
  }, [setCurrentNote]);

  // Cards and constellations hand over a note id — resolve it from the
  // store, or fetch it directly when it isn't in the loaded list.
  const openNote = useCallback((id: string) => {
    const note = useNoteStore.getState().notes.find((n) => n.id === id);
    if (note) {
      openEditor(note);
      return;
    }
    noteService.getNoteById(id).then(openEditor).catch(() => {});
  }, [openEditor]);

  // Follow currentNote while open (keeps pin/fav etc. fresh) but never clear it —
  // on close the editor must stay rendered to play its fade-out.
  useEffect(() => {
    if (currentNote) setEditorNote(currentNote);
  }, [currentNote]);

  // The editor closes itself via setCurrentNote(null) (X / move-to-trash);
  // fall back to Home when that happens.
  useEffect(() => {
    if (appView === 'editor' && !currentNote) setAppView('home');
  }, [appView, currentNote]);

  return (
    <motion.div className="home-stage" {...PAGE_FADE}>
      <div className="home-shell">
        <AppSidebar
          active={
            appView === 'spaces' ? 'spaces'
            : appView === 'reflection' ? 'reflection'
            : appView === 'constellations' ? 'constellations'
            : appView === 'browse' ? 'browse'
            : 'home'
          }
          collapsed={appView === 'editor' && editorSidebarCollapsed}
          onHome={goHome}
          onSpaces={goSpaces}
          onThoughts={() => openCategory('all')}
          onReflection={goReflection}
          onConstellations={goConstellations}
          onBrowse={goBrowse}
          user={user}
        />
        {/* mode="wait" + one shared PAGE_FADE → every switch fades out, then in, identically. */}
        <AnimatePresence mode="wait">
          <motion.div key={appView} className="home-page" {...PAGE_FADE}>
            {appView === 'editor' && editorNote ? (
              // Mirror the wrapper the .win-scoped editor panel CSS expects.
              <div className="win">
                <div className="editor-panel">
                  <NoteEditor
                    note={editorNote}
                    onToggleSidebar={() => setEditorSidebarCollapsed((v) => !v)}
                    sidebarCollapsed={editorSidebarCollapsed}
                  />
                </div>
              </div>
            ) : appView === 'spaces' ? (
              <SpacesView onOpenSpace={openSpace} onBack={goHome} />
            ) : appView === 'notes' ? (
              <NotesView category={notesCategory} onOpenInline={openEditor} onBack={goHome} />
            ) : appView === 'folder' && folderId ? (
              <FolderView folderId={folderId} onOpenInline={openEditor} onBack={goHome} />
            ) : appView === 'reflection' ? (
              <ReflectionView />
            ) : appView === 'constellations' ? (
              <Suspense fallback={<div className="constellations-stage" />}>
                <ConstellationsView onBack={goHome} onOpenNote={openNote} />
              </Suspense>
            ) : appView === 'browse' ? (
              <BrowseView onOpenInline={openEditor} />
            ) : (
              <HomeView
                onOpenNote={openNote}
                onOpenInline={openEditor}
                onOpenSpace={openSpace}
                onOpenCategory={openCategory}
                onAllSpaces={goSpaces}
                onReflection={goReflection}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default DashboardPage;

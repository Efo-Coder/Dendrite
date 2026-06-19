import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { ViewType } from '../types';
import { PAGE_FADE } from '../lib/pageMotion';
import AppSidebar from '../components/sidebar/AppSidebar';
import SearchOverlay from '../components/home/SearchOverlay';
import HomeView from './HomeView';
import SpacesView from './SpacesView';
import ReflectionView from './ReflectionView';
import WorkspaceView from './WorkspaceView';

type AppView = 'home' | 'spaces' | 'reflection' | 'workspace';

// Shell for authenticated users: the calm Home/Spaces dashboard and the
// three-column workspace are two top-level modes; AppSidebar switches between them.
const DashboardPage = () => {
  const user = useAuthStore((s) => s.user);
  const [appView, setAppView] = useState<AppView>('home');
  const [searchOpen, setSearchOpen] = useState(false);

  // Where the workspace should open when entered from the dashboard.
  const [wsView, setWsView] = useState<ViewType>('all');
  const [wsFolderId, setWsFolderId] = useState<string | undefined>();
  const [wsNoteId, setWsNoteId] = useState<string | undefined>();

  const goHome = useCallback(() => setAppView('home'), []);
  const goSpaces = useCallback(() => setAppView('spaces'), []);
  const goReflection = useCallback(() => setAppView('reflection'), []);

  const openWorkspace = useCallback((view: ViewType, folderId?: string, noteId?: string) => {
    setWsView(view);
    setWsFolderId(folderId);
    setWsNoteId(noteId);
    setAppView('workspace');
  }, []);

  const openNote = useCallback((id: string) => openWorkspace('all', undefined, id), [openWorkspace]);
  const openSpace = useCallback((id: string) => openWorkspace('folder', id), [openWorkspace]);

  // mode="wait" + one shared PAGE_FADE → every switch fades out, then in, identically.
  return (
    <AnimatePresence mode="wait">
      {appView === 'workspace' ? (
        <WorkspaceView
          key={`workspace-${wsView}-${wsFolderId ?? ''}-${wsNoteId ?? ''}`}
          initialView={wsView}
          initialFolderId={wsFolderId}
          initialNoteId={wsNoteId}
          onExitToHome={goHome}
        />
      ) : (
        <motion.div key="home" className="home-stage" {...PAGE_FADE}>
          <div className="home-shell">
            <AppSidebar
              active={appView}
              onHome={goHome}
              onSpaces={goSpaces}
              onThoughts={() => openWorkspace('all')}
              onReflection={goReflection}
              onSearch={() => setSearchOpen(true)}
              user={user}
            />
            <AnimatePresence mode="wait">
              <motion.div key={appView} className="home-page" {...PAGE_FADE}>
                {appView === 'spaces' ? (
                  <SpacesView onOpenSpace={openSpace} />
                ) : appView === 'reflection' ? (
                  <ReflectionView />
                ) : (
                  <HomeView
                    onOpenNote={openNote}
                    onOpenSpace={openSpace}
                    onAllThoughts={() => openWorkspace('all')}
                    onAllSpaces={goSpaces}
                    onReflection={goReflection}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <SearchOverlay
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
            onOpenNote={openNote}
            onOpenSpace={openSpace}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DashboardPage;

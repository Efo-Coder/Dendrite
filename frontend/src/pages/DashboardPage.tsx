import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { ViewType } from '../types';
import AppSidebar from '../components/sidebar/AppSidebar';
import SearchOverlay from '../components/home/SearchOverlay';
import HomeView from './HomeView';
import SpacesView from './SpacesView';
import WorkspaceView from './WorkspaceView';

type AppView = 'home' | 'spaces' | 'workspace';

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

  const openWorkspace = useCallback((view: ViewType, folderId?: string, noteId?: string) => {
    setWsView(view);
    setWsFolderId(folderId);
    setWsNoteId(noteId);
    setAppView('workspace');
  }, []);

  const openNote = useCallback((id: string) => openWorkspace('all', undefined, id), [openWorkspace]);
  const openSpace = useCallback((id: string) => openWorkspace('folder', id), [openWorkspace]);

  if (appView === 'workspace') {
    return (
      <WorkspaceView
        key={`${wsView}-${wsFolderId ?? ''}-${wsNoteId ?? ''}`}
        initialView={wsView}
        initialFolderId={wsFolderId}
        initialNoteId={wsNoteId}
        onExitToHome={goHome}
      />
    );
  }

  return (
    <motion.div
      className="home-stage"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
      <div className="home-shell">
        <AppSidebar
          active={appView}
          onHome={goHome}
          onSpaces={goSpaces}
          onThoughts={() => openWorkspace('all')}
          onSearch={() => setSearchOpen(true)}
          user={user}
        />
        {appView === 'spaces' ? (
          <SpacesView onOpenSpace={openSpace} />
        ) : (
          <HomeView
            onOpenNote={openNote}
            onOpenSpace={openSpace}
            onAllThoughts={() => openWorkspace('all')}
            onAllSpaces={goSpaces}
          />
        )}
      </div>

      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenNote={openNote}
        onOpenSpace={openSpace}
      />
    </motion.div>
  );
};

export default DashboardPage;

import { useEffect, useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/ToastContainer';
import Sidebar from '../components/Sidebar';
import NoteList from '../components/NoteList';
import NoteEditor from '../components/NoteEditor';
import Header from '../components/Header';
import { Plus, FileText } from 'lucide-react';

type ViewType = 'all' | 'favorites' | 'archive' | 'trash' | 'folder' | 'tag';

const DashboardPage = () => {
  const { notes, fetchNotes, createNote, currentNote, setCurrentNote } = useNoteStore();
  const { user } = useAuthStore();
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // View State
  const [currentView, setCurrentView] = useState<ViewType>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>();
  const [selectedTagId, setSelectedTagId] = useState<string>();

  useEffect(() => {
    // Initial load - nur Notizen die nicht archiviert/gelöscht sind
    fetchNotes({ archived: false, deleted: false });
  }, []);

  const refreshCurrentView = () => {
    // Refresh the current view with the same filters
    const filters: any = {};

    switch (currentView) {
      case 'all':
        filters.archived = false;
        filters.deleted = false;
        break;
      case 'favorites':
        filters.favorite = true;
        filters.archived = false;
        filters.deleted = false;
        break;
      case 'archive':
        filters.archived = true;
        filters.deleted = false;
        break;
      case 'trash':
        filters.deleted = true;
        break;
      case 'folder':
        filters.folderId = selectedFolderId;
        filters.archived = false;
        filters.deleted = false;
        break;
      case 'tag':
        filters.tagId = selectedTagId;
        filters.archived = false;
        filters.deleted = false;
        break;
    }

    fetchNotes(filters);
    // Trigger sidebar refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewChange = (view: ViewType, id?: string) => {
    setCurrentView(view);
    setCurrentNote(null); // Clear current note when switching views

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

    // Fetch notes based on view
    const filters: any = {};

    switch (view) {
      case 'all':
        filters.archived = false;
        filters.deleted = false;
        break;
      case 'favorites':
        filters.favorite = true;
        filters.archived = false;
        filters.deleted = false;
        break;
      case 'archive':
        filters.archived = true;
        filters.deleted = false;
        break;
      case 'trash':
        filters.deleted = true;
        break;
      case 'folder':
        filters.folderId = id;
        filters.archived = false;
        filters.deleted = false;
        break;
      case 'tag':
        filters.tagId = id;
        filters.archived = false;
        filters.deleted = false;
        break;
    }

    fetchNotes(filters);
  };

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      const newNote = await createNote({
        title: 'Neue Notiz',
        content: '',
        folderId: currentView === 'folder' ? selectedFolderId : undefined,
      });
      setCurrentNote(newNote);
      toast.success('Notiz erstellt');
      // Trigger sidebar refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Notiz konnte nicht erstellt werden');
    } finally {
      setIsCreating(false);
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'all':
        return 'Alle Notizen';
      case 'favorites':
        return 'Favoriten';
      case 'archive':
        return 'Archiv';
      case 'trash':
        return 'Papierkorb';
      case 'folder':
        return 'Ordner';
      case 'tag':
        return 'Tag';
      default:
        return 'Notizen';
    }
  };

  return (
    <div className="flex h-screen bg-dark-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        selectedFolderId={selectedFolderId}
        selectedTagId={selectedTagId}
        refreshTrigger={refreshTrigger}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} />

        <div className="flex-1 flex overflow-hidden">
          {/* Note List */}
          <div className="w-80 border-r border-dark-border bg-dark-surface flex flex-col">
            {/* Note List Header */}
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-text-primary">
                {getViewTitle()}
              </h2>
              <div className="w-9 h-9 flex items-center justify-center">
                {currentView !== 'trash' && (
                  <button
                    onClick={handleCreateNote}
                    disabled={isCreating}
                    className="btn-ghost p-2 rounded-lg"
                    title="Neue Notiz"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Note List Items */}
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
            />
          </div>

          {/* Note Editor */}
          <div className="flex-1 overflow-hidden">
            {currentNote ? (
              <NoteEditor
                note={currentNote}
                currentView={currentView}
                onNoteUpdate={refreshCurrentView}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-dark-text-muted">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Wähle eine Notiz oder erstelle eine neue</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

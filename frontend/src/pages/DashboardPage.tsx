import { useEffect, useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFolderStore } from '../store/useFolderStore';
import { useTagStore } from '../store/useTagStore';
import { useToast } from '../components/ToastContainer';
import Sidebar from '../components/Sidebar';
import NoteList from '../components/NoteList';
import NoteEditor from '../components/NoteEditor';
import Header from '../components/header';
import { Plus, FileText, Trash2 } from 'lucide-react';
import Modal from '../components/modals/Modal';

type ViewType = 'all' | 'favorites' | 'archive' | 'trash' | 'folder' | 'tag';

const DashboardPage = () => {
  const { notes, fetchNotes, createNote, currentNote, setCurrentNote, deleteNote } = useNoteStore();
  const { folders } = useFolderStore();
  const { tags } = useTagStore();
  const { user } = useAuthStore();
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);

  // View State
  const [currentView, setCurrentView] = useState<ViewType>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>();
  const [selectedTagId, setSelectedTagId] = useState<string>();

  // Animation State
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Initial load - nur Notizen die nicht archiviert/gelÃ¶scht sind
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
    // Start fade-out animation
    setIsTransitioning(true);

    // Wait for fade-out to complete
    setTimeout(() => {
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

      // Start fade-in animation
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200); // 200ms fade-out duration
  };

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      const newNote = await createNote({
        content: '',
        folderId: currentView === 'folder' ? selectedFolderId : undefined,
        tags: currentView === 'tag' && selectedTagId ? [selectedTagId] : undefined,
      });
      console.log('New note created:', newNote);

      // Setze die neue Notiz als aktuelle Notiz
      setCurrentNote(newNote);

      // Aktualisiere die Notizliste
      refreshCurrentView();

      toast.success('Notiz erstellt');
      // Trigger sidebar refresh
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
      toast.error('Papierkorb geleert');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Papierkorb konnte nicht geleert werden');
    } finally {
      setShowEmptyTrashModal(false);
      // Trigger sidebar refresh
      setRefreshTrigger(prev => prev + 1);
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
        return folders.find(f => f.id === selectedFolderId)?.name ?? 'Ordner';
      case 'tag':
        return tags.find(t => t.id === selectedTagId)?.name ?? 'Tag';
      default:
        return 'Notizen';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden p-4 gap-4">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        selectedFolderId={selectedFolderId}
        selectedTagId={selectedTagId}
        refreshTrigger={refreshTrigger}
        onTagUpdated={refreshCurrentView}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Header */}
        <Header user={user} />

        <div className="flex-1 flex gap-3 min-h-0">
          {/* Note List */}
          <div className="w-80 glass-surface rounded-2xl overflow-hidden flex flex-col relative">
            {/* Note List Header */}
            <div className="p-4 border-b glass-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-accent-fg">
                {getViewTitle()}
              </h2>
              <div className="w-9 h-9 flex items-center justify-center">
                {currentView !== 'trash' ? (
                  <button
                    onClick={handleCreateNote}
                    disabled={isCreating}
                    className="p-2 text-accent-subtle hover:text-accent-brand transition-colors"
                    title="Neue Notiz"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowEmptyTrashModal(true)}
                    className="btn-ghost px-3 py-2 rounded-lg text-red-500 hover-highlight flex items-center gap-2"
                    title="Papierkorb leeren"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Note List Items */}
            <div
              className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
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
              />
            </div>
          </div>

          {/* Note Editor */}
          <div className="flex-1 overflow-hidden glass-surface rounded-2xl relative isolate">
            {currentNote ? (
              <NoteEditor
                note={currentNote}
                onNoteUpdate={refreshCurrentView}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-accent-subtle">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Wähle eine Notiz oder erstelle eine neue</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Empty Trash Modal */}
        <Modal isOpen={showEmptyTrashModal} onClose={() => setShowEmptyTrashModal(false)} title="Papierkorb leeren?">
          <div className="space-y-4">
            <p className="text-sm text-accent-secondary">
              Möchtest du wirklich alle Notizen im Papierkorb endgültig löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEmptyTrashModal(false)}
                className="px-3 py-2 rounded-lg bg-white/30 text-accent-fg hover:bg-white/40"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEmptyTrash}
                className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default DashboardPage;


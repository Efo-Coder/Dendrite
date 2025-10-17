import { useState, useEffect } from 'react';
import { Note } from '../types';
import { useNoteStore } from '../store/useNoteStore';
import { useFolderStore } from '../store/useFolderStore';
import { useTagStore } from '../store/useTagStore';
import { useToast } from './ToastContainer';
import {
  Pin,
  Star,
  MoreVertical,
  Trash2,
  FolderOpen,
  Tag as TagIcon,
  Clock,
  Archive,
  ArchiveRestore,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import clsx from 'clsx';

interface NoteEditorProps {
  note: Note;
  currentView?: string;
  onNoteUpdate?: () => void;
}

const NoteEditor = ({ note, currentView, onNoteUpdate }: NoteEditorProps) => {
  const { updateNote, deleteNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, setCurrentNote } = useNoteStore();
  const { folders } = useFolderStore();
  const { tags } = useTagStore();
  const toast = useToast();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note.id, note.title, note.content]);

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        handleSave();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content]);

  const handleSave = async () => {
    if (title === note.title && content === note.content) return;

    setIsSaving(true);
    try {
      await updateNote(note.id, { title, content });
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    try {
      await updateNote(note.id, { folderId });
      setShowFolderDropdown(false);
      toast.success('Notiz verschoben');
      if (onNoteUpdate) onNoteUpdate();
    } catch (error) {
      toast.error('Fehler beim Verschieben');
    }
  };

  const handleToggleTag = async (tagId: string) => {
    const currentTagIds = note.tags?.map(t => t.id) || [];
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId];

    try {
      await updateNote(note.id, { tags: newTagIds });
      toast.success('Tags aktualisiert');
      if (onNoteUpdate) onNoteUpdate();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Tags');
    }
  };

  const handleDelete = async () => {
    if (note.isDeleted) {
      // Permanent delete - keine Bestätigung nötig, direkt löschen
      try {
        await deleteNote(note.id);
        setCurrentNote(null);
        toast.success('Notiz endgültig gelöscht');
        if (onNoteUpdate) onNoteUpdate();
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    } else {
      // Move to trash
      try {
        await toggleTrash(note.id);
        toast.info('Notiz in Papierkorb verschoben');
        if (onNoteUpdate) onNoteUpdate();
      } catch (error) {
        toast.error('Fehler beim Verschieben in den Papierkorb');
      }
    }
  };

  const handleArchive = async () => {
    try {
      await toggleArchive(note.id);
      toast.info('Notiz archiviert');
      if (onNoteUpdate) onNoteUpdate();
    } catch (error) {
      toast.error('Fehler beim Archivieren');
    }
  };

  const handleRestore = async () => {
    try {
      if (note.isDeleted) {
        await toggleTrash(note.id);
        toast.success('Notiz wiederhergestellt');
      } else if (note.isArchived) {
        await toggleArchive(note.id);
        toast.success('Notiz aus Archiv wiederhergestellt');
      }
      if (onNoteUpdate) onNoteUpdate();
    } catch (error) {
      toast.error('Fehler beim Wiederherstellen');
    }
  };

  const isInTrash = note.isDeleted;
  const isArchived = note.isArchived && !note.isDeleted;

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      {/* Toolbar */}
      <div className="h-14 border-b border-dark-border px-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {!isInTrash && !isArchived && (
            <>
              <button
                onClick={() => togglePin(note.id)}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  note.isPinned
                    ? 'text-accent-green-500 bg-accent-green-500/10'
                    : 'text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary'
                )}
                title="Notiz anheften"
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleFavorite(note.id)}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  note.isFavorite
                    ? 'text-yellow-500'
                    : 'text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary'
                )}
                title="Zu Favoriten hinzufügen"
              >
                <Star className={clsx('w-4 h-4', note.isFavorite && 'fill-yellow-500')} />
              </button>

              <div className="h-4 w-px bg-dark-border mx-2" />

              {/* Folder Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                  className="p-2 rounded-lg text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary transition-colors"
                  title="Ordner wählen"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>

                {showFolderDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFolderDropdown(false)} />
                    <div className="absolute left-0 mt-2 w-56 bg-dark-surface border border-dark-border rounded-lg shadow-2xl z-20 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => handleMoveToFolder(null)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-dark-elevated transition-colors"
                      >
                        <span className="text-dark-text-secondary">Kein Ordner</span>
                      </button>
                      {folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => handleMoveToFolder(folder.id)}
                          className={clsx(
                            'w-full px-4 py-2 text-left text-sm hover:bg-dark-elevated transition-colors flex items-center space-x-2',
                            note.folderId === folder.id && 'bg-accent-green-500/10 text-accent-green-500'
                          )}
                        >
                          <FolderOpen className="w-4 h-4" style={{ color: folder.color || '#10b981' }} />
                          <span>{folder.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Tag Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  className="p-2 rounded-lg text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary transition-colors"
                  title="Tags verwalten"
                >
                  <TagIcon className="w-4 h-4" />
                </button>

                {showTagDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowTagDropdown(false)} />
                    <div className="absolute left-0 mt-2 w-56 bg-dark-surface border border-dark-border rounded-lg shadow-2xl z-20 max-h-64 overflow-y-auto">
                      {tags.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-dark-text-muted italic">
                          Keine Tags verfügbar
                        </div>
                      ) : (
                        tags.map((tag) => {
                          const isSelected = note.tags?.some(t => t.id === tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => handleToggleTag(tag.id)}
                              className={clsx(
                                'w-full px-4 py-2 text-left text-sm hover:bg-dark-elevated transition-colors flex items-center space-x-2',
                                isSelected && 'bg-accent-green-500/10'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded border-dark-border"
                                style={{ accentColor: tag.color }}
                              />
                              <TagIcon className="w-4 h-4" style={{ color: tag.color }} />
                              <span>{tag.name}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Archive/Restore Buttons */}
          {isArchived && (
            <button
              onClick={handleRestore}
              className="p-2 rounded-lg text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary transition-colors"
              title="Aus Archiv wiederherstellen"
            >
              <ArchiveRestore className="w-4 h-4" />
            </button>
          )}

          {isInTrash && (
            <button
              onClick={handleRestore}
              className="p-2 rounded-lg text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary transition-colors"
              title="Wiederherstellen"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Save Status */}
          {!isInTrash && (
            <div className="flex items-center space-x-2 text-xs text-dark-text-muted">
              <Clock className="w-3 h-3" />
              <span>
                {isSaving
                  ? 'Wird gespeichert...'
                  : `Gespeichert ${formatDistanceToNow(new Date(note.updatedAt), {
                      addSuffix: true,
                      locale: de,
                    })}`}
              </span>
            </div>
          )}

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-dark-surface border border-dark-border rounded-lg shadow-2xl z-20 overflow-hidden animate-fade-in">
                  {!isInTrash && !isArchived && (
                    <button
                      onClick={() => { handleArchive(); setShowMenu(false); }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-dark-text-primary hover:bg-dark-elevated transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archivieren</span>
                    </button>
                  )}
                  <button
                    onClick={() => { handleDelete(); setShowMenu(false); }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-500 hover:bg-dark-elevated transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isInTrash ? 'Endgültig löschen' : 'In Papierkorb'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel"
            className="w-full text-3xl md:text-4xl font-bold bg-transparent border-none outline-none text-dark-text-primary placeholder-dark-text-muted mb-6"
            disabled={isInTrash}
          />

          {/* Content Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Beginne zu schreiben..."
            className="w-full min-h-[500px] bg-transparent border-none outline-none text-dark-text-primary placeholder-dark-text-muted text-base md:text-lg leading-relaxed resize-none"
            disabled={isInTrash}
          />
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
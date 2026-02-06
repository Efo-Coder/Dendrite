import { useState, useEffect } from 'react';
import { Note } from '../types';
import { useNoteStore } from '../store/useNoteStore';
import { useFolderStore } from '../store/useFolderStore';
import { useTagStore } from '../store/useTagStore';
import { useToast } from './ToastContainer';
import RichTextToolbar from './RichTextToolbar';
import LexicalEditorWrapper from './LexicalEditorWrapper';
import AttachmentList from './AttachmentList';
import {
  Pin,
  Star,
  Trash2,
  FolderOpen,
  Tag as TagIcon,
  Clock,
  Archive,
  ArchiveRestore,
  RotateCcw,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import clsx from 'clsx';

interface NoteEditorProps {
  note: Note;
  onNoteUpdate?: () => void;
}

const NoteEditor = ({ note, onNoteUpdate }: NoteEditorProps) => {
  const { updateNote, deleteNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, setCurrentNote } = useNoteStore();
  const { folders } = useFolderStore();
  const { tags } = useTagStore();
  const toast = useToast();

  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  useEffect(() => {
    setContent(note.content);
  }, [note.id]); // Only update when note ID changes, not content

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== note.content) {
        handleSave();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content]);

  const handleSave = async () => {
    if (content === note.content) return;

    setIsSaving(true);
    try {
      await updateNote(note.id, { content });
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    try {
      await updateNote(note.id, { folderId: folderId || undefined });
      setShowFolderDropdown(false);
      toast.info('Notiz verschoben');
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
      toast.info('Tags aktualisiert');
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
        toast.error('Notiz endgültig gelöscht');
        if (onNoteUpdate) onNoteUpdate();
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    } else {
      // Move to trash
      try {
        await toggleTrash(note.id);
        setCurrentNote(null); // Close editor after moving to trash
        toast.error('Notiz gelöscht');
        if (onNoteUpdate) onNoteUpdate();
      } catch (error) {
        toast.error('Fehler beim Löschen der Notiz');
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

  const handleClose = () => {
    setCurrentNote(null);
  };

  const isInTrash = note.isDeleted;
  const isArchived = note.isArchived && !note.isDeleted;

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      {/* Toolbar */}
      <div className="p-4 h-9 glass-surface px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {!isInTrash && !isArchived && (
            <>
              <button
                onClick={() => togglePin(note.id)}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  note.isPinned
                    ? 'text-accent-500 bg-accent-500/10'
                    : 'text-accent-700 hover-highlight hover:text-accent-900'
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
                    : 'text-accent-700 hover-highlight hover:text-accent-900'
                )}
                title="Zu Favoriten hinzufügen"
              >
                <Star className={clsx('w-4 h-4', note.isFavorite && 'fill-yellow-500')} />
              </button>
              <button
                onClick={handleArchive}
                className="p-2 rounded-lg text-accent-700 hover-highlight hover:text-accent-900 transition-colors"
                title="Archivieren"
              >
                <Archive className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-white/30 mx-2" />

              {/* Folder Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                  className="p-2 rounded-lg text-accent-700 hover-highlight hover:text-accent-900 transition-colors"
                  title="Ordner wählen"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>

                {showFolderDropdown && (
                  <>
                    <div className="fixed inset-0" onClick={() => setShowFolderDropdown(false)} />
                    <div className="absolute left-0 mt-2 w-56 glass-panel rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                      <button
                        onClick={() => handleMoveToFolder(null)}
                        className="w-full px-4 py-2 text-left text-sm hover-highlight transition-colors"
                      >
                        <span className="text-accent-800">Kein Ordner</span>
                      </button>
                      {folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => handleMoveToFolder(folder.id)}
                          className={clsx(
                            'w-full px-4 py-2 text-left text-sm hover-highlight transition-colors flex items-center space-x-2',
                            note.folderId === folder.id && 'bg-accent-500/10 text-accent-500'
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
                  className="p-2 rounded-lg text-accent-700 hover-highlight hover:text-accent-900 transition-colors"
                  title="Tags verwalten"
                >
                  <TagIcon className="w-4 h-4" />
                </button>

                {showTagDropdown && (
                  <>
                    <div className="fixed inset-0" onClick={() => setShowTagDropdown(false)} />
                    <div className="absolute left-0 mt-2 w-56 glass-panel rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                      {tags.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-accent-700 italic">
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
                                'w-full px-4 py-2 text-left text-sm hover-highlight transition-colors flex items-center',
                                isSelected && 'bg-accent-500/10'
                              )}
                            >
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded border-white/30 flex-shrink-0"
                                  style={{ accentColor: tag.color }}
                                />
                                <TagIcon className="w-4 h-4 flex-shrink-0" style={{ color: tag.color }} />
                                <span className="truncate">{tag.name}</span>
                              </div>
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
              className="p-2 rounded-lg text-accent-700 hover-highlight hover:text-accent-900 transition-colors"
              title="Aus Archiv wiederherstellen"
            >
              <ArchiveRestore className="w-4 h-4" />
            </button>
          )}

          {isInTrash && (
            <button
              onClick={handleRestore}
              className="p-2 rounded-lg text-accent-700 hover-highlight hover:text-accent-900 transition-colors"
              title="Wiederherstellen"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Save Status */}
          {!isInTrash && (
            <div className="flex items-center space-x-2 text-xs text-accent-700 min-w-0">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {isSaving
                  ? 'Wird gespeichert...'
                  : `Gespeichert ${formatDistanceToNow(new Date(note.updatedAt), {
                      addSuffix: true,
                      locale: de,
                    })}`}
              </span>
            </div>
          )}

          {/* Right side icons */}
          <div className="flex items-center space-x-2">
            {/* Trash/Delete Button - only show when not in trash/archive */}
            {!isInTrash && !isArchived && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg text-accent-700 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                title="In Papierkorb"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Endgültig löschen Button - only show in trash */}
            {isInTrash && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg text-accent-700 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                title="Endgültig löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-accent-700 hover-highlight hover:text-accent-900 transition-colors"
              title="Notiz schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lexical Editor with Toolbar */}
      <LexicalEditorWrapper
        key={note.id}
        content={note.content}
        onChange={setContent}
        placeholder="Beginne zu schreiben..."
        disabled={isInTrash}
        toolbar={<RichTextToolbar disabled={isInTrash} noteId={note.id} />}
      />

      {/* Attachments */}
      <AttachmentList noteId={note.id} onAttachmentsChange={onNoteUpdate} />
    </div>
  );
};

export default NoteEditor;

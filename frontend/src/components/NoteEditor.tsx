import { useState, useEffect, useRef } from 'react';
import { useGlassPill } from '../hooks/useGlassPill';
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
  MoreHorizontal,
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

  // Left overflow (Folder/Tag)
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);

  // Hide save text when toolbar is narrow
  const [isNarrow, setIsNarrow] = useState(false);

  const { pill: toolbarPill, onEnter: onToolbarEnter, onLeave: onToolbarLeave } = useGlassPill(toolbarRef);
  const overflowPopupRef = useRef<HTMLDivElement>(null);
  const { pill: overflowPill, onEnter: onOverflowEnter, onLeave: onOverflowLeave } = useGlassPill(overflowPopupRef);

  useEffect(() => {
    setContent(note.content);
  }, [note.id]);

  // ResizeObserver: two breakpoints for left and right overflow
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setIsCompact(w < 480);
      setIsNarrow(w < 560);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // Folder/Tag dropdown JSX — reused in both inline and overflow contexts
  const folderDropdown = (enterFn?: (e: React.MouseEvent<HTMLButtonElement>) => void) => (
    <div className="relative">
      <button
        onClick={() => setShowFolderDropdown(!showFolderDropdown)}
        onMouseEnter={enterFn}
        className="p-2 rounded-lg text-accent-subtle hover-text-themed transition-colors relative z-10"
        title="Ordner wählen"
      >
        <FolderOpen className="w-4 h-4" />
      </button>
      {showFolderDropdown && (
        <>
          <div className="fixed inset-0" onClick={() => setShowFolderDropdown(false)} />
          <div className="absolute left-0 mt-2 w-56 glass-panel rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50">
            <button
              onClick={() => handleMoveToFolder(null)}
              className="w-full px-4 py-2 text-left text-sm hover-highlight transition-colors"
            >
              <span className="text-accent-secondary">Kein Ordner</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMoveToFolder(folder.id)}
                className={clsx(
                  'w-full px-4 py-2 text-left text-sm hover-highlight transition-colors flex items-center space-x-2',
                  note.folderId === folder.id && 'bg-accent-brand/10 text-accent-brand'
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
  );

  const tagDropdown = (enterFn?: (e: React.MouseEvent<HTMLButtonElement>) => void) => (
    <div className="relative">
      <button
        onClick={() => setShowTagDropdown(!showTagDropdown)}
        onMouseEnter={enterFn}
        className="p-2 rounded-lg text-accent-subtle hover-text-themed transition-colors relative z-10"
        title="Tags verwalten"
      >
        <TagIcon className="w-4 h-4" />
      </button>
      {showTagDropdown && (
        <>
          <div className="fixed inset-0" onClick={() => setShowTagDropdown(false)} />
          <div className="absolute left-0 mt-2 w-56 glass-panel rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50">
            {tags.length === 0 ? (
              <div className="px-4 py-3 text-sm text-accent-subtle italic">Keine Tags verfügbar</div>
            ) : (
              tags.map((tag) => {
                const isSelected = note.tags?.some(t => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className={clsx(
                      'w-full px-4 py-2 text-left text-sm hover-highlight transition-colors flex items-center',
                      isSelected && 'bg-accent-brand/10'
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
  );

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      {/* Toolbar wrapper — relative but NO backdrop-filter, so dropdowns render on top of editor */}
      <div className="relative">
        <div ref={toolbarRef} className="p-4 h-9 glass-surface px-10 flex items-center justify-between relative" onMouseLeave={onToolbarLeave}>
          {toolbarPill && (
            <div
              className={clsx('glass-pill', toolbarPill.isActive && 'glass-pill-active')}
              style={{ left: toolbarPill.left, top: toolbarPill.top, width: toolbarPill.width, height: toolbarPill.height }}
            />
          )}
          {/* Left side */}
          <div className="flex items-center gap-1">
            {!isInTrash && !isArchived && (
              <>
                <button
                  onClick={() => togglePin(note.id)}
                  onMouseEnter={(e) => onToolbarEnter(e, note.isPinned)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors relative z-10',
                    note.isPinned ? 'text-accent-brand' : 'text-accent-subtle hover-text-themed'
                  )}
                  title="Notiz anheften"
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleFavorite(note.id)}
                  onMouseEnter={(e) => onToolbarEnter(e, false)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors relative z-10',
                    note.isFavorite ? 'text-yellow-500' : 'text-accent-subtle hover-text-themed'
                  )}
                  title="Zu Favoriten hinzufügen"
                >
                  <Star className={clsx('w-4 h-4', note.isFavorite && 'fill-yellow-500')} />
                </button>
                <button
                  onClick={handleArchive}
                  onMouseEnter={(e) => onToolbarEnter(e, false)}
                  className="p-2 rounded-lg text-accent-subtle  hover-text-themed transition-colors relative z-10"
                  title="Archivieren"
                >
                  <Archive className="w-4 h-4" />
                </button>

                {!isCompact ? (
                  <>
                    {folderDropdown((e) => onToolbarEnter(e, false))}
                    {tagDropdown((e) => onToolbarEnter(e, false))}
                  </>
                ) : (
                  <button
                    onClick={() => setShowOverflow(v => !v)}
                    onMouseEnter={(e) => onToolbarEnter(e, showOverflow)}
                    className={clsx(
                      'p-2 rounded-lg transition-colors flex-shrink-0 mr-2 relative z-10',
                      showOverflow ? 'text-accent-brand' : 'text-accent-subtle hover-text-themed'
                    )}
                    title="Weitere Optionen"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            {isArchived && (
              <button onClick={handleRestore} onMouseEnter={(e) => onToolbarEnter(e, false)} className="p-2 rounded-lg text-accent-subtle hover-text-themed transition-colors relative z-10" title="Aus Archiv wiederherstellen">
                <ArchiveRestore className="w-4 h-4" />
              </button>
            )}
            {isInTrash && (
              <button onClick={handleRestore} onMouseEnter={(e) => onToolbarEnter(e, false)} className="p-2 rounded-lg text-accent-subtle hover-text-themed transition-colors relative z-10" title="Wiederherstellen">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right side — Trash + Close always visible */}
          <div className="flex items-center gap-1">
            {!isInTrash && (
              <div className="flex items-center space-x-1 text-xs text-accent-subtle min-w-0 mr-1">
                <Clock className="w-4 h-4 flex-shrink-0" />
                {!isNarrow && (
                  <span className="truncate">
                    {isSaving
                      ? 'Wird gespeichert...'
                      : `Gespeichert ${formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: de })}`}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleDelete}
              onMouseEnter={(e) => onToolbarEnter(e, false)}
              className="p-2 rounded-lg text-accent-subtle hover:text-red-500 transition-colors relative z-10"
              title={isInTrash ? 'Endgültig löschen' : 'In Papierkorb'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={handleClose} onMouseEnter={(e) => onToolbarEnter(e, false)} className="p-2 rounded-lg text-accent-subtle hover-text-themed transition-colors relative z-10" title="Notiz schließen">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Left overflow dropdown — sibling of toolbar, outside backdrop-filter stacking context */}
        {isCompact && !isInTrash && !isArchived && showOverflow && (
          <>
            <div className="fixed inset-0" onClick={() => setShowOverflow(false)} />
            <div ref={overflowPopupRef} className="absolute top-full left-10 mt-1 glass-panel rounded-xl shadow-xl p-2 z-50 flex gap-1" onMouseLeave={onOverflowLeave}>
              {overflowPill && (
                <div
                  className={clsx('glass-pill', overflowPill.isActive && 'glass-pill-active')}
                  style={{ left: overflowPill.left, top: overflowPill.top, width: overflowPill.width, height: overflowPill.height }}
                />
              )}
              {folderDropdown((e) => onOverflowEnter(e, false))}
              {tagDropdown((e) => onOverflowEnter(e, false))}
            </div>
          </>
        )}
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

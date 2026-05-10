import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Check,
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
  const contentRef = useRef(content);
  const noteRef = useRef(note);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { noteRef.current = note; }, [note]);
  const [folderMenuPos, setFolderMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [tagMenuPos, setTagMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Toolbar overflow
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  const { pill: toolbarPill, onEnter: onToolbarEnter, onLeave: onToolbarLeave } = useGlassPill(toolbarRef);
  const overflowPopupRef = useRef<HTMLDivElement>(null);
  const { pill: overflowPill, onEnter: onOverflowEnter, onLeave: onOverflowLeave } = useGlassPill(overflowPopupRef);

  // Folder/Tag context menu refs + pills
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const { pill: folderPill, onEnter: onFolderEnter, onLeave: onFolderLeave } = useGlassPill(folderMenuRef);
  const { pill: tagPill, onEnter: onTagEnter, onLeave: onTagLeave } = useGlassPill(tagMenuRef);

  useEffect(() => {
    return () => {
      const currentContent = contentRef.current;
      const currentNote = noteRef.current;
      if (currentContent !== currentNote.content) {
        updateNote(currentNote.id, { content: currentContent });
      }
    };
  }, [note.id]);

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

  // Close menus on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFolderMenuPos(null);
        setTagMenuPos(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
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
      await updateNote(note.id, { folderId });
      setFolderMenuPos(null);
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
      try {
        await deleteNote(note.id);
        setCurrentNote(null);
        toast.error('Notiz endgültig gelöscht');
        if (onNoteUpdate) onNoteUpdate();
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    } else {
      try {
        await toggleTrash(note.id);
        setCurrentNote(null);
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

  const openFolderMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTagMenuPos(null);
    setFolderMenuPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4 });
  };

  const openTagMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFolderMenuPos(null);
    setTagMenuPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4 });
  };

  const isInTrash = note.isDeleted;
  const isArchived = note.isArchived && !note.isDeleted;

  // Reusable button renderers (just the trigger, menu rendered via portal)
  const folderButton = (enterFn?: (e: React.MouseEvent<HTMLButtonElement>) => void) => (
    <button
      onClick={openFolderMenu}
      onMouseEnter={enterFn}
      className={clsx(
        'p-2 rounded-lg transition-colors relative z-10',
        folderMenuPos ? 'text-brand-primary' : 'text-text-primary'
      )}
      title="Ordner wählen"
    >
      <FolderOpen className="w-4 h-4" />
    </button>
  );

  const tagButton = (enterFn?: (e: React.MouseEvent<HTMLButtonElement>) => void) => (
    <button
      onClick={openTagMenu}
      onMouseEnter={enterFn}
      className={clsx(
        'p-2 rounded-lg transition-colors relative z-10',
        tagMenuPos ? 'text-brand-primary' : 'text-text-primary'
      )}
      title="Tags verwalten"
    >
      <TagIcon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      {/* Toolbar wrapper — z-10 ensures stacking context above the editor's overflow stacking context */}
      <div className="relative z-10">
        <div ref={toolbarRef} className="p-4 h-9 px-6 flex items-center justify-between relative" style={{ background: 'var(--color-bg-header)', boxShadow: 'none' }} onMouseLeave={onToolbarLeave}>
          {toolbarPill && (
            <div
              className="glass-pill"
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
                    note.isPinned ? 'text-brand-primary' : 'text-text-primary'
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
                    note.isFavorite ? 'text-yellow-500' : 'text-text-primary'
                  )}
                  title="Zu Favoriten hinzufügen"
                >
                  <Star className={clsx('w-4 h-4', note.isFavorite && 'fill-yellow-500')} />
                </button>
                <button
                  onClick={handleArchive}
                  onMouseEnter={(e) => onToolbarEnter(e, false)}
                  className="p-2 rounded-lg text-text-primary transition-colors relative z-10"
                  title="Archivieren"
                >
                  <Archive className="w-4 h-4" />
                </button>

                {!isCompact ? (
                  <>
                    {folderButton((e) => onToolbarEnter(e, false))}
                    {tagButton((e) => onToolbarEnter(e, false))}
                  </>
                ) : (
                  <button
                    onClick={() => setShowOverflow(v => !v)}
                    onMouseEnter={(e) => onToolbarEnter(e, showOverflow)}
                    className={clsx(
                      'p-2 rounded-lg transition-colors flex-shrink-0 mr-2 relative z-10',
                      showOverflow ? 'text-brand-primary' : 'text-text-primary'
                    )}
                    title="Weitere Optionen"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            {isArchived && (
              <button onClick={handleRestore} onMouseEnter={(e) => onToolbarEnter(e, false)} className="p-2 rounded-lg text-text-primary transition-colors relative z-10" title="Aus Archiv wiederherstellen">
                <ArchiveRestore className="w-4 h-4" />
              </button>
            )}
            {isInTrash && (
              <button onClick={handleRestore} onMouseEnter={(e) => onToolbarEnter(e, false)} className="p-2 rounded-lg text-text-primary transition-colors relative z-10" title="Wiederherstellen">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right side — Trash + Close always visible */}
          <div className="flex items-center gap-1">
            {!isInTrash && (
              <div className="flex items-center space-x-2 text-xs text-text-secondary min-w-0 mr-1">
                <Clock className="w-4 h-4 flex-shrink-0 text-text-primary" />
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
              className="p-2 rounded-lg text-text-primary hover:text-red-500 transition-colors relative z-10"
              title={isInTrash ? 'Endgültig löschen' : 'In Papierkorb'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={handleClose} onMouseEnter={(e) => onToolbarEnter(e, false)} className="p-2 rounded-lg text-text-primary transition-colors relative z-10" title="Notiz schließen">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact overflow popup */}
        {isCompact && !isInTrash && !isArchived && showOverflow && (
          <>
            <div className="fixed inset-0" onClick={() => setShowOverflow(false)} />
            <div ref={overflowPopupRef} className="absolute top-full left-10 mt-1 glass-popup rounded-xl shadow-xl p-2 z-50 flex gap-1" onMouseLeave={onOverflowLeave}>
              {overflowPill && (
                <div
                  className="glass-pill"
                  style={{ left: overflowPill.left, top: overflowPill.top, width: overflowPill.width, height: overflowPill.height }}
                />
              )}
              {folderButton((e) => onOverflowEnter(e, false))}
              {tagButton((e) => onOverflowEnter(e, false))}
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

      {/* Folder context menu — portal to document.body */}
      {folderMenuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setFolderMenuPos(null)} />
          <div
            ref={folderMenuRef}
            className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden z-[9999]"
            style={{ left: folderMenuPos.x, top: folderMenuPos.y, minWidth: '200px' }}
            onMouseLeave={onFolderLeave}
          >
            {folderPill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: folderPill.left, top: folderPill.top, width: folderPill.width, height: folderPill.height }}
              />
            )}
            <button
              onClick={() => handleMoveToFolder(null)}
              onMouseEnter={onFolderEnter}
              className="relative z-10 w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors text-text-primary"
            >
              <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" />
              <span className="flex-1 text-left text-text-secondary">Kein Ordner</span>
              {!note.folderId && <Check className="w-3 h-3 text-brand-primary flex-shrink-0" />}
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMoveToFolder(folder.id)}
                onMouseEnter={onFolderEnter}
                className={clsx(
                  'relative z-10 w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors',
                  note.folderId === folder.id ? 'text-brand-primary' : 'text-text-primary'
                )}
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: folder.color || '#10b981' }} />
                <span className="flex-1 text-left">{folder.name}</span>
                {note.folderId === folder.id && <Check className="w-3 h-3 text-brand-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

      {/* Tag context menu — portal to document.body */}
      {tagMenuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setTagMenuPos(null)} />
          <div
            ref={tagMenuRef}
            className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden z-[9999]"
            style={{ left: tagMenuPos.x, top: tagMenuPos.y, minWidth: '200px' }}
            onMouseLeave={onTagLeave}
          >
            {tagPill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: tagPill.left, top: tagPill.top, width: tagPill.width, height: tagPill.height }}
              />
            )}
            {tags.length === 0 ? (
              <div className="px-3 py-2 text-sm text-text-secondary italic">Keine Tags verfügbar</div>
            ) : tags.map((tag) => {
              const isSelected = note.tags?.some(t => t.id === tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  onMouseEnter={onTagEnter}
                  className="relative z-10 w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors text-text-primary"
                >
                  <TagIcon className="w-4 h-4 flex-shrink-0" style={{ color: tag.color }} />
                  <span className="flex-1 text-left">{tag.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-brand-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default NoteEditor;

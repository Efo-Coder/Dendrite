import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import TurndownService from 'turndown';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { getNoteTitle } from '../noteList/noteListUtils';
import { useGlassPill } from '../../hooks/useGlassPill';
import { Note } from '../../types';
import { useNoteStore } from '../../store/useNoteStore';
import { useFolderStore } from '../../store/useFolderStore';
import { useTagStore } from '../../store/useTagStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../ui/ToastContainer';
import RichTextToolbar from './RichTextToolbar';
import LexicalEditorWrapper from './LexicalEditorWrapper';
import ShareNoteModal from '../modals/ShareNoteModal';
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
  Maximize2,
  Minimize2,
  Info,
  Share2,
  Download,
  Printer,
  Copy,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import TagSelectionModal from '../modals/TagSelectionModal';
import Modal from '../modals/Modal';

interface NoteEditorProps {
  note: Note;
  onNoteUpdate?: () => void;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (dateOnly.getTime() === today.getTime()) return `Heute, ${timeStr}`;
  if (dateOnly.getTime() === yesterday.getTime()) return `Gestern, ${timeStr}`;
  return `${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${timeStr}`;
}

const NoteEditor = ({ note, onNoteUpdate }: NoteEditorProps) => {
  const { updateNote, deleteNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, setCurrentNote, setNoteTitleOptimistic } = useNoteStore();
  const { folders } = useFolderStore();
  const { tags } = useTagStore();
  const { user } = useAuthStore();
  const toast = useToast();

  const [title, setTitle] = useState(note.title ?? '');
  const titleRef = useRef(note.title ?? '');
  const lastSavedTitleRef = useRef(note.title ?? '');
  const titleAreaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  // contentRef is updated synchronously in handleContentChange (before React renders),
  // so save-on-switch always captures the latest Lexical content even if the React
  // state update hasn't been processed yet.
  const contentRef = useRef(note.content);
  const noteRef = useRef(note);
  // noteRef updated via useEffect (no deps) so it stays on the OLD note during the
  // switching-render's cleanup — the cleanup runs before this new effect fires.
  useEffect(() => { noteRef.current = note; });

  const handleContentChange = useCallback((html: string) => {
    contentRef.current = html;
    setContent(html);
  }, []);
  const [folderMenuPos, setFolderMenuPos] = useState<{ x: number; y: number; anchorTop: number } | null>(null);
  const [tagMenuPos, setTagMenuPos] = useState<{ x: number; y: number; anchorTop: number } | null>(null);
  const [exportMenuPos, setExportMenuPos] = useState<{ x: number; y: number; anchorTop: number } | null>(null);

  // Toolbar overflow
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [focusWritingMode, setFocusWritingMode] = useState(false);
  const [showToolbarTagModal, setShowToolbarTagModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const { pill: toolbarPill, onEnter: onToolbarEnter, onLeave: onToolbarLeave } = useGlassPill(toolbarRef);
  const overflowPopupRef = useRef<HTMLDivElement>(null);
  const { pill: overflowPill, onEnter: onOverflowEnter, onLeave: onOverflowLeave } = useGlassPill(overflowPopupRef);

  // Folder/Tag/Export context menu refs + pills
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { pill: folderPill, onEnter: onFolderEnter, onLeave: onFolderLeave } = useGlassPill(folderMenuRef);
  const { pill: tagPill, onEnter: onTagEnter, onLeave: onTagLeave } = useGlassPill(tagMenuRef);
  const { pill: exportPill, onEnter: onExportEnter, onLeave: onExportLeave } = useGlassPill(exportMenuRef);

  const focusExitWrapRef = useRef<HTMLDivElement>(null);
  const { pill: focusExitPill, onEnter: onFocusExitEnter, onLeave: onFocusExitLeave } = useGlassPill(focusExitWrapRef);

  useEffect(() => {
    if (!focusWritingMode) onFocusExitLeave();
  }, [focusWritingMode, onFocusExitLeave]);

  useEffect(() => {
    return () => {
      const currentContent = contentRef.current;
      const currentTitle = titleRef.current;
      const currentNote = noteRef.current;
      const updates: { content?: string; title?: string } = {};
      if (currentContent !== currentNote.content) updates.content = currentContent;
      if (currentTitle !== (currentNote.title ?? '')) updates.title = currentTitle;
      if (Object.keys(updates).length > 0) updateNote(currentNote.id, updates);
    };
  }, [note.id]);

  useEffect(() => {
    // Also reset refs so rapid switches don't carry stale data into the next cleanup.
    contentRef.current = note.content;
    setContent(note.content);
    titleRef.current = note.title ?? '';
    lastSavedTitleRef.current = note.title ?? '';
    setTitle(note.title ?? '');
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
        setExportMenuPos(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Combined auto-save: sends content + title together to avoid race conditions
  useEffect(() => {
    const timer = setTimeout(async () => {
      const shouldSaveContent = content !== note.content;
      const shouldSaveTitle = title !== lastSavedTitleRef.current;
      if (!shouldSaveContent && !shouldSaveTitle) return;
      const updates: { content?: string; title?: string } = {};
      if (shouldSaveContent) updates.content = content;
      if (shouldSaveTitle) updates.title = title;
      setIsSaving(true);
      try {
        await updateNote(note.id, updates);
        if (shouldSaveTitle) lastSavedTitleRef.current = title;
      } catch (error) {
        console.error('Fehler beim Speichern:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, title]);


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

  const downloadFile = (filename: string, data: string, mimeType: string) => {
    const blob = new Blob([data], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const makeTurndown = () => new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });

  const handleExportMarkdown = () => {
    const md = makeTurndown().turndown(content || '');
    downloadFile(`${title || 'Notiz'}.md`, `# ${title}\n\n${md}`, 'text/markdown');
    setExportMenuPos(null);
    toast.success('Markdown exportiert');
  };

  const handleExportHtml = () => {
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<title>${safeTitle}</title>\n<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}img{max-width:100%}</style>\n</head>\n<body>\n<h1>${safeTitle}</h1>\n${content}\n</body>\n</html>`;
    downloadFile(`${title || 'Notiz'}.html`, html, 'text/html');
    setExportMenuPos(null);
    toast.success('HTML exportiert');
  };

  const handlePrint = () => {
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${safeTitle}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}img{max-width:100%}@media print{body{margin:0}}</style></head><body><h1>${safeTitle}</h1>${content}</body></html>`);
    w.document.close();
    w.print();
    setExportMenuPos(null);
  };

  const handleCopyMarkdown = async () => {
    const md = makeTurndown().turndown(content || '');
    await navigator.clipboard.writeText(`# ${title}\n\n${md}`);
    toast.success('Markdown kopiert');
    setExportMenuPos(null);
  };

  const handleShare = async () => {
    const md = makeTurndown().turndown(content || '');
    const text = `${title}\n\n${md}`;
    if (navigator.share) {
      try { await navigator.share({ title, text }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('In Zwischenablage kopiert');
    }
    setExportMenuPos(null);
  };

  const openFolderMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTagMenuPos(null);
    setExportMenuPos(null);
    setFolderMenuPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4, anchorTop: rect.top });
  };

  const openTagMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFolderMenuPos(null);
    setExportMenuPos(null);
    setTagMenuPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4, anchorTop: rect.top });
  };

  const openExportMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFolderMenuPos(null);
    setTagMenuPos(null);
    setExportMenuPos(prev => prev ? null : { x: rect.right - 220, y: rect.bottom + 4, anchorTop: rect.top });
  };

  const MENU_MARGIN = 8;

  useLayoutEffect(() => {
    if (!folderMenuPos || !folderMenuRef.current) return;
    const menu = folderMenuRef.current;
    const { width, height } = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const finalY = folderMenuPos.y + height > vh - MENU_MARGIN
      ? Math.max(MENU_MARGIN, folderMenuPos.anchorTop - height - 4)
      : folderMenuPos.y;
    const finalX = folderMenuPos.x + width > vw - MENU_MARGIN
      ? Math.max(MENU_MARGIN, vw - MENU_MARGIN - width)
      : folderMenuPos.x;
    menu.style.top  = `${finalY}px`;
    menu.style.left = `${finalX}px`;
  }, [folderMenuPos]);

  useLayoutEffect(() => {
    if (!tagMenuPos || !tagMenuRef.current) return;
    const menu = tagMenuRef.current;
    const { width, height } = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const finalY = tagMenuPos.y + height > vh - MENU_MARGIN
      ? Math.max(MENU_MARGIN, tagMenuPos.anchorTop - height - 4)
      : tagMenuPos.y;
    const finalX = tagMenuPos.x + width > vw - MENU_MARGIN
      ? Math.max(MENU_MARGIN, vw - MENU_MARGIN - width)
      : tagMenuPos.x;
    menu.style.top  = `${finalY}px`;
    menu.style.left = `${finalX}px`;
  }, [tagMenuPos]);

  useLayoutEffect(() => {
    if (!exportMenuPos || !exportMenuRef.current) return;
    const menu = exportMenuRef.current;
    const { width, height } = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const finalY = exportMenuPos.y + height > vh - MENU_MARGIN
      ? Math.max(MENU_MARGIN, exportMenuPos.anchorTop - height - 4)
      : exportMenuPos.y;
    const finalX = exportMenuPos.x + width > vw - MENU_MARGIN
      ? Math.max(MENU_MARGIN, vw - MENU_MARGIN - width)
      : Math.max(MENU_MARGIN, exportMenuPos.x);
    menu.style.top  = `${finalY}px`;
    menu.style.left = `${finalX}px`;
  }, [exportMenuPos]);

  const isInTrash = note.isDeleted;
  const isArchived = note.isArchived && !note.isDeleted;

  const currentFolder = note.folderId ? folders.find(f => f.id === note.folderId) : null;

  const titleHeader = (
    <div className="mb-1 mt-4">
      <textarea
        ref={titleAreaRef}
        value={title}
        onChange={(e) => {
          const v = e.target.value;
          titleRef.current = v;
          setTitle(v);
          setNoteTitleOptimistic(note.id, v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (document.querySelector('.editor-input') as HTMLElement | null)?.focus();
          }
        }}
        placeholder="Titel..."
        disabled={isInTrash}
        rows={1}
        spellCheck
        className="w-full bg-transparent border-none outline-none resize-none overflow-hidden disabled:opacity-60 placeholder:opacity-40"
        style={{
          fontSize: '3em',
          fontWeight: 500,
          lineHeight: 1.2,
          height: '1.2em',
          fontFamily: 'var(--font-display), "IBM Plex Serif", Georgia, serif',
          color: 'var(--color-text-primary)',
          padding: 0,
          margin: 0,
        }}
      />
      <div className="flex h-4 items-center gap-1.5 mt-1 mb-4 select-none text-[0.95rem] leading-none" style={{ color: 'color-mix(in srgb, var(--color-text-muted) 90%, transparent)' }}>
        {currentFolder && (
          <>
            <FolderOpen className="w-3 h-3 flex-shrink-0" style={{ color: currentFolder.color || undefined }} />
            <span style={{ color: currentFolder.color || undefined }}>{currentFolder.name}</span>
            <span className="opacity-50 mx-0.5">·</span>
          </>
        )}
        <span>{formatRelativeDate(note.updatedAt)}</span>
      </div>
    </div>
  );

  // Reusable button renderers (just the trigger, menu rendered via portal)
  const folderButton = (enterFn?: (e: React.MouseEvent<HTMLButtonElement>) => void) => (
    <button
      onClick={openFolderMenu}
      onMouseEnter={enterFn}
      className={clsx(
        'icon-btn-md rounded-lg transition-colors relative z-10',
        folderMenuPos ? 'text-text-primary' : ''
      )}
      title="Verschieben in Ordner"
    >
      <FolderOpen className="w-4 h-4" />
    </button>
  );

  const tagButton = (enterFn?: (e: React.MouseEvent<HTMLButtonElement>) => void) => (
    <button
      onClick={openTagMenu}
      onMouseEnter={enterFn}
      className={clsx(
        'icon-btn-md rounded-lg transition-colors relative z-10',
        tagMenuPos ? 'text-brand-primary' : ''
      )}
      title="Tag hinzufügen"
    >
      <TagIcon className="w-4 h-4" />
    </button>
  );

  const handleToolbarTags = async (tagIds: string[]) => {
    try {
      await updateNote(note.id, { tags: tagIds });
      toast.info('Tags aktualisiert');
      if (onNoteUpdate) onNoteUpdate();
    } catch {
      toast.error('Fehler beim Aktualisieren der Tags');
    }
    setShowToolbarTagModal(false);
  };

  return (
    <div className={clsx('relative flex h-full flex-col bg-transparent', focusWritingMode && 'bg-transparent')}>
      <div
        className={clsx(
          'relative z-10 transition-all duration-500 ease-out',
          focusWritingMode ? 'max-h-0 overflow-hidden opacity-0 pointer-events-none' : 'max-h-16 overflow-visible opacity-100'
        )}
      >
        <div
          ref={toolbarRef}
          className="relative flex h-11 items-center justify-between bg-transparent px-6 sm:px-12"
          onMouseLeave={onToolbarLeave}
        >
          {toolbarPill && (
            <div
              className="glass-pill"
              style={{ left: toolbarPill.left, top: toolbarPill.top, width: toolbarPill.width, height: toolbarPill.height, opacity: toolbarPill.visible ? 1 : 0 }}
            />
          )}
          {/* Left side */}
          <div className="flex items-center gap-1">
            {!isInTrash && !isArchived && (
              <>
                <button
                  onClick={async () => { await togglePin(note.id); toast.success(note.isPinned ? 'Anheften entfernt' : 'Notiz angeheftet'); }}
                  onMouseEnter={(e) => onToolbarEnter(e, note.isPinned)}
                  className={clsx(
                    'icon-btn-md rounded-lg transition-colors relative z-10',
                    note.isPinned ? 'text-brand-primary' : ''
                  )}
                  title="Notiz anheften"
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => { await toggleFavorite(note.id); toast.info(note.isFavorite ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt'); }}
                  onMouseEnter={(e) => onToolbarEnter(e, false)}
                  className={clsx(
                    'icon-btn-md rounded-lg transition-colors relative z-10',
                    note.isFavorite ? 'text-yellow-500' : ''
                  )}
                  title="Zu Favoriten hinzufügen"
                >
                  <Star className="w-4 h-4" />
                </button>
                <button
                  onClick={handleArchive}
                  onMouseEnter={(e) => onToolbarEnter(e, false)}
                  className="icon-btn-md rounded-lg transition-colors relative z-10"
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
                      'icon-btn-md rounded-lg transition-colors flex-shrink-0 mr-2 relative z-10',
                      showOverflow ? 'text-brand-primary' : ''
                    )}
                    title="Weitere Optionen"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            {isArchived && (
              <button onClick={handleRestore} onMouseEnter={(e) => onToolbarEnter(e, false)} className="icon-btn-md rounded-lg transition-colors relative z-10" title="Aus Archiv wiederherstellen">
                <ArchiveRestore className="w-4 h-4" />
              </button>
            )}
            {isInTrash && (
              <button onClick={handleRestore} onMouseEnter={(e) => onToolbarEnter(e, false)} className="icon-btn-md rounded-lg transition-colors relative z-10" title="Wiederherstellen">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            
            {!isInTrash && (
              <div className="flex items-center space-x-2 text-sm text-text-muted min-w-0 mr-10">
                {!isNarrow && (
                  <span className="truncate flex items-center gap-1">
                    {isSaving ? (
                      <>
                        <Clock className="w-4 h-4 flex-shrink-0 text-brand-primary" />
                        Wird gespeichert...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 flex-shrink-0 text-brand-primary" />
                        Gespeichert
                      </>
                    )}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={openExportMenu}
              onMouseEnter={(e) => onToolbarEnter(e, !!exportMenuPos)}
              className={clsx(
                'icon-btn-md rounded-lg transition-colors relative z-10',
                exportMenuPos ? 'text-brand-primary' : ''
              )}
              title="Exportieren / Teilen"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {!isInTrash && (
              <button
                type="button"
                onClick={() => setFocusWritingMode((v) => !v)}
                onMouseEnter={(e) => onToolbarEnter(e, false)}
                className="icon-btn-md rounded-lg transition-colors relative z-10"
                title={focusWritingMode ? 'Fokusmodus beenden' : 'Fokusmodus'}
              >
                {focusWritingMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleDelete}
              onMouseEnter={(e) => onToolbarEnter(e, false)}
              className="icon-btn-md rounded-lg transition-colors relative z-10 text-text-secondary hover:text-red-500"
              title={isInTrash ? 'Endgültig löschen' : 'In Papierkorb'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={handleClose} onMouseEnter={(e) => onToolbarEnter(e, false)} className="icon-btn-md rounded-lg transition-colors relative z-10" title="Notiz schließen">
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
                  style={{ left: overflowPill.left, top: overflowPill.top, width: overflowPill.width, height: overflowPill.height, opacity: overflowPill.visible ? 1 : 0 }}
                />
              )}
              {folderButton((e) => onOverflowEnter(e, false))}
              {tagButton((e) => onOverflowEnter(e, false))}
            </div>
          </>
        )}
      </div>

      <div
        ref={focusExitWrapRef}
        className={clsx(
          'absolute right-6 top-3 z-[60] sm:right-12 transition-[opacity,transform] duration-500 ease-out',
          focusWritingMode ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        onMouseLeave={onFocusExitLeave}
      >
        {focusExitPill && (
          <div
            className="glass-pill glass-pill-circle pointer-events-none"
            style={{
              left: focusExitPill.left,
              top: focusExitPill.top,
              width: focusExitPill.width,
              height: focusExitPill.height,
              opacity: focusExitPill.visible ? 1 : 0,
            }}
          />
        )}
        <button
          type="button"
          onClick={() => setFocusWritingMode(false)}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                onFocusExitEnter({ currentTarget: btn } as unknown as React.MouseEvent<HTMLButtonElement>, false);
              });
            });
          }}
          onTransitionEnd={(e) => {
            if (!focusWritingMode || e.propertyName !== 'opacity') return;
            const btn = e.currentTarget;
            if (btn.matches(':hover')) {
              onFocusExitEnter({ currentTarget: btn } as unknown as React.MouseEvent<HTMLButtonElement>, false);
            }
          }}
          className={clsx(
            'relative z-10 font-medium rounded-full border border-[color-mix(in_srgb,var(--color-border-default)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-bg-elevated)_58%,transparent)] px-3 py-1.5 text-sm shadow-lg transition-[opacity,transform,color] duration-500 ease-out',
            focusWritingMode ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
          )}
          aria-hidden={!focusWritingMode}
          tabIndex={focusWritingMode ? 0 : -1}
        >
          Fokus beenden
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${note.id}-${shareToken ?? 'none'}`}
          className="min-h-0 flex-1 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: 'easeInOut' }}
        >
          <LexicalEditorWrapper
            content={note.content}
            onChange={handleContentChange}
            placeholder="Beginne zu schreiben..."
            disabled={isInTrash}
            headerSlot={titleHeader}
            collaboration={shareToken ? {
              noteId: note.id,
              token: shareToken,
              username: user?.name || user?.email || 'Anonym',
              cursorColor: 'var(--color-brand-primary)',
            } : null}
            toolbar={
              <RichTextToolbar
                disabled={isInTrash}
                noteId={note.id}
                minimalChrome={focusWritingMode}
                onManageTags={isInTrash ? undefined : () => setShowToolbarTagModal(true)}
                onInfo={isInTrash ? undefined : () => setShowInfoModal(true)}
              />
            }
          />
        </motion.div>
      </AnimatePresence>

      {/* Folder context menu — portal to document.body */}
      {folderMenuPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setFolderMenuPos(null)} />
          <div
            ref={folderMenuRef}
            className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden"
            style={{ left: folderMenuPos.x, top: folderMenuPos.y, minWidth: '200px' }}
            onMouseLeave={onFolderLeave}
          >
            {folderPill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: folderPill.left, top: folderPill.top, width: folderPill.width, height: folderPill.height, opacity: folderPill.visible ? 1 : 0 }}
              />
            )}
            <button
              onClick={() => handleMoveToFolder(null)}
              onMouseEnter={onFolderEnter}
              className={clsx(
                'relative z-10 w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors',
                !note.folderId ? 'text-text-primary' : ''
              )}
            >
              <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" />
              <span className="flex-1 text-left">Kein Ordner</span>
              {!note.folderId && <Check className="w-3 h-3 text-brand-primary flex-shrink-0" />}
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMoveToFolder(folder.id)}
                onMouseEnter={onFolderEnter}
                className={clsx(
                  'relative z-10 w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors',
                  note.folderId === folder.id ? 'text-text-primary' : ''
                )}
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: folder.color || '#10b981' }} />
                <span className="flex-1 text-left">{folder.name}</span>
                {note.folderId === folder.id && <Check className="w-3 h-3 text-brand-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        </>,
        getModalPortalRoot()
      )}

      {/* Tag context menu — portal to document.body */}
      <TagSelectionModal
        isOpen={showToolbarTagModal}
        onClose={() => setShowToolbarTagModal(false)}
        onUpdateTags={handleToolbarTags}
        currentTagIds={note.tags?.map((t) => t.id) || []}
      />

      <ShareNoteModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        noteId={note.id}
        onShareChange={setShareToken}
      />

      <Modal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} title={getNoteTitle(note) || 'Notiz'}>
        <div className="text-base text-text-secondary">
          <p className="flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-[6px] text-brand-primary" />
            <span>
              Erstellt: {new Date(note.createdAt).toLocaleString('de-DE')}
              <br />
              Zuletzt bearbeitet: {new Date(note.updatedAt).toLocaleString('de-DE')}
            </span>
          </p>
        </div>
      </Modal>

      {exportMenuPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setExportMenuPos(null)} />
          <div
            ref={exportMenuRef}
            className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden"
            style={{ left: exportMenuPos.x, top: exportMenuPos.y, minWidth: '220px' }}
            onMouseLeave={onExportLeave}
          >
            {exportPill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: exportPill.left, top: exportPill.top, width: exportPill.width, height: exportPill.height, opacity: exportPill.visible ? 1 : 0 }}
              />
            )}
            <button
              onClick={() => { setShowShareModal(true); setExportMenuPos(null); }}
              onMouseEnter={onExportEnter}
              className="relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
            >
              <Users className="w-4 h-4 flex-shrink-0 text-brand-primary" />
              <span className="flex-1 text-left">
                Notiz teilen
                {shareToken && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-primary align-middle" />}
              </span>
            </button>
            <div className="my-1 mx-2 border-t border-[color-mix(in_srgb,var(--color-border-default)_50%,transparent)]" />
            <button onClick={handleExportMarkdown} onMouseEnter={onExportEnter} className="relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors">
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Als Markdown exportieren</span>
            </button>
            <button onClick={handleExportHtml} onMouseEnter={onExportEnter} className="relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors">
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Als HTML exportieren</span>
            </button>
            <button onClick={handlePrint} onMouseEnter={onExportEnter} className="relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors">
              <Printer className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Drucken / Als PDF</span>
            </button>
            <div className="my-1 mx-2 border-t border-[color-mix(in_srgb,var(--color-border-default)_50%,transparent)]" />
            <button onClick={handleCopyMarkdown} onMouseEnter={onExportEnter} className="relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors">
              <Copy className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Markdown kopieren</span>
            </button>
            <button onClick={handleShare} onMouseEnter={onExportEnter} className="relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors">
              <Share2 className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Teilen</span>
            </button>
          </div>
        </>,
        getModalPortalRoot()
      )}

      {tagMenuPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setTagMenuPos(null)} />
          <div
            ref={tagMenuRef}
            className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden"
            style={{ left: tagMenuPos.x, top: tagMenuPos.y, minWidth: '200px' }}
            onMouseLeave={onTagLeave}
          >
            {tagPill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: tagPill.left, top: tagPill.top, width: tagPill.width, height: tagPill.height, opacity: tagPill.visible ? 1 : 0 }}
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
                  className={clsx(
                    'relative z-10 w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors',
                    isSelected ? 'text-text-primary' : ''
                  )}
                >
                  <TagIcon className="w-4 h-4 flex-shrink-0" style={{ color: tag.color }} />
                  <span className="flex-1 text-left">{tag.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-brand-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </>,
        getModalPortalRoot()
      )}
    </div>
  );
};

export default NoteEditor;

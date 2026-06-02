import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useMagicHover } from '../../hooks/useMagicHover';
import TurndownService from 'turndown';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { getNoteTitle } from '../noteList/noteListUtils';
import { Note } from '../../types';
import { useNoteStore } from '../../store/useNoteStore';
import { useFolderStore } from '../../store/useFolderStore';
import { useTagStore } from '../../store/useTagStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../ui/ToastContainer';
import RichTextToolbar from './RichTextToolbar';
import LexicalEditorWrapper from './LexicalEditorWrapper';
import ShareNoteModal from '../modals/ShareNoteModal';
import { Icons } from '../ui/Icons';
import {
  Pin,
  Trash2,
  FolderOpen,
  Tag as TagIcon,
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
  PanelLeft,
} from 'lucide-react';
import clsx from 'clsx';
import TagSelectionModal from '../modals/TagSelectionModal';
import Modal from '../modals/Modal';

interface NoteEditorProps {
  note: Note;
  onNoteUpdate?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (dateOnly.getTime() === today.getTime()) return `Today, ${timeStr}`;
  if (dateOnly.getTime() === yesterday.getTime()) return `Yesterday, ${timeStr}`;
  return `${date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${timeStr}`;
}

const NoteEditor = ({ note, onNoteUpdate, onToggleSidebar, sidebarCollapsed }: NoteEditorProps) => {
  const { updateNote, deleteNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, setCurrentNote, setNoteTitleOptimistic } = useNoteStore();
  const { folders } = useFolderStore();
  const { tags, createTag } = useTagStore();
  const { user } = useAuthStore();
  const toast = useToast();

  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

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
    setIsSaving(true);
  }, []);
  const [folderMenuPos, setFolderMenuPos] = useState<{ x: number; y: number; anchorTop: number } | null>(null);
  const [tagMenuPos, setTagMenuPos] = useState<{ x: number; y: number; anchorTop: number } | null>(null);
  const [exportMenuPos, setExportMenuPos] = useState<{ x: number; y: number; anchorTop: number } | null>(null);

  // Toolbar overflow
  const toolbarRef = useRef<HTMLDivElement>(null);
  const leftGroupRef = useRef<HTMLDivElement>(null);
  const rightGroupRef = useRef<HTMLDivElement>(null);
  const { onItemEnter: onLeftEnter, onItemLeave: onLeftLeave, Indicator: LeftIndicator } = useMagicHover({ mode: 'free', background: 'var(--surface-hi)', borderRadius: 8, ref: leftGroupRef });
  const { onItemEnter: onRightEnter, onItemLeave: onRightLeave, Indicator: RightIndicator } = useMagicHover({ mode: 'free', background: 'var(--surface-hi)', borderRadius: 8, ref: rightGroupRef });
  const [isCompact, setIsCompact] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [focusWritingMode, setFocusWritingMode] = useState(false);
  const [showExitBtn, setShowExitBtn] = useState(false);
  const exitBtnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorMouseMove = useCallback(() => {
    if (!focusWritingMode) return;
    setShowExitBtn(true);
    if (exitBtnTimerRef.current) clearTimeout(exitBtnTimerRef.current);
    exitBtnTimerRef.current = setTimeout(() => setShowExitBtn(false), 2000);
  }, [focusWritingMode]);

  useEffect(() => {
    if (focusWritingMode) {
      setShowExitBtn(true);
      exitBtnTimerRef.current = setTimeout(() => setShowExitBtn(false), 2000);
    } else {
      setShowExitBtn(false);
      if (exitBtnTimerRef.current) clearTimeout(exitBtnTimerRef.current);
    }
  }, [focusWritingMode]);
  const [showToolbarTagModal, setShowToolbarTagModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const overflowPopupRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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
      if (!shouldSaveContent && !shouldSaveTitle) { setIsSaving(false); return; }
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
    }, 700);
    return () => clearTimeout(timer);
  }, [content, title]);


  const handleMoveToFolder = async (folderId: string | null) => {
    try {
      await updateNote(note.id, { folderId });
      setFolderMenuPos(null);
      toast.info('Note moved');
      if (onNoteUpdate) onNoteUpdate();
    } catch (error) {
      toast.error('Error moving note');
    }
  };

  const handleToggleTag = async (tagId: string) => {
    const currentTagIds = note.tags?.map(t => t.id) || [];
    const isAdding = !currentTagIds.includes(tagId);
    if (isAdding && currentTagIds.length >= 4) { toast.error('Maximum 4 tags per note'); return; }
    const newTagIds = isAdding
      ? [...currentTagIds, tagId]
      : currentTagIds.filter(id => id !== tagId);

    try {
      await updateNote(note.id, { tags: newTagIds });
      toast.info('Tags updated');
      if (onNoteUpdate) onNoteUpdate();
    } catch (error) {
      toast.error('Error updating tags');
    }
  };

  const submitInlineTagWithName = async (name: string) => {
    const cleanName = name.trim().replace(/^#/, '');
    setNewTag('');
    setAddingTag(false);
    setActiveSuggestion(-1);
    if (!cleanName) return;
    if (cleanName.length > 20) { toast.error('Tag name must be 20 characters or fewer'); return; }
    try {
      const existing = tags.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
      const tagId = existing ? existing.id : (await createTag({ name: cleanName })).id;
      const currentTagIds = note.tags?.map(t => t.id) || [];
      if (!currentTagIds.includes(tagId)) {
        if (currentTagIds.length >= 4) { toast.error('Maximum 4 tags per note'); return; }
        await updateNote(note.id, { tags: [...currentTagIds, tagId] });
        if (onNoteUpdate) onNoteUpdate();
      }
    } catch {
      toast.error('Error adding tag');
    }
  };

  const submitInlineTag = () => submitInlineTagWithName(newTag);

  const handleDelete = async () => {
    if (note.isDeleted) {
      try {
        await deleteNote(note.id);
        setCurrentNote(null);
        toast.error('Note permanently deleted');
        if (onNoteUpdate) onNoteUpdate();
      } catch (error) {
        toast.error('Error deleting note');
      }
    } else {
      try {
        await toggleTrash(note.id);
        setCurrentNote(null);
        toast.error('Note deleted');
        if (onNoteUpdate) onNoteUpdate();
      } catch (error) {
        toast.error('Error deleting note');
      }
    }
  };

  const handleArchive = async () => {
    try {
      await toggleArchive(note.id);
      toast.info('Note archived');
      if (onNoteUpdate) onNoteUpdate();
    } catch (error) {
      toast.error('Error archiving note');
    }
  };

  const handleRestore = async () => {
    try {
      if (note.isDeleted) {
        await toggleTrash(note.id);
        toast.success('Note restored');
      } else if (note.isArchived) {
        await toggleArchive(note.id);
        toast.success('Note unarchived');
      }
      if (onNoteUpdate) onNoteUpdate();
    } catch (error) {
      toast.error('Error restoring note');
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
    downloadFile(`${title || 'Note'}.md`, `# ${title}\n\n${md}`, 'text/markdown');
    setExportMenuPos(null);
    toast.success('Markdown exported');
  };

  const handleExportHtml = () => {
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<title>${safeTitle}</title>\n<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}img{max-width:100%}</style>\n</head>\n<body>\n<h1>${safeTitle}</h1>\n${content}\n</body>\n</html>`;
    downloadFile(`${title || 'Note'}.html`, html, 'text/html');
    setExportMenuPos(null);
    toast.success('HTML exported');
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
    toast.success('Markdown copied');
    setExportMenuPos(null);
  };

  const handleShare = async () => {
    const md = makeTurndown().turndown(content || '');
    const text = `${title}\n\n${md}`;
    if (navigator.share) {
      try { await navigator.share({ title, text }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
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
    <>
      <div className="editor-meta">
        {currentFolder && <span className="editor-breadcrumb">{currentFolder.name}</span>}
        {currentFolder && <span className="editor-sep" />}
        <span>{formatRelativeDate(note.updatedAt)}</span>
        {!isInTrash && (
          <span className="editor-save-status">
            {isSaving
              ? <><span className="editor-save-dot" style={{ background: 'var(--ink-dim)', boxShadow: 'none' }} /> Saving…</>
              : <><span className="editor-save-dot" /> Saved</>
            }
          </span>
        )}
      </div>
      <textarea
        ref={titleAreaRef}
        value={title}
        onChange={(e) => {
          const v = e.target.value;
          titleRef.current = v;
          setTitle(v);
          setNoteTitleOptimistic(note.id, v);
          setIsSaving(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (document.querySelector('.editor-input') as HTMLElement | null)?.focus();
          }
        }}
        placeholder="Untitled"
        disabled={isInTrash}
        rows={1}
        spellCheck
        className="editor-title"
        style={{ height: 'auto', opacity: isInTrash ? 0.6 : 1 }}
      />
      <div className="editor-byline">
        <div className="editor-tags">
          {note.tags?.map(t => (
            <span key={t.id} className="editor-tag" style={(() => { const live = tags.find(x => x.id === t.id); const c = live?.color ?? t.color; return { color: c, borderColor: `color-mix(in srgb, ${c} 35%, transparent)`, background: `color-mix(in srgb, ${c} 8%, transparent)` }; })()}>
              {t.name}
              {!isInTrash && (
                <span className="tag-remove" onClick={() => handleToggleTag(t.id)}>×</span>
              )}
            </span>
          ))}
{!isInTrash && (note.tags?.length ?? 0) < 4 && (
            addingTag ? (() => {
              const tagSuggestions = newTag.length > 0
                ? tags.filter(t =>
                    !note.tags?.some(nt => nt.id === t.id) &&
                    t.name.toLowerCase().startsWith(newTag.toLowerCase())
                  )
                : [];
              return (
                <div className="editor-tag-wrapper">
                  <input
                    autoFocus
                    className="editor-tag-input"
                    value={newTag}
                    maxLength={20}
                    onChange={e => { setNewTag(e.target.value); setActiveSuggestion(-1); }}
                    onBlur={submitInlineTag}
                    onKeyDown={e => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActiveSuggestion(i => Math.min(i + 1, tagSuggestions.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActiveSuggestion(i => Math.max(i - 1, -1));
                      } else if (e.key === 'Tab' && tagSuggestions.length > 0) {
                        e.preventDefault();
                        setNewTag(tagSuggestions[0].name);
                        setActiveSuggestion(-1);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (activeSuggestion >= 0 && tagSuggestions[activeSuggestion]) {
                          submitInlineTagWithName(tagSuggestions[activeSuggestion].name);
                        } else {
                          submitInlineTag();
                        }
                      } else if (e.key === 'Escape') {
                        setAddingTag(false);
                        setNewTag('');
                        setActiveSuggestion(-1);
                      }
                    }}
                  />
                  {tagSuggestions.length > 0 && (
                    <div className="editor-tag-suggestions">
                      {tagSuggestions.map((tag, i) => (
                        <button
                          key={tag.id}
                          tabIndex={-1}
                          className={clsx('editor-tag-suggestion', i === activeSuggestion && 'active')}
                          onMouseDown={e => {
                            e.preventDefault();
                            submitInlineTagWithName(tag.name);
                          }}
                        >
                          <TagIcon style={{ width: 10, height: 10, color: tag.color, flexShrink: 0 }} />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : (
              <button type="button" className="editor-tag-add" onClick={() => setAddingTag(true)}>
                + Add tag
              </button>
            )
          )}
        </div>
      </div>
    </>
  );

  // Reusable button renderers (just the trigger, menu rendered via portal)
  const folderButton = () => (
    <button
      onClick={openFolderMenu}
      onMouseEnter={onLeftEnter} onMouseLeave={onLeftLeave}
      className={clsx(
        'icon-btn-md rounded-lg transition-colors',
        folderMenuPos ? 'text-(--ink)' : ''
      )}
      title="Move to folder"
    >
      <FolderOpen className="w-4 h-4" />
    </button>
  );

  const tagButton = () => (
    <button
      onClick={openTagMenu}
      onMouseEnter={onLeftEnter} onMouseLeave={onLeftLeave}
      className={clsx(
        'icon-btn-md rounded-lg transition-colors',
        tagMenuPos ? 'text-(--accent)' : ''
      )}
      title="Add tag"
    >
      <TagIcon className="w-4 h-4" />
    </button>
  );

  const handleToolbarTags = async (tagIds: string[]) => {
    try {
      await updateNote(note.id, { tags: tagIds });
      toast.info('Tags updated');
      if (onNoteUpdate) onNoteUpdate();
    } catch {
      toast.error('Error updating tags');
    }
    setShowToolbarTagModal(false);
  };

  return (
    <motion.div
      className="relative h-full flex flex-col bg-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onMouseMove={handleEditorMouseMove}
    >
      <motion.div
        className={clsx(
          'relative z-10 transition-[max-height,opacity] duration-500 ease-out pt-4.5',
          focusWritingMode ? 'max-h-0 overflow-hidden opacity-0 pointer-events-none' : 'max-h-15.5 overflow-visible opacity-100'
        )}
        initial={{ y: 6 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
            <div
              ref={toolbarRef}
              className="relative flex h-11 items-center justify-between bg-transparent px-6 sm:px-12 pb-5"
            >
              {/* Left side */}
              <div ref={leftGroupRef} className="relative flex items-center gap-1 magic-hover">
                {LeftIndicator}
                {onToggleSidebar && (
                  <button
                    type="button"
                    onClick={onToggleSidebar}
                    onMouseEnter={onLeftEnter} onMouseLeave={onLeftLeave}
                    className={clsx('icon-btn-md rounded-lg transition-colors', sidebarCollapsed && 'text-(--accent)')}
                    title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                )}
                {!isInTrash && !isArchived && (
                  <>
                    <button
                      onClick={async () => { await togglePin(note.id); toast.success(note.isPinned ? 'Unpinned' : 'Note pinned'); }}
                      onMouseEnter={onLeftEnter} onMouseLeave={onLeftLeave}
                      className={clsx(
                        'icon-btn-md rounded-lg transition-colors',
                        note.isPinned ? 'text-(--accent)' : ''
                      )}
                      title="Pin note"
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => { await toggleFavorite(note.id); toast.info(note.isFavorite ? 'Removed from favorites' : 'Added to favorites'); }}
                      onMouseEnter={onLeftEnter} onMouseLeave={onLeftLeave}
                      className="icon-btn-md rounded-lg transition-colors"
                      style={note.isFavorite ? { color: 'var(--accent)' } : undefined}
                      title="Add to favorites"
                    >
                      {note.isFavorite ? <Icons.starFill size={16} /> : <Icons.star size={16} />}
                    </button>
                    <button
                      onClick={handleArchive}
                      onMouseEnter={onLeftEnter} onMouseLeave={onLeftLeave}
                      className="icon-btn-md rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>

                    {!isCompact ? (
                      <>
                        {folderButton()}
                        {tagButton()}
                      </>
                    ) : (
                      <button
                        onClick={() => setShowOverflow(v => !v)}
                        onMouseEnter={onLeftEnter} onMouseLeave={onLeftLeave}
                        className={clsx(
                          'icon-btn-md rounded-lg transition-colors shrink-0 mr-2',
                          showOverflow ? 'text-(--accent)' : ''
                        )}
                        title="More options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}

                {isArchived && (
                  <button onClick={handleRestore} onMouseEnter={onLeftEnter} onMouseLeave={onLeftLeave} className="icon-btn-md rounded-lg transition-colors" title="Restore from archive">
                    <ArchiveRestore className="w-4 h-4" />
                  </button>
                )}
                {isInTrash && (
                  <button onClick={handleRestore} onMouseEnter={onLeftEnter} onMouseLeave={onLeftLeave} className="icon-btn-md rounded-lg transition-colors" title="Restore">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div ref={rightGroupRef} className="relative flex items-center gap-1 magic-hover">
                {RightIndicator}
                {!isInTrash && (
                  <button
                    onClick={openExportMenu}
                    onMouseEnter={onRightEnter} onMouseLeave={onRightLeave}
                    className={clsx(
                      'icon-btn-md rounded-lg transition-colors',
                      exportMenuPos ? 'text-(--accent)' : ''
                    )}
                    title="Export / Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  onMouseEnter={onRightEnter} onMouseLeave={onRightLeave}
                  className="icon-btn-md rounded-lg hover:text-red-500"
                  title={isInTrash ? 'Delete permanently' : 'Move to trash'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={handleClose} onMouseEnter={onRightEnter} onMouseLeave={onRightLeave} className="icon-btn-md rounded-lg transition-colors" title="Close note">
                  <X className="w-4 h-4" />
                </button>
                {!isInTrash && (
                  <button
                    type="button"
                    onClick={() => setFocusWritingMode((v) => !v)}
                    onMouseEnter={onRightEnter} onMouseLeave={onRightLeave}
                    className="icon-btn-md rounded-lg transition-colors"
                    title="Focus mode"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Compact overflow popup */}
            {isCompact && !isInTrash && !isArchived && showOverflow && (
              <>
                <div className="fixed inset-0" onClick={() => setShowOverflow(false)} />
                <div ref={overflowPopupRef} className="absolute top-full left-10 mt-1 glass-popup rounded-xl shadow-xl p-2 z-50 flex gap-1">
                  {folderButton()}
                  {tagButton()}
                </div>
              </>
            )}
      </motion.div>

      <div
        className={clsx(
          'absolute top-3.75 z-60 sm:right-12 transition-[opacity,transform] duration-500 ease-out',
              focusWritingMode ? 'pointer-events-auto' : 'pointer-events-none'
            )}
          >
            <button
              type="button"
              onClick={() => setFocusWritingMode(false)}
              className={clsx(
                'font-medium rounded-full border border-[color-mix(in_srgb,var(--line)_50%,transparent)] bg-[color-mix(in_srgb,var(--surface-hi)_58%,transparent)] p-2 shadow-lg transition-opacity duration-300 ease-out hover:bg-(--surface-hi)',
                showExitBtn ? 'opacity-100' : 'opacity-0'
              )}
              aria-hidden={!focusWritingMode}
              tabIndex={focusWritingMode ? 0 : -1}
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <LexicalEditorWrapper
            content={note.content}
            onChange={handleContentChange}
            placeholder="Start writing..."
            disabled={isInTrash}
            headerSlot={titleHeader}
            collaboration={shareToken ? {
              noteId: note.id,
              token: shareToken,
              username: user?.name || user?.email || 'Anonymous',
              cursorColor: 'var(--accent)',
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

      {/* Folder context menu — portal to document.body */}
      {folderMenuPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setFolderMenuPos(null)} />
          <div
            ref={folderMenuRef}
            className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden"
            style={{ left: folderMenuPos.x, top: folderMenuPos.y, minWidth: '200px' }}
          >
            <button
              onClick={() => handleMoveToFolder(null)}
              className={clsx(
                'w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)',
                !note.folderId ? 'text-(--ink)' : ''
              )}
            >
              <FolderOpen className="w-4 h-4 text-(--ink-mid) shrink-0" />
              <span className="flex-1 text-left">No folder</span>
              {!note.folderId && <Check className="w-3 h-3 text-(--accent) shrink-0" />}
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMoveToFolder(folder.id)}
                className={clsx(
                  'w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)',
                  note.folderId === folder.id ? 'text-(--ink)' : ''
                )}
              >
                <FolderOpen className="w-4 h-4 shrink-0" style={{ color: folder.color || '#10b981' }} />
                <span className="flex-1 text-left">{folder.name}</span>
                {note.folderId === folder.id && <Check className="w-3 h-3 text-(--accent) shrink-0" />}
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

      <Modal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} title={getNoteTitle(note) || 'Note'}>
        <div className="text-base text-(--ink-mid)">
          <p className="flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-1.5 text-(--accent)" />
            <span>
              Created: {new Date(note.createdAt).toLocaleString(undefined)}
              <br />
              Last edited: {new Date(note.updatedAt).toLocaleString(undefined)}
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
          >
            <button
              onClick={() => { setShowShareModal(true); setExportMenuPos(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)"
            >
              <Users className="w-4 h-4 shrink-0 text-(--accent)" />
              <span className="flex-1 text-left">
                Share note
                {shareToken && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-(--accent) align-middle" />}
              </span>
            </button>
            <div className="my-1 mx-2 border-t border-[color-mix(in_srgb,var(--line)_50%,transparent)]" />
            <button onClick={handleExportMarkdown} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)">
              <Download className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Export as Markdown</span>
            </button>
            <button onClick={handleExportHtml} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)">
              <Download className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Export as HTML</span>
            </button>
            <button onClick={handlePrint} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)">
              <Printer className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Print / Save as PDF</span>
            </button>
            <div className="my-1 mx-2 border-t border-[color-mix(in_srgb,var(--line)_50%,transparent)]" />
            <button onClick={handleCopyMarkdown} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)">
              <Copy className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Copy Markdown</span>
            </button>
            <button onClick={handleShare} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)">
              <Share2 className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Share</span>
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
          >
            {tags.length === 0 ? (
              <div className="px-3 py-2 text-sm text-(--ink-mid) italic">No tags available</div>
            ) : tags.map((tag) => {
              const isSelected = note.tags?.some(t => t.id === tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  className={clsx(
                    'w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)',
                    isSelected ? 'text-(--ink)' : ''
                  )}
                >
                  <TagIcon className="w-4 h-4 shrink-0" style={{ color: tag.color }} />
                  <span className="flex-1 text-left">{tag.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-(--accent) shrink-0" />}
                </button>
              );
            })}
          </div>
        </>,
        getModalPortalRoot()
      )}
    </motion.div>
  );
};

export default NoteEditor;


import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  Pin,
  Trash2,
  Archive,
  ArchiveRestore,
  RotateCcw,
  X,
  Maximize2,
  Minimize2,
  Info,
  Share2,
  Globe,
  PanelLeft,
  MoreHorizontal,
  ImagePlus,
  Bookmark,
  BookmarkPlus,
  AlarmClock,
} from 'lucide-react';
import { Note } from '../../types';
import { useMagicHover } from '../../hooks/useMagicHover';
import { useNoteStore } from '../../store/useNoteStore';
import { useFolderStore } from '../../store/useFolderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../ui/ToastContainer';
import { noteService } from '../../services/note.service';
import { Icons } from '../ui/Icons';
import RichTextToolbar from './RichTextToolbar';
import LexicalEditorWrapper, { ActiveUser } from './LexicalEditorWrapper';
import VersionHistoryPanel from './VersionHistoryPanel';
import FolderMenu from './FolderMenu';
import NoteExportMenu from './NoteExportMenu';
import { MenuPos, formatRelativeDate, userCursorColor } from './noteEditorUtils';
import InviteCollaboratorModal from '../modals/InviteCollaboratorModal';
import PublishModal from '../modals/PublishModal';
import BookmarkSelectionModal from '../modals/BookmarkSelectionModal';
import ReminderModal from '../modals/ReminderModal';
import CoverPickerModal, { CoverTarget } from '../home/CoverPickerModal';
import Modal from '../modals/Modal';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';

interface NoteEditorProps {
  note: Note;
  onNoteUpdate?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

// Presence label for >1 active users: split by edit capability so viewers
// aren't reported as "editing" — they can't.
function presenceLabel(users: ActiveUser[]): string {
  const editing = users.filter(u => u.canEdit).length;
  const viewing = users.length - editing;
  if (editing && viewing) return `${editing} editing · ${viewing} viewing`;
  return viewing ? `${viewing} viewing` : `${editing} editing`;
}

const NoteEditor = ({ note, onNoteUpdate, onToggleSidebar, sidebarCollapsed }: NoteEditorProps) => {
  const { updateNote, deleteNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, setCurrentNote, setNoteTitleOptimistic, updateNoteInStore } = useNoteStore();
  const { folders } = useFolderStore();
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
    setIsSaving(true);
  }, []);

  const [folderMenuPos, setFolderMenuPos] = useState<MenuPos | null>(null);
  const [exportMenuPos, setExportMenuPos] = useState<MenuPos | null>(null);
  const [moreMenu, setMoreMenu] = useState<{ x: number; y: number } | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const rightGroupRef = useRef<HTMLDivElement>(null);
  const { onItemEnter: onRightEnter, onItemLeave: onRightLeave, Indicator: RightIndicator } = useMagicHover({ mode: 'free', borderRadius: 8, ref: rightGroupRef });

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

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [restoreKey, setRestoreKey] = useState(0);
  // Local collaborator list — refreshed after invitations
  const [collaborators, setCollaborators] = useState(note.collaborators ?? []);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  // Save-on-switch: flush unsaved content/title of the previous note
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
    contentRef.current = note.content;
    setContent(note.content);
    titleRef.current = note.title ?? '';
    lastSavedTitleRef.current = note.title ?? '';
    setTitle(note.title ?? '');
    setCollaborators(note.collaborators ?? []);
    setActiveUsers([]);
  }, [note.id]);

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
        console.error('Auto-save failed:', error);
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
      toast.success('Note moved');
      if (onNoteUpdate) onNoteUpdate();
    } catch {
      toast.error('Error moving note');
    }
  };

  const handleDelete = async () => {
    if (note.isDeleted) {
      try {
        await deleteNote(note.id);
        setCurrentNote(null);
        toast.error('Note permanently deleted');
        if (onNoteUpdate) onNoteUpdate();
      } catch {
        toast.error('Error deleting note');
      }
    } else {
      try {
        await toggleTrash(note.id);
        setCurrentNote(null);
        toast.error('Note deleted');
        if (onNoteUpdate) onNoteUpdate();
      } catch {
        toast.error('Error deleting note');
      }
    }
  };

  const handleArchive = async () => {
    try {
      await toggleArchive(note.id);
      toast.success('Note archived');
      if (onNoteUpdate) onNoteUpdate();
    } catch {
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
    } catch {
      toast.error('Error restoring note');
    }
  };

  const handleClose = () => {
    setCurrentNote(null);
  };

  const openFolderMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setExportMenuPos(null);
    setFolderMenuPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4, anchorTop: rect.top });
  };

  // Toggled from the More menu — cascades to the left of the More popup, its right
  // edge anchored to the popup's left edge (top-aligned with it).
  const toggleExportFromMore = () => {
    if (exportMenuPos) { setExportMenuPos(null); return; }
    const el = moreMenuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const SHARE_WIDTH = 220;
    const GAP = 12;
    setFolderMenuPos(null);
    setExportMenuPos({ x: rect.left - GAP - SHARE_WIDTH, y: rect.top, anchorTop: rect.top });
  };

  const isInTrash = note.isDeleted;
  const isArchived = note.isArchived && !note.isDeleted;

  const currentFolder = note.folderId ? folders.find(f => f.id === note.folderId) : null;

  // Topbar actions collapsed into one More menu — status logic mirrors the old buttons.
  const moreItems: ContextMenuItem[] = [
    ...(!isInTrash && !isArchived ? [
      {
        icon: <Pin className={clsx('w-4 h-4', note.isPinned && 'text-(--accent)')} />,
        label: note.isPinned ? 'Unpin' : 'Pin note',
        onClick: async () => { await togglePin(note.id); toast.success(note.isPinned ? 'Unpinned' : 'Note pinned'); },
      },
      {
        icon: note.isFavorite ? <Icons.starFill size={16} /> : <Icons.star size={16} />,
        label: note.isFavorite ? 'Remove from favorites' : 'Add to favorites',
        onClick: async () => { await toggleFavorite(note.id); toast.success(note.isFavorite ? 'Removed from favorites' : 'Added to favorites'); },
      },
      { icon: <Archive className="w-4 h-4" />, label: 'Archive', onClick: handleArchive },
    ] : []),
    ...(isArchived ? [
      { icon: <ArchiveRestore className="w-4 h-4" />, label: 'Unarchive', onClick: handleRestore },
    ] : []),
    ...(isInTrash ? [
      { icon: <RotateCcw className="w-4 h-4" />, label: 'Restore', onClick: handleRestore },
    ] : []),
    ...(!isInTrash ? [
      { icon: <ImagePlus className="w-4 h-4" />, label: 'Add cover', onClick: () => setCoverTarget({ kind: 'note', id: note.id }) },
    ] : []),
    ...(!isInTrash && note.userId === user?.id ? [
      { icon: <Globe className="w-4 h-4" />, label: 'Publish', onClick: () => setShowPublishModal(true) },
    ] : []),
    ...(!isInTrash ? [
      { icon: <Share2 className="w-4 h-4" />, label: 'Share / Export', onClick: toggleExportFromMore, keepOpen: true, active: !!exportMenuPos },
    ] : []),
    { icon: <Trash2 className="w-4 h-4" />, label: isInTrash ? 'Delete permanently' : 'Delete', onClick: handleDelete, variant: 'danger' },
  ];

  const titleHeader = (
    <>
      <div className="editor-meta">
        <button className="editor-breadcrumb" onClick={openFolderMenu} disabled={isInTrash}>{currentFolder ? currentFolder.name : 'All Notes'}</button>
        <span className="editor-sep">·</span>
        <span>{formatRelativeDate(note.updatedAt)}</span>
        {note.bookmarks && note.bookmarks.length > 0 ? (
          <>
            <span className="editor-sep">·</span>
            <button className="editor-bookmarks" onClick={() => !isInTrash && setShowBookmarkModal(true)} disabled={isInTrash} title="Manage bookmarks">
              {note.bookmarks.map((b) => (
                <span key={b.id} className="editor-bookmark" style={{ color: b.color }}>
                  <Bookmark size={12} strokeWidth={2} />
                  {b.name}
                </span>
              ))}
            </button>
          </>
        ) : !isInTrash ? (
          <>
            <span className="editor-sep">·</span>
            <button className="editor-bookmark-add" onClick={() => setShowBookmarkModal(true)} title="Add bookmark">
              <BookmarkPlus size={14} strokeWidth={1.75} />
            </button>
          </>
        ) : null}
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
    </>
  );

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
          'relative z-1 transition-[max-height,opacity] duration-500 ease-out',
          focusWritingMode ? 'max-h-0 overflow-hidden opacity-0 pointer-events-none' : 'max-h-8 overflow-visible opacity-100'
        )}
        initial={{ y: 6 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
            <div
              className="editor-topbar relative flex h-14 items-center justify-between px-6"
            >
              {/* Left spacer keeps the collaborator avatars centered via justify-between. */}
              <div />

              {activeUsers.length > 0 && collaborators.some(c => c.status === 'accepted') && (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  title="Show participants"
                  className="flex cursor-pointer items-center gap-2 rounded-full px-1.5 py-1 transition-colors hover:bg-(--surface-hi)"
                >
                  <div className="flex -space-x-2">
                    {activeUsers.slice(0, 5).map(u => (
                      <div
                        key={u.clientID}
                        title={u.name}
                        style={{ backgroundColor: u.color, borderColor: 'var(--bg)' }}
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      >
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  {activeUsers.length === 1 && (
                    <span className="text-[11px] text-(--ink-dim) whitespace-nowrap">{activeUsers[0].name}</span>
                  )}
                  {activeUsers.length > 1 && (
                    <span className="text-[11px] text-(--ink-dim) whitespace-nowrap">{presenceLabel(activeUsers)}</span>
                  )}
                </button>
              )}

              <div ref={rightGroupRef} className="relative flex items-center gap-2 magic-hover">
                {RightIndicator}
                {!isInTrash && (
                  <span className="editor-save-status mr-3">
                    {isSaving
                      ? <><span className="editor-save-dot saving" style={{ background: 'var(--ink-dim)', boxShadow: 'none' }} /> Saving…</>
                      : <><span className="editor-save-dot" /> Saved</>
                    }
                  </span>
                )}
                {!isInTrash && (
                  <button
                    type="button"
                    onClick={() => setShowReminderModal(true)}
                    onMouseEnter={onRightEnter} onMouseLeave={onRightLeave}
                    className="icon-btn-md rounded-lg transition-colors"
                    title="Set a reminder"
                  >
                    <AlarmClock className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  ref={moreBtnRef}
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMoreMenu(moreMenu ? null : { x: rect.right, y: rect.bottom + 8 });
                  }}
                  onMouseEnter={onRightEnter} onMouseLeave={onRightLeave}
                  className={clsx('icon-btn-md rounded-lg transition-colors', moreMenu && 'text-(--accent)')}
                  title="More"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {onToggleSidebar && (
                  <button
                    type="button"
                    onClick={onToggleSidebar}
                    onMouseEnter={onRightEnter} onMouseLeave={onRightLeave}
                    className={clsx('icon-btn-md rounded-lg transition-colors', sidebarCollapsed && 'text-(--accent)')}
                    title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                  >
                    <PanelLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {!isInTrash && (
                  <button
                    type="button"
                    onClick={() => setFocusWritingMode((v) => !v)}
                    onMouseEnter={onRightEnter} onMouseLeave={onRightLeave}
                    className="icon-btn-md rounded-lg transition-colors"
                    title="Focus mode"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={handleClose} onMouseEnter={onRightEnter} onMouseLeave={onRightLeave} className="icon-btn-md rounded-lg transition-colors" title="Close note">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

      </motion.div>

      <div
        className={clsx(
          'absolute top-3.75 z-5 sm:right-12 transition-[opacity,transform] duration-500 ease-out',
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

          {/* CollaborationPlugin is always active — every note has a Yjs room,
              so owner and collaborators join the same room without delay. */}
          <div className="flex-1 min-w-0 min-h-0">
          {(() => {
            const isCollaborator = note.userId !== user?.id;
            const myEntry = collaborators.find(c => c.userId === user?.id);
            const isViewer = isCollaborator && myEntry?.role === 'viewer';
            return (
          <LexicalEditorWrapper
            key={`${note.id}-${restoreKey}`}
            content={note.content}
            onChange={handleContentChange}
            placeholder="Start writing..."
            disabled={isInTrash || isViewer}
            headerSlot={titleHeader}
            focusMode={focusWritingMode}
            collaboration={{
              noteId: note.id,
              token: localStorage.getItem('token') ?? '',
              userId: user?.id ?? '',
              username: user?.name || user?.email || 'Anonym',
              cursorColor: userCursorColor(user?.id ?? ''),
              canEdit: !isViewer,
            }}
            onUsersChange={setActiveUsers}
            toolbar={
              <RichTextToolbar
                disabled={isInTrash}
                noteId={note.id}
                minimalChrome={focusWritingMode}
                onInfo={isInTrash ? undefined : () => setShowInfoModal(true)}
                onVersionHistory={isInTrash ? undefined : () => setShowVersionHistory(v => !v)}
              />
            }
          />
            );
          })()}
          </div>

      {/* Version history spans the full editor height (over topbar + footer),
          so it lives at the editor root, not inside the writing canvas. */}
      <VersionHistoryPanel
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        noteId={note.id}
        userPlan={user?.plan ?? 'free'}
        onRestore={async (noteId, versionId) => {
          const restored = await noteService.restoreNoteVersion(noteId, versionId);
          updateNoteInStore(restored);
          contentRef.current = restored.content;
          titleRef.current = restored.title ?? '';
          lastSavedTitleRef.current = restored.title ?? '';
          setContent(restored.content);
          setTitle(restored.title ?? '');
          setRestoreKey((k) => k + 1);
          toast.success('Version restored');
        }}
      />

      <FolderMenu
        pos={folderMenuPos}
        currentFolderId={note.folderId}
        onSelect={handleMoveToFolder}
        onClose={() => setFolderMenuPos(null)}
      />

      <NoteExportMenu
        pos={exportMenuPos}
        onClose={() => { setExportMenuPos(null); setMoreMenu(null); }}
        onShareNote={() => setShowInviteModal(true)}
        hasActiveCollaborators={collaborators.some(c => c.status === 'accepted')}
        noteId={note.id}
        title={title}
        content={content}
        panelRef={exportMenuRef}
      />

      <ContextMenu
        isOpen={!!moreMenu}
        position={moreMenu ?? { x: 0, y: 0 }}
        onClose={() => { setMoreMenu(null); setExportMenuPos(null); }}
        items={moreItems}
        minWidth="200px"
        align="right"
        triggerRef={moreBtnRef}
        ignoreRef={exportMenuRef}
        panelRef={moreMenuRef}
        className="z-5"
      />

      <InviteCollaboratorModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        noteId={note.id}
        isOwner={note.userId === user?.id}
        onlineUserIds={new Set([user?.id, ...activeUsers.map(u => u.userId)].filter(Boolean) as string[])}
        onCollaboratorsChange={async () => {
          // Reload the collaborator list so the share indicator stays accurate
          const { collaborationService } = await import('../../services/collaboration.service');
          try {
            const { collaborators: list } = await collaborationService.listCollaborators(note.id);
            setCollaborators(list);
          } catch { /* ignore */ }
        }}
      />

      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        note={note}
      />

      <BookmarkSelectionModal
        isOpen={showBookmarkModal}
        onClose={() => setShowBookmarkModal(false)}
        currentBookmarkIds={note.bookmarks?.map((b) => b.id) ?? []}
        onUpdateBookmarks={async (bookmarkIds) => {
          try {
            await updateNote(note.id, { bookmarks: bookmarkIds });
            onNoteUpdate?.();
          } catch {
            toast.error('Error updating bookmarks');
          }
        }}
      />

      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        noteId={note.id}
      />

      <CoverPickerModal
        target={coverTarget}
        onClose={() => setCoverTarget(null)}
        onCoverChange={() => onNoteUpdate?.()}
      />

      <Modal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} title={note.title?.trim() || 'Note'}>
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
    </motion.div>
  );
};

export default NoteEditor;

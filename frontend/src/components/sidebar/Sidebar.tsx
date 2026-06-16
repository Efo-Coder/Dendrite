import { useEffect, useState } from 'react';
import { useMagicHover } from '../../hooks/useMagicHover';

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveAvatar = (url: string) => url.startsWith('http') ? url : `${API_URL}${url}`;
import { FileText, Star, Folder, Trash2, Archive, Plus, ChevronDown, Edit, Users } from 'lucide-react';
import { Icons } from '../ui/Icons';
import { FOLDER_ICONS } from '../../lib/folderIcons';
import { useFolderStore } from '../../store/useFolderStore';
import { useTagStore } from '../../store/useTagStore';
import { useNoteStore } from '../../store/useNoteStore';
import clsx from 'clsx';
import CreateFolderModal from '../modals/CreateFolderModal';
import CreateTagModal from '../modals/CreateTagModal';
import EditTagModal from '../modals/EditTagModal';
import EditFolderModal from '../modals/EditFolderModal';
import ContextMenu from '../ui/ContextMenu';
import { useToast } from '../ui/ToastContainer';
import Modal from '../modals/Modal';
import { Tag as TagType, Folder as FolderType, User as UserType, ViewType } from '../../types';
import UserProfileModal from '../modals/UserProfileModal';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType, id?: string) => void;
  selectedFolderId?: string;
  selectedTagId?: string;
  refreshTrigger?: number;
  onTagUpdated?: () => void;
  user?: UserType | null;
  collapsed?: boolean;
}

const Sidebar = ({ currentView, onViewChange, selectedFolderId, selectedTagId, refreshTrigger, onTagUpdated, user, collapsed }: SidebarProps) => {
  const { folders, fetchFolders, deleteFolder } = useFolderStore();
  const { tags, fetchTags, deleteTag } = useTagStore();
  const { noteCounts, fetchNoteCounts } = useNoteStore();
  const toast = useToast();
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [showDeleteTagModal, setShowDeleteTagModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagType | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const { containerRef: scrollRef, onItemEnter, onItemLeave, Indicator } = useMagicHover({ inset: 10 });

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    tag: TagType | null;
    folder: FolderType | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    tag: null,
    folder: null,
  });

  useEffect(() => {
    fetchFolders();
    fetchTags();
    fetchNoteCounts();
  }, [fetchFolders, fetchTags, fetchNoteCounts, refreshTrigger]);

  // Pending-Einladungen alle 30s prüfen → Badge erscheint live
  useEffect(() => {
    const id = setInterval(fetchNoteCounts, 30_000);
    return () => clearInterval(id);
  }, [fetchNoteCounts]);

  const displayInitial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  const handleTagRightClick = (e: React.MouseEvent, tag: TagType) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, tag, folder: null });
  };

  const handleFolderRightClick = (e: React.MouseEvent, folder: FolderType) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, tag: null, folder });
  };

  const handleEditTag = () => {
    if (contextMenu.tag) { setSelectedTag(contextMenu.tag); setShowEditTagModal(true); }
  };

  const handleEditFolder = () => {
    if (contextMenu.folder) { setSelectedFolder(contextMenu.folder); setShowEditFolderModal(true); }
  };

  const handleTagUpdated = () => { fetchTags(); onTagUpdated?.(); };
  const handleFolderUpdated = () => { fetchFolders(); onTagUpdated?.(); };

  const handleDeleteTag = () => {
    if (contextMenu.tag) { setTagToDelete(contextMenu.tag); setShowDeleteTagModal(true); }
  };

  const confirmDeleteTag = async () => {
    if (!tagToDelete) return;
    try {
      await deleteTag(tagToDelete.id);
      toast.success('Tag deleted');
      handleTagUpdated();
    } catch {
      toast.error('Error deleting tag');
    } finally {
      setShowDeleteTagModal(false);
      setTagToDelete(null);
    }
  };

  const handleDeleteFolder = () => {
    if (contextMenu.folder) { setFolderToDelete(contextMenu.folder); setShowDeleteFolderModal(true); }
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await deleteFolder(folderToDelete.id);
      toast.success('Folder deleted');
      handleFolderUpdated();
    } catch {
      toast.error('Error deleting folder');
    } finally {
      setShowDeleteFolderModal(false);
      setFolderToDelete(null);
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, tag: null, folder: null });
  };

  const menuItems = [
    { icon: FileText, label: 'All Notes',         view: 'all'       as ViewType, onClick: () => onViewChange('all'),       count: noteCounts.all,       badge: 0 },
    { icon: Star,     label: 'Favorites',          view: 'favorites' as ViewType, onClick: () => onViewChange('favorites'), count: noteCounts.favorites,  badge: 0 },
    { icon: Archive,  label: 'Archive',            view: 'archive'   as ViewType, onClick: () => onViewChange('archive'),   count: noteCounts.archive,    badge: 0 },
    { icon: Users,    label: 'Shared with me',     view: 'shared'    as ViewType, onClick: () => onViewChange('shared'),    count: noteCounts.shared,     badge: noteCounts.pendingInvitations },
    { icon: Trash2,   label: 'Trash',              view: 'trash'     as ViewType, onClick: () => onViewChange('trash'),     count: noteCounts.trash,      badge: 0 },
  ];

  return (
    <>
      <aside className={clsx('sidebar', collapsed && 'collapsed')}>
        <div className="sidebar-inner">
        <div className="sidebar-scroll" ref={scrollRef}>
          {Indicator}
        {/* Library */}
        <div className="sidebar-section">
          <h4>
            Library
            <button
              type="button"
              onClick={() => setLibraryOpen((o) => !o)}
              title={libraryOpen ? 'Collapse' : 'Expand'}
              style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', display: 'flex' }}
              className="text-(--ink-dim) hover:text-(--accent) transition-colors"
            >
              <ChevronDown style={{ width: 10, height: 10, transform: libraryOpen ? 'none' : 'rotate(-180deg)', transition: 'transform .2s' }} />
            </button>
          </h4>
        </div>
        <div style={{ display: 'grid', gridTemplateRows: libraryOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.22s ease' }}>
          <div style={{ overflow: 'hidden', minHeight: 0 }}>
            <ul className="sidebar-list">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.view} style={{ listStyle: 'none' }}>
                    <button
                      onClick={item.onClick}
                      onMouseEnter={onItemEnter}
                      onMouseLeave={onItemLeave}
                      className={clsx('sidebar-item', currentView === item.view && 'active')}
                    >
                      <span className="item-icon"><Icon style={{ width: 15, height: 15 }} /></span>
                      {item.label}
                      {/* Einladungs-Badge (offene Einladungen) */}
                      {item.badge > 0 && (
                        <span style={{ marginLeft: 'auto', minWidth: 16, height: 16, borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                          {item.badge}
                        </span>
                      )}
                      {item.badge === 0 && item.count > 0 && <span className="item-count">{item.count}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Folders */}
        <div className="sidebar-section">
          <h4>
            Folders
            <button
              type="button"
              onClick={() => setFoldersOpen((o) => !o)}
              title={foldersOpen ? 'Collapse' : 'Expand'}
              style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', display: 'flex' }}
              className="text-(--ink-dim) hover:text-(--accent) transition-colors"
            >
              <ChevronDown style={{ width: 10, height: 10, transform: foldersOpen ? 'none' : 'rotate(-180deg)', transition: 'transform .2s' }} />
            </button>
            <button
              type="button"
              onClick={() => setShowFolderModal(true)}
              title="New Folder"
              style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', display: 'flex', marginLeft: '-2px' }}
              className="text-(--ink-dim) hover:text-(--accent) transition-colors"
            >
              <Plus style={{ width: 10, height: 10 }} />
            </button>
          </h4>
        </div>
        <div style={{ display: 'grid', gridTemplateRows: foldersOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.22s ease' }}>
          <div style={{ overflow: 'hidden', minHeight: 0 }}>
            <ul className="sidebar-list">
              {folders.length === 0 ? (
                <li style={{ listStyle: 'none', padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--ink-dim)', letterSpacing: '0.1em' }}>
                  No folders yet
                </li>
              ) : folders.map((folder) => (
                <li key={folder.id} style={{ listStyle: 'none' }}>
                  <button
                    onClick={() => onViewChange('folder', folder.id)}
                    onMouseEnter={onItemEnter}
                    onMouseLeave={onItemLeave}
                    onContextMenu={(e) => handleFolderRightClick(e, folder)}
                    className={clsx('sidebar-item', currentView === 'folder' && selectedFolderId === folder.id && 'active')}
                  >
                    <span className="item-icon">
                      {(() => { const FolderIcon = folder.icon ? FOLDER_ICONS[folder.icon] : null; return FolderIcon ? <FolderIcon style={{ width: 14, height: 14, color: folder.color || 'var(--ink-low)' }} /> : <Folder style={{ width: 14, height: 14, color: folder.color || 'var(--ink-low)' }} />; })()}
                    </span>
                    {folder.name}
                    {(folder.notes?.length ?? 0) > 0 && (
                      <span className="item-count">{folder.notes!.length}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tags */}
        <div className="sidebar-section">
          <h4>
            Tags
            <button
              type="button"
              onClick={() => setTagsOpen((o) => !o)}
              title={tagsOpen ? 'Collapse' : 'Expand'}
              style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', display: 'flex' }}
              className="text-(--ink-dim) hover:text-(--accent) transition-colors"
            >
              <ChevronDown style={{ width: 10, height: 10, transform: tagsOpen ? 'none' : 'rotate(-180deg)', transition: 'transform .2s' }} />
            </button>
            <button
              type="button"
              onClick={() => setShowTagModal(true)}
              title="New Tag"
              style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', display: 'flex', marginLeft: '-2px' }}
              className="text-(--ink-dim) hover:text-(--accent) transition-colors"
            >
              <Plus style={{ width: 10, height: 10 }} />
            </button>
          </h4>
        </div>
        <div style={{ display: 'grid', gridTemplateRows: tagsOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.22s ease' }}>
          <div style={{ overflow: 'hidden', minHeight: 0 }}>
            <ul className="sidebar-tag-list">
              {tags.length === 0 ? (
                <li style={{ listStyle: 'none', padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--ink-dim)', letterSpacing: '0.1em' }}>
                  No tags yet
                </li>
              ) : tags.map((tag) => (
                <li key={tag.id} style={{ listStyle: 'none' }}>
                  <button
                    onClick={() => onViewChange('tag', tag.id)}
                    onMouseEnter={onItemEnter}
                    onMouseLeave={onItemLeave}
                    onContextMenu={(e) => handleTagRightClick(e, tag)}
                    className={clsx('sidebar-tag', currentView === 'tag' && selectedTagId === tag.id && 'active')}
                  >
                    <span className="item-icon" style={{ color: tag.color }}><Icons.tag size={14} /></span>
                    <span className="tag-label">{tag.name}</span>
                    {(tag.notes?.length ?? 0) > 0 && <span className="item-count">{tag.notes!.length}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        </div>{/* end sidebar-scroll */}

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="sidebar-avatar"
            title="Profile"
            style={{ fontSize: '13px', fontWeight: 600 }}
          >
            {user?.avatarUrl ? (
              <img
                src={resolveAvatar(user.avatarUrl)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              displayInitial
            )}
          </button>
          <div className="sidebar-user">
            <span className="sidebar-username">{user?.name || user?.email || 'Profile'}</span>
            <span
              className="sidebar-role"
              style={(() => {
                const p = (user?.plan || 'free').toLowerCase();
                if (p === 'author') return { color: '#c9a45a', background: 'color-mix(in srgb, #c9a45a 14%, transparent)', padding: '1px 5px', borderRadius: '3px' };
                if (p === 'writer') return { color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', padding: '1px 5px', borderRadius: '3px' };
                return {};
              })()}
            >
              {(user?.plan || 'free').toLowerCase()}
            </span>
          </div>
        </div>
        </div>{/* end sidebar-inner */}
      </aside>

      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <CreateFolderModal isOpen={showFolderModal} onClose={() => setShowFolderModal(false)} />
      <CreateTagModal isOpen={showTagModal} onClose={() => setShowTagModal(false)} />
      <EditTagModal
        isOpen={showEditTagModal}
        onClose={() => { setShowEditTagModal(false); setSelectedTag(null); }}
        onTagUpdated={handleTagUpdated}
        tag={selectedTag}
      />
      <EditFolderModal
        isOpen={showEditFolderModal}
        onClose={() => { setShowEditFolderModal(false); setSelectedFolder(null); }}
        onFolderUpdated={handleFolderUpdated}
        folder={selectedFolder}
      />
      <Modal
        isOpen={showDeleteTagModal}
        onClose={() => setShowDeleteTagModal(false)}
        title="Delete tag?"
        showFooter
        confirmLabel="Delete"
        onConfirm={confirmDeleteTag}
        confirmVariant="danger"
      >
        <p className="text-sm text-(--ink-mid)">
          Are you sure you want to delete the tag "{tagToDelete?.name}"? This action cannot be undone.
        </p>
      </Modal>
      <Modal
        isOpen={showDeleteFolderModal}
        onClose={() => setShowDeleteFolderModal(false)}
        title="Delete folder?"
        showFooter
        confirmLabel="Delete"
        onConfirm={confirmDeleteFolder}
        confirmVariant="danger"
      >
        <p className="text-sm text-(--ink-mid)">
          Are you sure you want to delete the folder "{folderToDelete?.name}"? This action cannot be undone.
        </p>
      </Modal>
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        items={[
          { icon: <Edit className="w-4 h-4" />, label: 'Edit', onClick: contextMenu.tag ? handleEditTag : handleEditFolder },
          { icon: <Trash2 className="w-4 h-4" />, label: 'Delete', onClick: contextMenu.tag ? handleDeleteTag : handleDeleteFolder, variant: 'danger' },
        ]}
        minWidth="160px"
      />
    </>
  );
};

export default Sidebar;

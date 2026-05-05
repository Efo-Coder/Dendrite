import { useEffect, useRef, useState } from 'react';
import { useGlassPill } from '../hooks/useGlassPill';
import { FileText, Star, Folder, Tag, Trash2, Archive, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFolderStore } from '../store/useFolderStore';
import { useTagStore } from '../store/useTagStore';
import clsx from 'clsx';
import CreateFolderModal from './modals/CreateFolderModal';
import CreateTagModal from './modals/CreateTagModal';
import EditTagModal from './modals/EditTagModal';
import EditFolderModal from './modals/EditFolderModal';
import ContextMenu from './ContextMenu';
import Logo from './Logo';
import { Tag as TagType, Folder as FolderType } from '../types';

type ViewType = 'all' | 'favorites' | 'archive' | 'trash' | 'folder' | 'tag';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType, id?: string) => void;
  selectedFolderId?: string;
  selectedTagId?: string;
  refreshTrigger?: number;
  onTagUpdated?: () => void;
}

const Sidebar = ({ currentView, onViewChange, selectedFolderId, selectedTagId, refreshTrigger, onTagUpdated }: SidebarProps) => {
  const { folders, fetchFolders, deleteFolder } = useFolderStore();
  const { tags, fetchTags, deleteTag } = useTagStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const folderListRef = useRef<HTMLDivElement>(null);
  const tagListRef = useRef<HTMLDivElement>(null);
  const { pill: navPill, onEnter: onNavEnter, onLeave: onNavLeave } = useGlassPill(navRef);
  const { pill: folderPill, onEnter: onFolderEnter, onLeave: onFolderLeave } = useGlassPill(folderListRef);
  const { pill: tagPill, onEnter: onTagEnter, onLeave: onTagLeave } = useGlassPill(tagListRef);

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
  }, [fetchFolders, fetchTags, refreshTrigger]);

  const handleTagRightClick = (e: React.MouseEvent, tag: TagType) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      tag,
      folder: null,
    });
  };

  const handleFolderRightClick = (e: React.MouseEvent, folder: FolderType) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      tag: null,
      folder,
    });
  };

  const handleEditTag = () => {
    if (contextMenu.tag) {
      setSelectedTag(contextMenu.tag);
      setShowEditTagModal(true);
    }
  };

  const handleEditFolder = () => {
    if (contextMenu.folder) {
      setSelectedFolder(contextMenu.folder);
      setShowEditFolderModal(true);
    }
  };

  const handleTagUpdated = () => {
    // Tags neu laden nach dem Update
    fetchTags();
    // Notizen auch aktualisieren, damit die neuen Tag-Farben angezeigt werden
    onTagUpdated?.();
  };

  const handleFolderUpdated = () => {
    // Ordner neu laden nach dem Update
    fetchFolders();
    // Notizen auch aktualisieren
    onTagUpdated?.();
  };

  const handleDeleteTag = async () => {
    if (contextMenu.tag) {
      if (window.confirm(`Möchtest du den Tag "${contextMenu.tag.name}" wirklich löschen?`)) {
        try {
          await deleteTag(contextMenu.tag.id);
        } catch (error) {
          console.error('Fehler beim Löschen des Tags:', error);
        }
      }
    }
  };

  const handleDeleteFolder = async () => {
    if (contextMenu.folder) {
      if (window.confirm(`Möchtest du den Ordner "${contextMenu.folder.name}" wirklich löschen?`)) {
        try {
          await deleteFolder(contextMenu.folder.id);
        } catch (error) {
          console.error('Fehler beim Löschen des Ordners:', error);
        }
      }
    }
  };

  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
      tag: null,
      folder: null,
    });
  };

  const menuItems = [
    {
      icon: FileText,
      label: 'Alle Notizen',
      view: 'all' as ViewType,
      onClick: () => onViewChange('all')
    },
    {
      icon: Star,
      label: 'Favoriten',
      view: 'favorites' as ViewType,
      onClick: () => onViewChange('favorites')
    },
    {
      icon: Archive,
      label: 'Archiv',
      view: 'archive' as ViewType,
      onClick: () => onViewChange('archive')
    },
    {
      icon: Trash2,
      label: 'Papierkorb',
      view: 'trash' as ViewType,
      onClick: () => onViewChange('trash')
    },
  ];

  return (
    <>
      <aside className={clsx(
        "glass-panel rounded-2xl flex flex-col transition-all duration-300 overflow-hidden flex-none",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Logo */}
        <div className="h-16 glass-surface flex items-center px-4">
          <Logo size="md" showText={!isCollapsed} />
        </div>

        {/* Navigation */}
        <nav className="py-3 space-y-1 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {/* Main Menu */}
          <div ref={navRef} className="relative flex flex-col gap-1" onMouseLeave={onNavLeave}>
            {navPill && (
              <div
                className={clsx('glass-pill', navPill.isActive && 'glass-pill-active')}
                style={{ left: navPill.left, top: navPill.top, width: navPill.width, height: navPill.height }}
              />
            )}
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  onMouseEnter={(e) => onNavEnter(e, isActive)}
                  className={clsx(
                    'w-full flex items-center rounded-lg transition-all duration-200 py-2.5 relative z-10',
                    isActive
                      ? 'text-accent-brand'
                      : 'text-accent-secondary hover-text-themed'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="-ml-px w-16 flex-shrink-0 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className={clsx(
                    "-ml-3 text-sm whitespace-nowrap transition-opacity duration-200",
                    isCollapsed ? "opacity-0" : "opacity-100 delay-[50ms]"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="pt-4 pb-2">
            <div className="h-px border-t glass-divider" />
          </div>

          {/* Folders Section */}
          <div className="pt-2">
            <div
              className="flex items-center py-2 pl-[21px] transition-all duration-300"
              style={{ paddingRight: isCollapsed ? '24px' : '12px' }}
            >
              <span
                className="text-xs font-semibold text-accent-subtle uppercase tracking-wider flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap"
                style={{ maxWidth: isCollapsed ? 0 : '200px', opacity: isCollapsed ? 0 : 1 }}
              >
                Ordner
              </span>
              <button
                onClick={() => setShowFolderModal(true)}
                className="ml-auto text-accent-subtle hover:text-accent-brand transition-colors"
                title="Neuer Ordner"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {folders.length === 0 && !isCollapsed ? (
              <p className="px-3 py-2 text-xs text-accent-subtle italic">
                Keine Ordner vorhanden
              </p>
            ) : (
              <div ref={folderListRef} className="relative flex flex-col gap-0.5" onMouseLeave={onFolderLeave}>
                {folderPill && (
                  <div
                    className={clsx('glass-pill', folderPill.isActive && 'glass-pill-active')}
                    style={{ left: folderPill.left, top: folderPill.top, width: folderPill.width, height: folderPill.height }}
                  />
                )}
                {folders.map((folder) => {
                  const isFolderActive = currentView === 'folder' && selectedFolderId === folder.id;
                  return (
                  <button
                    key={folder.id}
                    onClick={() => onViewChange('folder', folder.id)}
                    onContextMenu={(e) => handleFolderRightClick(e, folder)}
                    onMouseEnter={(e) => onFolderEnter(e, isFolderActive)}
                    className={clsx(
                      'w-full flex items-center rounded-lg transition-all duration-200 py-2.5 relative z-10',
                      isFolderActive
                        ? 'text-accent-brand'
                        : 'text-accent-secondary hover-text-themed'
                    )}
                    title={isCollapsed ? folder.name : undefined}
                  >
                    <span className="-ml-px w-16 flex-shrink-0 flex items-center justify-center">
                      <span className="relative">
                        <Folder
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: folder.color || '#10b981' }}
                        />
                        {(folder.notes?.length ?? 0) > 0 && (
                          <span className={clsx(
                            "absolute -bottom-0.5 left-[calc(100%-5px)] text-[9px] leading-none font-semibold text-accent-subtle bg-[var(--glass-bg)] rounded-full px-[2px] shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--color-accent-brand)_25%,transparent)] transition-opacity duration-200",
                            isCollapsed ? "opacity-100 delay-[50ms]" : "opacity-0"
                          )}>
                            {folder.notes?.length}
                          </span>
                        )}
                      </span>
                    </span>
                    <div className={clsx(
                      "-ml-3 flex items-center space-x-2 flex-1 min-w-0 transition-opacity duration-200",
                      isCollapsed ? "opacity-0" : "opacity-100 delay-[50ms]"
                    )}>
                      <span className="text-sm truncate whitespace-nowrap">
                        {folder.name}
                      </span>
                    </div>
                    {folder.notes && folder.notes.length > 0 && (
                      <span className={clsx(
                        "text-xs text-accent-subtle flex-shrink-0 w-4 text-center transition-opacity duration-200 ml-2 mr-3",
                        isCollapsed ? "opacity-0" : "opacity-100 delay-[50ms]"
                      )}>
                        {folder.notes.length}
                      </span>
                    )}
                  </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="pt-4">
            <div
              className="flex items-center py-2 pl-[21px] transition-all duration-300"
              style={{ paddingRight: isCollapsed ? '24px' : '12px' }}
            >
              <span
                className="text-xs font-semibold text-accent-subtle uppercase tracking-wider flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap"
                style={{ maxWidth: isCollapsed ? 0 : '200px', opacity: isCollapsed ? 0 : 1 }}
              >
                Tags
              </span>
              <button
                onClick={() => setShowTagModal(true)}
                className="ml-auto text-accent-subtle hover:text-accent-brand transition-colors"
                title="Neuer Tag"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {tags.length === 0 && !isCollapsed ? (
              <p className="px-3 py-2 text-xs text-accent-subtle italic">
                Keine Tags vorhanden
              </p>
            ) : (
              <div ref={tagListRef} className="relative flex flex-col gap-0.5" onMouseLeave={onTagLeave}>
                {tagPill && (
                  <div
                    className={clsx('glass-pill', tagPill.isActive && 'glass-pill-active')}
                    style={{ left: tagPill.left, top: tagPill.top, width: tagPill.width, height: tagPill.height }}
                  />
                )}
                {tags.map((tag) => {
                  const isTagActive = currentView === 'tag' && selectedTagId === tag.id;
                  return (
                  <button
                    key={tag.id}
                    onClick={() => onViewChange('tag', tag.id)}
                    onContextMenu={(e) => handleTagRightClick(e, tag)}
                    onMouseEnter={(e) => onTagEnter(e, isTagActive)}
                    className={clsx(
                      'w-full flex items-center rounded-lg transition-all duration-200 py-2.5 relative z-10',
                      isTagActive
                        ? 'text-accent-brand'
                        : 'text-accent-secondary hover-text-themed'
                    )}
                    title={isCollapsed ? tag.name : undefined}
                  >
                    <span className="-ml-px w-16 flex-shrink-0 flex items-center justify-center">
                      <span className="relative">
                        <Tag
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: tag.color }}
                        />
                        {(tag.notes?.length ?? 0) > 0 && (
                          <span className={clsx(
                            "absolute -bottom-0.5 left-[calc(100%-5px)] text-[9px] leading-none font-semibold text-accent-subtle bg-[var(--glass-bg)] rounded-full px-[2px] shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--color-accent-brand)_25%,transparent)] transition-opacity duration-200",
                            isCollapsed ? "opacity-100 delay-[50ms]" : "opacity-0"
                          )}>
                            {tag.notes?.length}
                          </span>
                        )}
                      </span>
                    </span>
                    <div className={clsx(
                      "-ml-3 flex items-center space-x-2 flex-1 min-w-0 transition-opacity duration-200",
                      isCollapsed ? "opacity-0" : "opacity-100 delay-[50ms]"
                    )}>
                      <span className="text-sm truncate whitespace-nowrap">
                        {tag.name}
                      </span>
                    </div>
                    {tag.notes && tag.notes.length > 0 && (
                      <span className={clsx(
                        "text-xs text-accent-subtle flex-shrink-0 w-4 text-center transition-opacity duration-200 ml-2 mr-3",
                        isCollapsed ? "opacity-0" : "opacity-100 delay-[50ms]"
                      )}>
                        {tag.notes.length}
                      </span>
                    )}
                  </button>
                  );
                })}
              </div>
            )}
          </div>

        </nav>

        {/* Collapse Toggle — bottom of sidebar, aligned with "+" buttons */}
        <div
          className="flex items-center justify-end py-2 mb-1 transition-all duration-300"
          style={{ paddingRight: isCollapsed ? '22px' : '12px' }}
        >
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-accent-subtle hover:text-accent-brand transition-colors"
            title={isCollapsed ? "Sidebar erweitern" : "Sidebar minimieren"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Modals */}
      <CreateFolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
      />
      <CreateTagModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
      />
      <EditTagModal
        isOpen={showEditTagModal}
        onClose={() => {
          setShowEditTagModal(false);
          setSelectedTag(null);
        }}
        onTagUpdated={handleTagUpdated}
        tag={selectedTag}
      />
      <EditFolderModal
        isOpen={showEditFolderModal}
        onClose={() => {
          setShowEditFolderModal(false);
          setSelectedFolder(null);
        }}
        onFolderUpdated={handleFolderUpdated}
        folder={selectedFolder}
      />

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onEdit={contextMenu.tag ? handleEditTag : handleEditFolder}
        onDelete={contextMenu.tag ? handleDeleteTag : handleDeleteFolder}
      />
    </>
  );
};

export default Sidebar;

import { useEffect, useState } from 'react';
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
        "bg-theme-surface border-r border-theme flex flex-col transition-all duration-300 overflow-hidden",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Logo */}
        <div className="h-16 border-b flex-shrink-0 flex items-center px-4">
          <Logo size="md" showText={!isCollapsed} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {/* Main Menu */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={clsx(
                  'w-full flex items-center rounded-lg transition-all duration-200 px-1.5 py-2.5',
                  isActive
                    ? 'bg-accent-500/10 text-accent-500'
                    : 'text-theme-text-secondary hover:bg-theme-elevated hover:text-theme-text-primary'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className={clsx(
                    "text-sm whitespace-nowrap transition-opacity duration-200 ml-3",
                    isCollapsed ? "opacity-0" : "opacity-100 delay-100"
                  )}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="pt-4 pb-2">
            <div className="h-px border-t border-theme" />
          </div>

          {/* Folders Section */}
          <div className="pt-2">
            {!isCollapsed ? (
              <div className="flex items-center justify-between px-1.5 py-2">
                <span className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
                  Ordner
                </span>
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="text-theme-text-muted hover:text-accent-500 transition-colors"
                  title="Neuer Ordner"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-2">
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="text-theme-text-muted hover:text-accent-500 transition-colors"
                  title="Neuer Ordner"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {folders.length === 0 && !isCollapsed ? (
              <p className="px-3 py-2 text-xs text-theme-text-muted italic">
                Keine Ordner vorhanden
              </p>
            ) : (
              <div className="space-y-0.5">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => onViewChange('folder', folder.id)}
                    onContextMenu={(e) => handleFolderRightClick(e, folder)}
                    className={clsx(
                      'w-full flex items-center rounded-lg transition-all duration-200 px-1.5 py-2.5',
                      currentView === 'folder' && selectedFolderId === folder.id
                        ? 'bg-accent-500/10 text-accent-500 font-medium'
                        : 'text-theme-text-secondary hover:bg-theme-elevated hover:text-theme-text-primary'
                    )}
                    title={isCollapsed ? folder.name : undefined}
                  >
                    <Folder
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: folder.color || '#10b981' }}
                    />
                    {!isCollapsed && (
                      <>
                        <div className="flex items-center space-x-2 flex-1 min-w-0 ml-3">
                          <span className={clsx(
                            "text-sm truncate whitespace-nowrap transition-opacity duration-200",
                            isCollapsed ? "opacity-0" : "opacity-100 delay-100"
                          )}>
                            {folder.name}
                          </span>
                        </div>
                        {folder.notes && folder.notes.length > 0 && (
                          <span className={clsx(
                            "text-xs text-theme-text-muted flex-shrink-0 w-4 text-center transition-opacity duration-200 ml-2",
                            isCollapsed ? "opacity-0" : "opacity-100 delay-100"
                          )}>
                            {folder.notes.length}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="pt-4">
            {!isCollapsed ? (
              <div className="flex items-center justify-between px-1.5 py-2">
                <span className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
                  Tags
                </span>
                <button
                  onClick={() => setShowTagModal(true)}
                  className="text-theme-text-muted hover:text-accent-500 transition-colors"
                  title="Neuer Tag"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-2">
                <button
                  onClick={() => setShowTagModal(true)}
                  className="text-theme-text-muted hover:text-accent-500 transition-colors"
                  title="Neuer Tag"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {tags.length === 0 && !isCollapsed ? (
              <p className="px-3 py-2 text-xs text-theme-text-muted italic">
                Keine Tags vorhanden
              </p>
            ) : (
              <div className="space-y-0.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => onViewChange('tag', tag.id)}
                    onContextMenu={(e) => handleTagRightClick(e, tag)}
                    className={clsx(
                      'w-full flex items-center rounded-lg transition-all duration-200 px-1.5 py-2.5',
                      currentView === 'tag' && selectedTagId === tag.id
                        ? 'bg-accent-500/10 text-accent-500 font-medium'
                        : 'text-theme-text-secondary hover:bg-theme-elevated hover:text-theme-text-primary'
                    )}
                    title={isCollapsed ? tag.name : undefined}
                  >
                    <Tag
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: tag.color }}
                    />
                    {!isCollapsed && (
                      <>
                        <div className="flex items-center space-x-2 flex-1 min-w-0 ml-3">
                          <span className={clsx(
                            "text-sm truncate whitespace-nowrap transition-opacity duration-200",
                            isCollapsed ? "opacity-0" : "opacity-100 delay-100"
                          )}>
                            {tag.name}
                          </span>
                        </div>
                        {tag.notes && tag.notes.length > 0 && (
                          <span className={clsx(
                            "text-xs text-theme-text-muted flex-shrink-0 w-4 text-center transition-opacity duration-200 ml-2",
                            isCollapsed ? "opacity-0" : "opacity-100 delay-100"
                          )}>
                            {tag.notes.length}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Button at bottom */}
          <div className="mt-auto pl-9 flex justify-end">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg text-theme-text-muted hover:bg-theme-elevated hover:text-theme-text-primary transition-colors"
              title={isCollapsed ? "Sidebar erweitern" : "Sidebar minimieren"}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </nav>
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
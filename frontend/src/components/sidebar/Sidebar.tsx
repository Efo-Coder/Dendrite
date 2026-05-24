import { useEffect, useRef, useState } from 'react';
import { useGlassPill } from '../../hooks/useGlassPill';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { FileText, Star, Folder, Tag, Trash2, Archive, Plus, ChevronLeft, ChevronRight, ChevronDown, Settings, Edit } from 'lucide-react';
import { useFolderStore } from '../../store/useFolderStore';
import { useTagStore } from '../../store/useTagStore';
import clsx from 'clsx';
import CreateFolderModal from '../modals/CreateFolderModal';
import CreateTagModal from '../modals/CreateTagModal';
import EditTagModal from '../modals/EditTagModal';
import EditFolderModal from '../modals/EditFolderModal';
import ContextMenu from '../ui/ContextMenu';
import Modal from '../modals/Modal';
import Logo from '../ui/Logo';
import { Tag as TagType, Folder as FolderType, User as UserType, ViewType } from '../../types';
import SettingsModal from '../modals/SettingsModal';
import UserProfileModal from '../modals/UserProfileModal';
import DarkModeToggle from './DarkModeToggle';
import FocusTimer from './FocusTimer';
import { useSettingsStore } from '../../store/useSettingsStore';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType, id?: string) => void;
  selectedFolderId?: string;
  selectedTagId?: string;
  refreshTrigger?: number;
  onTagUpdated?: () => void;
  user?: UserType | null;
}

const Sidebar = ({ currentView, onViewChange, selectedFolderId, selectedTagId, refreshTrigger, onTagUpdated, user }: SidebarProps) => {
  const { folders, fetchFolders, deleteFolder } = useFolderStore();
  const { tags, fetchTags, deleteTag } = useTagStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
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
  const { showFocusTimer } = useSettingsStore();
  const navRef = useRef<HTMLElement>(null);
  const footerBtnsRef = useRef<HTMLDivElement>(null);
  const footerBtnsCollapsedRef = useRef<HTMLDivElement>(null);
  const { pill: footerBtnsPill, onEnter: onFooterBtnsEnter, onLeave: onFooterBtnsLeave } = useGlassPill(footerBtnsRef);
  const { pill: footerBtnsCollapsedPill, onEnter: onFooterBtnsCollapsedEnter, onLeave: onFooterBtnsCollapsedLeave } = useGlassPill(footerBtnsCollapsedRef);
  const [pillPos, setPillPos] = useState({ top: 0, height: 40 });
  const [pillVisible, setPillVisible] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
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

  const displayInitial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

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

  const handleDeleteTag = () => {
    if (contextMenu.tag) {
      setTagToDelete(contextMenu.tag);
      setShowDeleteTagModal(true);
    }
  };

  const confirmDeleteTag = async () => {
    if (tagToDelete) {
      try {
        await deleteTag(tagToDelete.id);
      } catch (error) {
        console.error('Fehler beim Löschen des Tags:', error);
      } finally {
        setShowDeleteTagModal(false);
        setTagToDelete(null);
      }
    }
  };

  const handleDeleteFolder = () => {
    if (contextMenu.folder) {
      setFolderToDelete(contextMenu.folder);
      setShowDeleteFolderModal(true);
    }
  };

  const confirmDeleteFolder = async () => {
    if (folderToDelete) {
      try {
        await deleteFolder(folderToDelete.id);
      } catch (error) {
        console.error('Fehler beim Löschen des Ordners:', error);
      } finally {
        setShowDeleteFolderModal(false);
        setFolderToDelete(null);
      }
    }
  };

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nav = navRef.current;
    if (!nav) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = e.currentTarget.getBoundingClientRect();
    setPillPos({ top: btnRect.top - navRect.top + nav.scrollTop, height: btnRect.height });
    setPillVisible(true);
  };

  const handleNavLeave = () => setPillVisible(false);

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
        'flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden flex-none min-h-0 h-full border-r border-divider bg-[var(--color-bg-header)]',
        isCollapsed ? 'w-[4.25rem]' : 'w-60'
      )}>
        <div className="h-[70px] flex items-center border-b border-divider">
          <span className={clsx(
            "flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out",
            isCollapsed ? "w-0 opacity-0" : "w-[4.25rem] opacity-100"
          )}>
            <Logo size="md" showText={false} />
          </span>
          <span
            className={clsx(
              "font-display -ml-2 flex-1 text-2xl font-normal text-text-primary whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out leading-none",
              isCollapsed ? "opacity-0 max-w-0" : "opacity-100 delay-[50ms]"
            )}
          >
            Dendrite
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={clsx(
              "flex-shrink-0 text-text-secondary hover:text-brand-primary transition-all duration-300 ease-in-out",
              isCollapsed ? "ml-[35px]" : "mr-3"
            )}
            title={isCollapsed ? "Sidebar erweitern" : "Sidebar minimieren"}
            type="button"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav
          ref={navRef}
          onMouseLeave={handleNavLeave}
          className="relative flex flex-1 flex-col space-y-1 overflow-x-hidden overflow-y-auto py-3 scrollbar-hide"
        >
          <div
            aria-hidden
            className="glass-pill absolute inset-x-1"
            style={{
              top: pillPos.top,
              height: pillPos.height,
              opacity: pillVisible ? 1 : 0,
              transition: 'top 0.28s cubic-bezier(0.33,1,0.68,1), height 0.28s cubic-bezier(0.33,1,0.68,1), opacity 0.18s ease',
            }}
          />
          {/* Main Menu */}
          <div className="flex flex-col gap-1 px-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  onMouseEnter={handleButtonHover}
                  className={clsx(
                    'relative z-10 flex font-medium w-full items-center rounded-xl py-2.5 transition-[background,box-shadow,color,opacity] duration-300 ease-in-out',
                    isActive
                      ? 'sidebar-item-active text-text-primary'
                      : ''
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="w-[4.25rem] flex-shrink-0 flex items-center justify-start pl-5">
                    <Icon className={clsx('w-5 h-5', isActive && 'text-brand-primary')} />
                  </span>
                  <span                   className={clsx(
                    "-ml-3 text-base whitespace-nowrap transition-opacity duration-300 ease-in-out",
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
            <div className="h-px border-t border-divider mx-5" />
          </div>

          {/* Folders Section */}
          <div className="pt-2">
            <div
              className="flex items-center py-2 pl-[21px] transition-all duration-300 ease-in-out"
              style={{ paddingRight: isCollapsed ? '24px' : '12px' }}
            >
              <button
                onClick={() => setFoldersOpen((o) => !o)}
                className={clsx(
                  "flex-1 flex items-center gap-1 text-xs font-medium text-text-muted overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out hover:text-text-secondary",
                  isCollapsed ? "opacity-0 pointer-events-none max-w-0" : "opacity-100"
                )}
                title={foldersOpen ? 'Ordner einklappen' : 'Ordner ausklappen'}
              >
                <span>Ordner</span>
                <ChevronDown className={clsx("w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200", !foldersOpen && "rotate-180")} />
              </button>
              <button
                onClick={() => setShowFolderModal(true)}
                className="ml-auto text-text-secondary hover:text-brand-primary transition-colors"
                title="Neuer Ordner"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className={clsx('grid transition-[grid-template-rows] duration-300 ease-in-out', foldersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="min-h-0 overflow-hidden">
                {folders.length === 0 && !isCollapsed ? (
                  <p className="px-5 py-1.5 text-xs text-text-muted">
                    Noch keine Ordner
                  </p>
                ) : (
                  <div className="flex flex-col gap-0.5 px-1">
                    {folders.map((folder) => {
                  const isFolderActive = currentView === 'folder' && selectedFolderId === folder.id;
                  return (
                  <button
                    key={folder.id}
                    onClick={() => onViewChange('folder', folder.id)}
                    onContextMenu={(e) => handleFolderRightClick(e, folder)}
                    onMouseEnter={handleButtonHover}
                    className={clsx(
                      'relative z-10 flex w-full items-center rounded-xl py-2.5 transition-[background,box-shadow,color,opacity] duration-300 ease-in-out',
                      isFolderActive
                        ? 'sidebar-item-active text-text-primary'
                        : ''
                    )}
                    title={isCollapsed ? folder.name : undefined}
                  >
                    <span className="w-[4.25rem] flex-shrink-0 flex items-center justify-start pl-5">
                      <span className="relative">
                        <Folder
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: folder.color || '#10b981' }}
                        />
                        {(folder.notes?.length ?? 0) > 0 && (
                          <span className={clsx(
                            "absolute -bottom-0.5 left-[calc(100%-5px)] text-[9px] leading-none font-semibold text-text-secondary rounded-full px-[2px] shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--color-text-secondary)_25%,transparent)] transition-opacity duration-300 ease-in-out overflow-hidden",
                            isCollapsed ? "opacity-100 delay-[50ms]" : "opacity-0"
                          )}>
                            <span className="absolute inset-0 rounded-full backdrop-blur-xl glass-bg" />
                            <span className="relative z-10 text-text-secondary font-ui">{folder.notes?.length}</span>
                          </span>
                        )}
                      </span>
                    </span>
                    <div className={clsx(
                      "-ml-3 flex items-center space-x-2 flex-1 min-w-0 transition-opacity duration-300 ease-in-out",
                      isCollapsed ? "opacity-0" : "opacity-100 delay-[50ms]"
                    )}>
                      <span className="text-base truncate whitespace-nowrap">
                        {folder.name}
                      </span>
                    </div>
                    {folder.notes && folder.notes.length > 0 && (
                      <span className={clsx(
                        "font-ui text-xs text-text-muted flex-shrink-0 w-4 text-center transition-opacity duration-300 ease-in-out ml-2 mr-2",
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
            </div>
          </div>

          {/* Tags Section */}
          <div className="pt-4">
            <div
              className="flex items-center py-2 pl-[21px] transition-all duration-300 ease-in-out"
              style={{ paddingRight: isCollapsed ? '24px' : '12px' }}
            >
              <button
                onClick={() => setTagsOpen((o) => !o)}
                className={clsx(
                  "flex-1 flex items-center gap-1 text-xs font-medium text-text-muted overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out hover:text-text-secondary",
                  isCollapsed ? "opacity-0 pointer-events-none max-w-0" : "opacity-100"
                )}
                title={tagsOpen ? 'Tags einklappen' : 'Tags ausklappen'}
              >
                <span>Tags</span>
                <ChevronDown className={clsx("w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200", !tagsOpen && "rotate-180")} />
              </button>
              <button
                onClick={() => setShowTagModal(true)}
                className="ml-auto text-text-secondary hover:text-brand-primary transition-colors"
                title="Neuer Tag"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className={clsx('grid transition-[grid-template-rows] duration-300 ease-in-out', tagsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="min-h-0 overflow-hidden">
                {tags.length === 0 && !isCollapsed ? (
                  <p className="px-5 py-1.5 text-xs text-text-muted">
                    Noch keine Tags
                  </p>
                ) : (
                  <div className="flex flex-col gap-0.5 px-1">
                    {tags.map((tag) => {
                  const isTagActive = currentView === 'tag' && selectedTagId === tag.id;
                  return (
                  <button
                    key={tag.id}
                    onClick={() => onViewChange('tag', tag.id)}
                    onContextMenu={(e) => handleTagRightClick(e, tag)}
                    onMouseEnter={handleButtonHover}
                    className={clsx(
                      'relative z-10 flex w-full items-center rounded-xl py-2.5 transition-[background,box-shadow,color,opacity] duration-300 ease-in-out',
                      isTagActive
                        ? 'sidebar-item-active text-text-primary'
                        : ''
                    )}
                    title={isCollapsed ? tag.name : undefined}
                  >
                    <span className="w-[4.25rem] flex-shrink-0 flex items-center justify-start pl-5">
                      <span className="relative">
                        <Tag
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: tag.color }}
                        />
                        {(tag.notes?.length ?? 0) > 0 && (
                          <span className={clsx(
                            "absolute bottom-1 left-[calc(100%-5px)] text-[9px] leading-none font-semibold text-text-secondary rounded-full px-[2px] shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--color-text-secondary)_25%,transparent)] transition-opacity duration-300 ease-in-out overflow-hidden",
                            isCollapsed ? "opacity-100 delay-[50ms]" : "opacity-0"
                          )}>
                            <span className="absolute inset-0 rounded-full backdrop-blur-xl glass-bg" />
                            <span className="relative z-10 text-text-secondary font-ui">{tag.notes?.length}</span>
                          </span>
                        )}
                      </span>
                    </span>
                    <div className={clsx(
                      "-ml-3 flex items-center space-x-2 flex-1 min-w-0 transition-opacity duration-300 ease-in-out",
                      isCollapsed ? "opacity-0" : "opacity-100 delay-[50ms]"
                    )}>
                      <span className="text-base truncate whitespace-nowrap">
                        {tag.name}
                      </span>
                    </div>
                    {tag.notes && tag.notes.length > 0 && (
                      <span className={clsx(
                        "font-ui text-xs text-text-muted flex-shrink-0 w-4 text-center transition-opacity duration-300 ease-in-out ml-2 mr-2",
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
            </div>
          </div>

        </nav>

        {showFocusTimer && <FocusTimer isCollapsed={isCollapsed} />}

        {/* Footer: collapsed = Icons oben; Zeile immer gleich — Name + Icons blenden wie Nav-Labels ein */}
        <div
          className={clsx(
            'mt-auto border-t border-divider overflow-x-hidden py-2 flex flex-col transition-[gap] duration-300 ease-in-out',
            isCollapsed ? 'gap-0' : 'gap-1'
          )}
        >
          <div
            className={clsx(
              'grid transition-[grid-template-rows] duration-300 ease-in-out',
              isCollapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            )}
            aria-hidden={!isCollapsed}
          >
            <div className={clsx('min-h-0 overflow-hidden', !isCollapsed && 'pointer-events-none')}>
              <div ref={footerBtnsCollapsedRef} className="relative flex w-full flex-col items-center gap-0" onMouseLeave={onFooterBtnsCollapsedLeave}>
                {footerBtnsCollapsedPill && (
                  <div className="glass-pill glass-pill-circle pointer-events-none" style={{ left: footerBtnsCollapsedPill.left, top: footerBtnsCollapsedPill.top, width: footerBtnsCollapsedPill.width, height: footerBtnsCollapsedPill.height, opacity: footerBtnsCollapsedPill.visible ? 1 : 0 }} />
                )}
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  onMouseEnter={onFooterBtnsCollapsedEnter}
                  onMouseLeave={onFooterBtnsCollapsedLeave}
                  className="icon-btn-md rounded-full flex items-center justify-center relative z-10"
                  title="Einstellungen"
                  aria-label="Einstellungen"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <DarkModeToggle className="icon-btn-md rounded-full flex items-center justify-center relative z-10" onMouseEnter={onFooterBtnsCollapsedEnter} onMouseLeave={onFooterBtnsCollapsedLeave} />
              </div>
            </div>
          </div>

          <div className="flex h-11 w-full flex-shrink-0 items-center gap-1 pr-4 pl-0">
            <div className="w-[4.25rem] flex-shrink-0 flex items-center justify-center">
              {isCollapsed ? (
                <div className="relative p-1 group">
                  <div className="glass-pill glass-pill-circle opacity-0 group-hover:opacity-100" style={{ inset: 0, transition: 'opacity 0.18s ease' }} />
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    title="Kontoeinstellungen"
                    aria-label="Profil & Konto öffnen"
                    className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-text-primary border border-[color-mix(in_srgb,var(--color-border-default)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-bg-elevated)_80%,transparent)] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                  >
                    {user?.avatarUrl ? (
                      <img src={`${API_URL}${user.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      displayInitial
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  title="Profil öffnen"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-text-primary border border-[color-mix(in_srgb,var(--color-border-default)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-bg-elevated)_80%,transparent)] overflow-hidden transition-all duration-200 hover:ring-2 hover:ring-[color-mix(in_srgb,var(--color-brand-primary)_35%,transparent)] active:scale-[0.95]"
                >
                  {user?.avatarUrl ? (
                    <img src={`${API_URL}${user.avatarUrl}`} alt={user?.name || 'Profilbild'} className="w-full h-full object-cover" />
                  ) : (
                    displayInitial
                  )}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className={clsx(
                'flex-1 min-w-0 flex items-center gap-1 -ml-3 text-base whitespace-nowrap transition-opacity duration-300 ease-in-out',
                isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-[50ms]'
              )}
              title="Kontoeinstellungen"
            >
              <span className="truncate">{user?.name || user?.email || 'Profil'}</span>
              <ChevronDown className={clsx("w-3 h-3 flex-shrink-0 mt-0.5 transition-transform duration-200", showProfileModal && "rotate-180")} />
            </button>
            <div
              ref={footerBtnsRef}
              className={clsx(
                'relative flex items-center gap-0.5 flex-shrink-0 transition-opacity duration-300 ease-in-out',
                isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-[50ms]'
              )}
              onMouseLeave={onFooterBtnsLeave}
            >
              {footerBtnsPill && (
                <div className="glass-pill glass-pill-circle pointer-events-none" style={{ left: footerBtnsPill.left, top: footerBtnsPill.top, width: footerBtnsPill.width, height: footerBtnsPill.height, opacity: footerBtnsPill.visible ? 1 : 0 }} />
              )}
              <DarkModeToggle className="icon-btn-md rounded-full flex items-center justify-center relative z-10" onMouseEnter={onFooterBtnsEnter} onMouseLeave={onFooterBtnsLeave} />
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                onMouseEnter={onFooterBtnsEnter}
                onMouseLeave={onFooterBtnsLeave}
                className="icon-btn-md rounded-full flex items-center justify-center relative z-10"
                title="Einstellungen"
                aria-label="Einstellungen"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </aside>

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

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

      {/* Delete Tag Modal */}
      <Modal
        isOpen={showDeleteTagModal}
        onClose={() => setShowDeleteTagModal(false)}
        title="Tag löschen?"
        showFooter
        confirmLabel="Löschen"
        onConfirm={confirmDeleteTag}
        confirmVariant="danger"
      >
        <p className="text-sm text-text-secondary">
          Möchtest du den Tag „{tagToDelete?.name}" wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
        </p>
      </Modal>

      {/* Delete Folder Modal */}
      <Modal
        isOpen={showDeleteFolderModal}
        onClose={() => setShowDeleteFolderModal(false)}
        title="Ordner löschen?"
        showFooter
        confirmLabel="Löschen"
        onConfirm={confirmDeleteFolder}
        confirmVariant="danger"
      >
        <p className="text-sm text-text-secondary">
          Möchtest du den Ordner „{folderToDelete?.name}" wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
        </p>
      </Modal>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        items={[
          { icon: <Edit className="w-4 h-4" />, label: 'Bearbeiten', onClick: contextMenu.tag ? handleEditTag : handleEditFolder },
          { icon: <Trash2 className="w-4 h-4" />, label: 'Löschen', onClick: contextMenu.tag ? handleDeleteTag : handleDeleteFolder, variant: 'danger' },
        ]}
        minWidth="160px"
      />
    </>
  );
};

export default Sidebar;

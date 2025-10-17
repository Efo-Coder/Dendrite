import { useEffect, useState } from 'react';
import { FileText, Star, Folder, Tag, Trash2, Archive, Plus } from 'lucide-react';
import { useFolderStore } from '../store/useFolderStore';
import { useTagStore } from '../store/useTagStore';
import clsx from 'clsx';
import CreateFolderModal from './modals/CreateFolderModal';
import CreateTagModal from './modals/CreateTagModal';

type ViewType = 'all' | 'favorites' | 'archive' | 'trash' | 'folder' | 'tag';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType, id?: string) => void;
  selectedFolderId?: string;
  selectedTagId?: string;
  refreshTrigger?: number;
}

const Sidebar = ({ currentView, onViewChange, selectedFolderId, selectedTagId, refreshTrigger }: SidebarProps) => {
  const { folders, fetchFolders } = useFolderStore();
  const { tags, fetchTags } = useTagStore();
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  useEffect(() => {
    fetchFolders();
    fetchTags();
  }, [fetchFolders, fetchTags, refreshTrigger]);

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
      <aside className="w-64 bg-dark-surface border-r border-dark-border flex flex-col">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center border-b border-dark-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-accent-green-500/10 rounded-lg flex items-center justify-center border border-accent-green-500/20">
              <FileText className="w-4 h-4 text-accent-green-500" />
            </div>
            <h1 className="text-xl font-bold text-dark-text-primary">Dendrite</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Main Menu */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={clsx(
                  'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-accent-green-500/10 text-accent-green-500 font-medium'
                    : 'text-dark-text-secondary hover:bg-dark-elevated hover:text-dark-text-primary'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="pt-4 pb-2">
            <div className="h-px bg-dark-border" />
          </div>

          {/* Folders Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold text-dark-text-muted uppercase tracking-wider">
                Ordner
              </span>
              <button
                onClick={() => setShowFolderModal(true)}
                className="text-dark-text-muted hover:text-accent-green-500 transition-colors"
                title="Neuer Ordner"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {folders.length === 0 ? (
              <p className="px-3 py-2 text-xs text-dark-text-muted italic">
                Keine Ordner vorhanden
              </p>
            ) : (
              <div className="space-y-0.5">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => onViewChange('folder', folder.id)}
                    className={clsx(
                      'w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200',
                      currentView === 'folder' && selectedFolderId === folder.id
                        ? 'bg-accent-green-500/10 text-accent-green-500 font-medium'
                        : 'text-dark-text-secondary hover:bg-dark-elevated hover:text-dark-text-primary'
                    )}
                  >
                    <Folder
                      className="w-4 h-4"
                      style={{ color: folder.color || '#10b981' }}
                    />
                    <span className="text-sm truncate">{folder.name}</span>
                    {folder.notes && folder.notes.length > 0 && (
                      <span className="ml-auto text-xs text-dark-text-muted">
                        {folder.notes.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold text-dark-text-muted uppercase tracking-wider">
                Tags
              </span>
              <button
                onClick={() => setShowTagModal(true)}
                className="text-dark-text-muted hover:text-accent-green-500 transition-colors"
                title="Neuer Tag"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {tags.length === 0 ? (
              <p className="px-3 py-2 text-xs text-dark-text-muted italic">
                Keine Tags vorhanden
              </p>
            ) : (
              <div className="space-y-0.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => onViewChange('tag', tag.id)}
                    className={clsx(
                      'w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200',
                      currentView === 'tag' && selectedTagId === tag.id
                        ? 'bg-accent-green-500/10 text-accent-green-500 font-medium'
                        : 'text-dark-text-secondary hover:bg-dark-elevated hover:text-dark-text-primary'
                    )}
                  >
                    <Tag
                      className="w-4 h-4"
                      style={{ color: tag.color }}
                    />
                    <span className="text-sm truncate">{tag.name}</span>
                    {tag.notes && tag.notes.length > 0 && (
                      <span className="ml-auto text-xs text-dark-text-muted">
                        {tag.notes.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
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
    </>
  );
};

export default Sidebar;

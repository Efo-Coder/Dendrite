import { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  X,
} from 'lucide-react';
import clsx from 'clsx';

interface RichTextToolbarProps {
  disabled?: boolean;
}

const RichTextToolbar = ({ disabled = false }: RichTextToolbarProps) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const getCKEditor = () => {
    // Find CKEditor instance
    const editorElement = document.querySelector('.ck-editor__editable');
    if (!editorElement) return null;
    
    // Get CKEditor instance from the element
    return (editorElement as any).ckeditorInstance;
  };

  const execCommand = (command: string, value?: string) => {
    const editor = getCKEditor();
    if (!editor) return;

    try {
      editor.execute(command, value);
    } catch (error) {
      console.warn(`Command ${command} not supported:`, error);
    }
  };

  const insertLink = () => {
    setShowLinkModal(true);
  };

  const insertImage = () => {
    setShowImageModal(true);
  };

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      execCommand('link', linkUrl);
      setLinkUrl('');
      setShowLinkModal(false);
    }
  };

  const handleImageSubmit = () => {
    if (imageUrl.trim()) {
      execCommand('imageInsert', { src: imageUrl });
      setImageUrl('');
      setShowImageModal(false);
    }
  };

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Fett' },
    { icon: Italic, command: 'italic', title: 'Kursiv' },
    { icon: Underline, command: 'underline', title: 'Unterstrichen' },
    { icon: Strikethrough, command: 'strikethrough', title: 'Durchgestrichen' },
    { separator: true },
    { icon: List, command: 'bulletedList', title: 'Aufzählung' },
    { icon: ListOrdered, command: 'numberedList', title: 'Nummerierte Liste' },
    { icon: Quote, command: 'blockQuote', title: 'Zitat' },
    { icon: Code, command: 'codeBlock', title: 'Code' },
    { separator: true },
    { icon: AlignLeft, command: 'alignment', value: 'left', title: 'Linksbündig' },
    { icon: AlignCenter, command: 'alignment', value: 'center', title: 'Zentriert' },
    { icon: AlignRight, command: 'alignment', value: 'right', title: 'Rechtsbündig' },
    { icon: AlignJustify, command: 'alignment', value: 'justify', title: 'Blocksatz' },
    { separator: true },
    { icon: Link, action: insertLink, title: 'Link einfügen' },
    { icon: Image, action: insertImage, title: 'Bild einfügen' },
    { separator: true },
    { icon: Undo, command: 'undo', title: 'Rückgängig' },
    { icon: Redo, command: 'redo', title: 'Wiederholen' },
  ];

  return (
    <div className="h-12 border-b border-dark-border px-6 md:px-12 flex items-center space-x-1 bg-dark-surface">
      {toolbarButtons.map((button, index) => {
        if (button.separator) {
          return <div key={index} className="h-6 w-px bg-dark-border mx-1" />;
        }

        const Icon = button.icon!;
        const handleClick = () => {
          if (button.action) {
            button.action();
          } else if (button.command) {
            execCommand(button.command, button.value);
          }
        };

        return (
          <button
            key={index}
            onClick={handleClick}
            disabled={disabled}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              'text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title={button.title}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
      
      {/* Link Modal */}
      {showLinkModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowLinkModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-dark-surface border border-dark-border rounded-lg p-6 z-50 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-text-primary">Link hinzufügen</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 rounded-lg text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                URL
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLinkSubmit();
                  } else if (e.key === 'Escape') {
                    setShowLinkModal(false);
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-sm text-dark-text-muted hover:text-dark-text-primary transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleLinkSubmit}
                disabled={!linkUrl.trim()}
                className="px-4 py-2 text-sm bg-accent-green-500 text-white rounded-lg hover:bg-accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowImageModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-dark-surface border border-dark-border rounded-lg p-6 z-50 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-text-primary">Bild hinzufügen</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-lg text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Bild-URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleImageSubmit();
                  } else if (e.key === 'Escape') {
                    setShowImageModal(false);
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-sm text-dark-text-muted hover:text-dark-text-primary transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleImageSubmit}
                disabled={!imageUrl.trim()}
                className="px-4 py-2 text-sm bg-accent-green-500 text-white rounded-lg hover:bg-accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RichTextToolbar;

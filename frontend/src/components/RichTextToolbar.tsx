import { useState, useCallback, useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createParagraphNode,
  $isParagraphNode,
  $createTextNode,
  ElementFormatType,
  LexicalNode,
  $getRoot,
} from 'lexical';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import { $isHeadingNode, $createHeadingNode, $createQuoteNode, $isQuoteNode } from '@lexical/rich-text';
import { $setBlocksType, $getSelectionStyleValueForProperty } from '@lexical/selection';
import { $createCodeNode } from '@lexical/code';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html';
import { INSERT_IMAGE_COMMAND } from '../plugins/ImagePlugin';
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
  Heading1,
  Heading2,
  Heading3,
  Upload,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { attachmentService } from '../services/attachment.service';

interface RichTextToolbarProps {
  disabled?: boolean;
  noteId?: string;
}

const RichTextToolbar = ({ disabled = false, noteId }: RichTextToolbarProps) => {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));

      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = element;
          const listType = parentList.getListType();
          setBlockType(listType);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        }
      });
    } else {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  };

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    } else {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  };

  const formatCode = () => {
    if (blockType !== 'code') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
    } else {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  };

  const formatAlignment = (alignment: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const insertLink = () => {
    setShowLinkModal(true);
  };

  const insertImage = () => {
    setShowImageModal(true);
  };

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
      setLinkUrl('');
      setShowLinkModal(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Prüfen, ob es ein Bild ist
      if (!file.type.startsWith('image/')) {
        alert('Bitte wähle eine Bilddatei aus.');
        return;
      }
      // Größenlimit prüfen (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Die Datei ist zu groß. Maximale Größe: 10 MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const insertImageFromUrl = (url: string) => {
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
      altText: 'Uploaded image',
      src: url,
    });
  };

  const handleImageSubmit = async () => {
    if (imageMode === 'url' && imageUrl.trim()) {
      // URL-basiertes Bild einfügen
      insertImageFromUrl(imageUrl);
      setImageUrl('');
      setShowImageModal(false);
    } else if (imageMode === 'upload' && selectedFile) {
      // Datei hochladen (kein noteId nötig, keine DB-Einträge)
      setIsUploading(true);
      try {
        const result = await attachmentService.uploadImage(selectedFile);
        const uploadedImageUrl = attachmentService.getAttachmentUrl(result.url);

        // Hochgeladenes Bild einfügen
        insertImageFromUrl(uploadedImageUrl);

        setSelectedFile(null);
        setShowImageModal(false);
      } catch (error) {
        console.error('Fehler beim Hochladen:', error);
        alert('Fehler beim Hochladen des Bildes. Bitte versuche es erneut.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const toolbarButtons = [
    { icon: Bold, action: () => formatText('bold'), title: 'Fett', isActive: isBold },
    { icon: Italic, action: () => formatText('italic'), title: 'Kursiv', isActive: isItalic },
    { icon: Underline, action: () => formatText('underline'), title: 'Unterstrichen', isActive: isUnderline },
    { icon: Strikethrough, action: () => formatText('strikethrough'), title: 'Durchgestrichen', isActive: isStrikethrough },
    { separator: true },
    { icon: Heading1, action: () => formatHeading('h1'), title: 'Überschrift 1', isActive: blockType === 'h1' },
    { icon: Heading2, action: () => formatHeading('h2'), title: 'Überschrift 2', isActive: blockType === 'h2' },
    { icon: Heading3, action: () => formatHeading('h3'), title: 'Überschrift 3', isActive: blockType === 'h3' },
    { separator: true },
    { icon: List, action: formatBulletList, title: 'Aufzählung', isActive: blockType === 'bullet' },
    { icon: ListOrdered, action: formatNumberedList, title: 'Nummerierte Liste', isActive: blockType === 'number' },
    { icon: Quote, action: formatQuote, title: 'Zitat', isActive: blockType === 'quote' },
    { icon: Code, action: formatCode, title: 'Code', isActive: blockType === 'code' },
    { separator: true },
    { icon: AlignLeft, action: () => formatAlignment('left'), title: 'Linksbündig' },
    { icon: AlignCenter, action: () => formatAlignment('center'), title: 'Zentriert' },
    { icon: AlignRight, action: () => formatAlignment('right'), title: 'Rechtsbündig' },
    { icon: AlignJustify, action: () => formatAlignment('justify'), title: 'Blocksatz' },
    { separator: true },
    { icon: Link, action: insertLink, title: 'Link einfügen' },
    { icon: Image, action: insertImage, title: 'Bild einfügen' },
    { separator: true },
    { icon: Undo, action: () => editor.dispatchCommand(UNDO_COMMAND, undefined), title: 'Rückgängig' },
    { icon: Redo, action: () => editor.dispatchCommand(REDO_COMMAND, undefined), title: 'Wiederholen' },
  ];

  return (
    <div className="p-4 h-8 glass-surface px-6 md:px-12 flex items-center space-x-1">
      {toolbarButtons.map((button, index) => {
        if (button.separator) {
          return <div key={index} className="h-6 w-px bg-white/30 mx-1" />;
        }

        const Icon = button.icon!;
        const handleClick = () => {
          if (button.action) {
            button.action();
          }
        };

        return (
          <button
            key={index}
            onClick={handleClick}
            disabled={disabled}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              button.isActive
                ? 'bg-accent-500/20 text-accent-500'
                : 'text-accent-700 hover-highlight hover:text-accent-900',
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLinkModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-panel rounded-xl shadow-2xl p-6 w-96">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-accent-900">Link hinzufügen</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1.5 rounded-lg text-accent-700 hover-highlight hover:text-accent-900 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-accent-900 mb-2 uppercase tracking-wide">
                URL
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="input w-full text-sm"
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
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-sm text-accent-700 hover:text-accent-900 transition-all relative group"
              >
                <span className="relative">Abbrechen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </button>
              <button
                onClick={handleLinkSubmit}
                disabled={!linkUrl.trim()}
                className="px-4 py-2 text-sm text-accent-700 hover:text-accent-900 transition-all relative group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="relative">Hinzufügen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity"></span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isUploading && setShowImageModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-panel rounded-xl shadow-2xl p-6 w-[450px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-accent-900">Bild hinzufügen</h3>
              <button
                onClick={() => !isUploading && setShowImageModal(false)}
                disabled={isUploading}
                className="p-1.5 rounded-lg text-accent-700 hover-highlight hover:text-accent-900 transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mb-5 p-1">
              <button
                onClick={() => setImageMode('url')}
                disabled={isUploading}
                className={clsx(
                  'flex-1 px-4 py-2 text-sm font-medium transition-all relative group disabled:opacity-50',
                  imageMode === 'url'
                    ? 'text-accent-500'
                    : 'text-accent-700 hover:text-accent-900'
                )}
              >
                <span className="relative">URL</span>
                <span className={clsx(
                  'absolute bottom-0 left-0 right-0 h-0.5 transition-opacity',
                  imageMode === 'url'
                    ? 'bg-gradient-to-r from-transparent via-accent-500 to-transparent opacity-100'
                    : 'bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100'
                )}></span>
              </button>
              <button
                onClick={() => setImageMode('upload')}
                disabled={isUploading}
                className={clsx(
                  'flex-1 px-4 py-2 text-sm font-medium transition-all relative group disabled:opacity-50',
                  imageMode === 'upload'
                    ? 'text-accent-500'
                    : 'text-accent-700 hover:text-accent-900'
                )}
              >
                <span className="relative">Hochladen</span>
                <span className={clsx(
                  'absolute bottom-0 left-0 right-0 h-0.5 transition-opacity',
                  imageMode === 'upload'
                    ? 'bg-gradient-to-r from-transparent via-accent-500 to-transparent opacity-100'
                    : 'bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100'
                )}></span>
              </button>
            </div>

            {/* URL Input */}
            {imageMode === 'url' && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-accent-900 mb-2 uppercase tracking-wide">
                  Bild-URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="input w-full text-sm"
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
            )}

            {/* File Upload */}
            {imageMode === 'upload' && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-accent-900 mb-2 uppercase tracking-wide">
                  Datei auswählen
                </label>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center justify-center space-x-2 px-4 py-6 border-2 border-dashed border-white/30 rounded-xl text-accent-700 hover:border-accent-500/50 hover:text-accent-500 hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {selectedFile ? 'Andere Datei wählen' : 'Datei auswählen'}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile && (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-white/20 border border-white/30 rounded-lg">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Image className="w-4 h-4 text-accent-500 flex-shrink-0" />
                        <span className="text-sm text-accent-900 truncate">
                          {selectedFile.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        disabled={isUploading}
                        className="ml-2 p-1 rounded-md hover-highlight text-accent-700 hover:text-accent-900 transition-all disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-accent-700 text-center">
                    JPG, PNG, GIF, WebP, SVG · max. 10 MB
                  </p>
                </div>
              </div>
            )}


            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowImageModal(false)}
                disabled={isUploading}
                className="px-4 py-2 text-sm text-accent-700 hover:text-accent-900 transition-all relative group disabled:opacity-50"
              >
                <span className="relative">Abbrechen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </button>
              <button
                onClick={handleImageSubmit}
                disabled={
                  isUploading ||
                  (imageMode === 'url' && !imageUrl.trim()) ||
                  (imageMode === 'upload' && !selectedFile)
                }
                className="flex items-center space-x-2 px-4 py-2 text-sm text-accent-700 hover:text-accent-900 transition-all relative group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isUploading && <Loader2 className="w-4 h-4 animate-spin relative" />}
                <span className="relative">{isUploading ? 'Wird hochgeladen...' : 'Hinzufügen'}</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity"></span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RichTextToolbar;

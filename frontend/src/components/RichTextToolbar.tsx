import { useState, useCallback, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createParagraphNode,
  ElementFormatType,
} from 'lexical';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import { $isHeadingNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $createCodeNode } from '@lexical/code';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
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
} from 'lucide-react';
import clsx from 'clsx';

interface RichTextToolbarProps {
  disabled?: boolean;
}

const RichTextToolbar = ({ disabled = false }: RichTextToolbarProps) => {
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

  const handleImageSubmit = () => {
    if (imageUrl.trim()) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const imgElement = document.createElement('img');
          imgElement.src = imageUrl;
          imgElement.style.maxWidth = '100%';
          selection.insertNodes([imgElement as any]);
        }
      });
      setImageUrl('');
      setShowImageModal(false);
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
    <div className="h-12 border-b border-dark-border px-6 md:px-12 flex items-center space-x-1 bg-dark-surface">
      {toolbarButtons.map((button, index) => {
        if (button.separator) {
          return <div key={index} className="h-6 w-px bg-dark-border mx-1" />;
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
                ? 'bg-accent-green-500/20 text-accent-green-500'
                : 'text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary',
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

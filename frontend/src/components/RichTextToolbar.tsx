import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useGlassPill } from '../hooks/useGlassPill';
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
import { INSERT_IMAGE_COMMAND } from '../plugins/ImagePlugin';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Code, Link, Image,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, X, Heading1, Heading2,
  Heading3, Upload, Loader2, MoreHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import { attachmentService } from '../services/attachment.service';

// Pixel widths for overflow calculation (approximate)
const BTN_W = 36;   // p-2 button (32px) + space-x-1 gap (4px)
const SEP_W = 17;   // w-px separator + mx-1 margins + gap
const OVERFLOW_RESERVED = SEP_W + BTN_W; // space reserved for the "..." button

// Stable group button counts → used in ResizeObserver (doesn't change with state)
const GROUP_WIDTHS = [
  4 * BTN_W,          // format: Bold, Italic, Underline, Strikethrough
  SEP_W + 3 * BTN_W, // headings: H1, H2, H3
  SEP_W + 4 * BTN_W, // lists: List, ListOrdered, Quote, Code
  SEP_W + 4 * BTN_W, // align: Left, Center, Right, Justify
  SEP_W + 2 * BTN_W, // insert: Link, Image
  SEP_W + 2 * BTN_W, // history: Undo, Redo
];

interface RichTextToolbarProps {
  disabled?: boolean;
  noteId?: string;
}

type ToolbarBtn = {
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  title: string;
  isActive?: boolean;
};

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
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Overflow
  const containerRef = useRef<HTMLDivElement>(null);
  const overflowDropdownRef = useRef<HTMLDivElement>(null);
  const [visibleGroupCount, setVisibleGroupCount] = useState(GROUP_WIDTHS.length);
  const [showOverflow, setShowOverflow] = useState(false);

  const { pill, onEnter, onLeave } = useGlassPill(containerRef);
  const { pill: overflowPill, onEnter: onOverflowEnter, onLeave: onOverflowLeave } = useGlassPill(overflowDropdownRef);

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
          setBlockType(element.getListType());
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          setBlockType(type);
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => { updateToolbar(); });
    });
  }, [editor, updateToolbar]);

  // ResizeObserver: determine how many groups fit
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.width - OVERFLOW_RESERVED;
      let total = 0;
      let count = 0;
      for (const w of GROUP_WIDTHS) {
        if (total + w > available) break;
        total += w;
        count++;
      }
      setVisibleGroupCount(Math.max(1, count));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () =>
          blockType !== headingSize ? $createHeadingNode(headingSize) : $createParagraphNode()
        );
      }
    });
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
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () =>
          blockType !== 'quote' ? $createQuoteNode() : $createParagraphNode()
        );
      }
    });
  };

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () =>
          blockType !== 'code' ? $createCodeNode() : $createParagraphNode()
        );
      }
    });
  };

  const formatAlignment = (alignment: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const insertLink = () => setShowLinkModal(true);
  const insertImage = () => setShowImageModal(true);

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
      setLinkUrl('');
      setShowLinkModal(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Bitte wähle eine Bilddatei aus.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Die Datei ist zu groß. Maximale Größe: 10 MB'); return; }
    setSelectedFile(file);
  };

  const insertImageFromUrl = (url: string) => {
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { altText: 'Uploaded image', src: url });
  };

  const handleImageSubmit = async () => {
    if (imageMode === 'url' && imageUrl.trim()) {
      insertImageFromUrl(imageUrl);
      setImageUrl('');
      setShowImageModal(false);
    } else if (imageMode === 'upload' && selectedFile) {
      setIsUploading(true);
      try {
        const result = await attachmentService.uploadImage(selectedFile);
        insertImageFromUrl(attachmentService.getAttachmentUrl(result.url));
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

  // Button groups (recomputed each render so isActive reflects current state)
  const buttonGroups: { id: string; buttons: ToolbarBtn[] }[] = [
    {
      id: 'format',
      buttons: [
        { icon: Bold, action: () => formatText('bold'), title: 'Fett', isActive: isBold },
        { icon: Italic, action: () => formatText('italic'), title: 'Kursiv', isActive: isItalic },
        { icon: Underline, action: () => formatText('underline'), title: 'Unterstrichen', isActive: isUnderline },
        { icon: Strikethrough, action: () => formatText('strikethrough'), title: 'Durchgestrichen', isActive: isStrikethrough },
      ],
    },
    {
      id: 'headings',
      buttons: [
        { icon: Heading1, action: () => formatHeading('h1'), title: 'Überschrift 1', isActive: blockType === 'h1' },
        { icon: Heading2, action: () => formatHeading('h2'), title: 'Überschrift 2', isActive: blockType === 'h2' },
        { icon: Heading3, action: () => formatHeading('h3'), title: 'Überschrift 3', isActive: blockType === 'h3' },
      ],
    },
    {
      id: 'lists',
      buttons: [
        { icon: List, action: formatBulletList, title: 'Aufzählung', isActive: blockType === 'bullet' },
        { icon: ListOrdered, action: formatNumberedList, title: 'Nummerierte Liste', isActive: blockType === 'number' },
        { icon: Quote, action: formatQuote, title: 'Zitat', isActive: blockType === 'quote' },
        { icon: Code, action: formatCode, title: 'Code', isActive: blockType === 'code' },
      ],
    },
    {
      id: 'align',
      buttons: [
        { icon: AlignLeft, action: () => formatAlignment('left'), title: 'Linksbündig' },
        { icon: AlignCenter, action: () => formatAlignment('center'), title: 'Zentriert' },
        { icon: AlignRight, action: () => formatAlignment('right'), title: 'Rechtsbündig' },
        { icon: AlignJustify, action: () => formatAlignment('justify'), title: 'Blocksatz' },
      ],
    },
    {
      id: 'insert',
      buttons: [
        { icon: Link, action: insertLink, title: 'Link einfügen' },
        { icon: Image, action: insertImage, title: 'Bild einfügen' },
      ],
    },
    {
      id: 'history',
      buttons: [
        { icon: Undo, action: () => editor.dispatchCommand(UNDO_COMMAND, undefined), title: 'Rückgängig' },
        { icon: Redo, action: () => editor.dispatchCommand(REDO_COMMAND, undefined), title: 'Wiederholen' },
      ],
    },
  ];

  const visibleGroups = buttonGroups.slice(0, visibleGroupCount);
  const overflowGroups = buttonGroups.slice(visibleGroupCount);

  const renderBtn = (
    btn: ToolbarBtn,
    key: number,
    enterFn: (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => void = onEnter,
  ) => (
    <button
      key={key}
      onClick={btn.action}
      onMouseEnter={(e) => enterFn(e, !!btn.isActive)}
      disabled={disabled}
      className={clsx(
        'p-2 rounded-lg transition-colors flex-shrink-0 relative z-10',
        btn.isActive ? 'text-accent-brand' : 'text-accent-fg',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      title={btn.title}
    >
      <btn.icon className="w-4 h-4" />
    </button>
  );

  return (
    /* Wrapper — relative but NO backdrop-filter, so dropdown renders on top of editor */
    <div className="relative">
    <div ref={containerRef} className="p-4 h-8 glass-header px-6 flex items-center gap-1 relative" style={{ boxShadow: '0 12px 12px rgba(15, 23, 42, 0.08)' }} onMouseLeave={onLeave}>
      {pill && (
        <div
          className="glass-pill"
          style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
        />
      )}
      {/* Visible groups */}
      {visibleGroups.map((group) => (
        <Fragment key={group.id}>
          {group.buttons.map((btn, bi) => renderBtn(btn, bi))}
        </Fragment>
      ))}

      {/* Overflow "..." button — no dropdown here, rendered outside below */}
      {overflowGroups.length > 0 && (
        <>
          <div className="h-6 w-px glass-divider -mx-1 flex-shrink-0" />
          <button
            onClick={() => setShowOverflow(v => !v)}
            onMouseEnter={(e) => onEnter(e, showOverflow)}
            className={clsx(
              'p-2 rounded-lg transition-colors flex-shrink-0 relative z-10',
              showOverflow ? 'text-accent-brand' : 'text-accent-fg'
            )}
            title="Weitere Optionen"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </>
      )}
    </div>

    {/* Overflow dropdown — sibling of toolbar, outside backdrop-filter stacking context */}
    {showOverflow && overflowGroups.length > 0 && (
      <>
        <div className="fixed inset-0" onClick={() => setShowOverflow(false)} />
        <div ref={overflowDropdownRef} className="absolute top-full right-0 mt-1 glass-panel rounded-xl shadow-xl p-2 z-50" onMouseLeave={onOverflowLeave}>
          {overflowPill && (
            <div
              className="glass-pill"
              style={{ left: overflowPill.left, top: overflowPill.top, width: overflowPill.width, height: overflowPill.height }}
            />
          )}
          {overflowGroups.map((group, gi) => (
            <Fragment key={group.id}>
              {gi > 0 && <div className="h-px glass-divider my-1.5" />}
              <div className="flex items-center gap-0.5">
                {group.buttons.map((btn, bi) => renderBtn(btn, bi, onOverflowEnter))}
              </div>
            </Fragment>
          ))}
        </div>
      </>
    )}

      {/* Link Modal */}
      {showLinkModal && createPortal(
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowLinkModal(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 glass-panel rounded-xl shadow-2xl p-6 w-96">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-accent-fg">Link hinzufügen</h3>
              <button onClick={() => setShowLinkModal(false)} className="p-1.5 text-accent-subtle hover-text-themed transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-accent-fg mb-2 uppercase tracking-wide">URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="input w-full text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLinkSubmit();
                  else if (e.key === 'Escape') setShowLinkModal(false);
                }}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-sm text-accent-subtle hover-text-themed transition-all relative group">
                <span className="relative">Abbrechen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button onClick={handleLinkSubmit} disabled={!linkUrl.trim()} className="px-4 py-2 text-sm text-accent-subtle hover-text-themed transition-all relative group disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="relative">Hinzufügen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity" />
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Image Modal */}
      {showImageModal && createPortal(
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => !isUploading && setShowImageModal(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 glass-panel rounded-xl shadow-2xl p-6 w-[450px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-accent-fg">Bild hinzufügen</h3>
              <button onClick={() => !isUploading && setShowImageModal(false)} disabled={isUploading} className="p-1.5 text-accent-subtle hover-text-themed transition-colors disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex space-x-1 mb-5 p-1">
              {(['url', 'upload'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setImageMode(mode)}
                  disabled={isUploading}
                  className={clsx(
                    'flex-1 px-4 py-2 text-sm font-medium transition-all relative group disabled:opacity-50',
                    imageMode === mode ? 'text-accent-brand' : 'text-accent-subtle hover-text-themed'
                  )}
                >
                  <span className="relative">{mode === 'url' ? 'URL' : 'Hochladen'}</span>
                  <span className={clsx(
                    'absolute bottom-0 left-0 right-0 h-0.5 transition-opacity',
                    imageMode === mode
                      ? 'bg-gradient-to-r from-transparent via-accent-brand to-transparent opacity-100'
                      : 'bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100'
                  )} />
                </button>
              ))}
            </div>

            {imageMode === 'url' && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-accent-fg mb-2 uppercase tracking-wide">Bild-URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="input w-full text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleImageSubmit();
                    else if (e.key === 'Escape') setShowImageModal(false);
                  }}
                />
              </div>
            )}

            {imageMode === 'upload' && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-accent-fg mb-2 uppercase tracking-wide">Datei auswählen</label>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center justify-center space-x-2 px-4 py-6 border-2 border-dashed border-white/30 rounded-xl text-accent-subtle hover:border-accent-brand/50 hover:text-accent-brand hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-sm font-medium">{selectedFile ? 'Andere Datei wählen' : 'Datei auswählen'}</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  {selectedFile && (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-white/20 border border-white/30 rounded-lg">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Image className="w-4 h-4 text-accent-brand flex-shrink-0" />
                        <span className="text-sm text-accent-fg truncate">{selectedFile.name}</span>
                      </div>
                      <button onClick={() => setSelectedFile(null)} disabled={isUploading} className="ml-2 p-1 rounded-md hover-highlight text-accent-subtle hover-text-themed transition-all disabled:opacity-50">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-accent-subtle text-center">JPG, PNG, GIF, WebP, SVG · max. 10 MB</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowImageModal(false)} disabled={isUploading} className="px-4 py-2 text-sm text-accent-subtle hover-text-themed transition-all relative group disabled:opacity-50">
                <span className="relative">Abbrechen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={handleImageSubmit}
                disabled={isUploading || (imageMode === 'url' && !imageUrl.trim()) || (imageMode === 'upload' && !selectedFile)}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-accent-subtle hover-text-themed transition-all relative group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isUploading && <Loader2 className="w-4 h-4 animate-spin relative" />}
                <span className="relative">{isUploading ? 'Wird hochgeladen...' : 'Hinzufügen'}</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity" />
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default RichTextToolbar;

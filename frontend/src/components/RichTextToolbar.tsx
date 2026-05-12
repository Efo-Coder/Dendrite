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
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  COMMAND_PRIORITY_LOW,
  $createParagraphNode,
  ElementFormatType,
  $isTextNode,
  LexicalNode,
} from 'lexical';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
  $isListItemNode,
} from '@lexical/list';
import { $isHeadingNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType, $patchStyleText } from '@lexical/selection';
import { $createCodeNode } from '@lexical/code';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { INSERT_IMAGE_COMMAND } from '../plugins/ImagePlugin';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, ListChecks, Quote, Code, Link, Image,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, X,
  Heading, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  Upload, Loader2, Highlighter, ChevronDown, Pipette, Plus, Clock,
  IndentIncrease, IndentDecrease,
} from 'lucide-react';
import { useCheckResetStore, ResetTimer } from '../store/useCheckResetStore';

function generateResetId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
import { HexColorPicker, HexColorInput } from 'react-colorful';
import clsx from 'clsx';
import { attachmentService } from '../services/attachment.service';


const FONT_FAMILIES: { label: string; value: string; previewStyle?: string }[] = [
  { label: 'Standard', value: '' },
  { label: 'Sans', value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, ui-serif, serif', previewStyle: 'Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, Menlo, monospace', previewStyle: 'monospace' },
  { label: 'Kursiv', value: 'cursive' },
];

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];

const TEXT_COLORS = [
  { label: 'Standard', value: '' },
  { label: 'Schwarz', value: '#111827' },
  { label: 'Dunkelgrau', value: '#4b5563' },
  { label: 'Grau', value: '#9ca3af' },
  { label: 'Rot', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Gelb', value: '#eab308' },
  { label: 'Grün', value: '#22c55e' },
  { label: 'Blau', value: '#3b82f6' },
  { label: 'Lila', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Keine', value: '' },
  { label: 'Gelb', value: '#fef08a' },
  { label: 'Grün', value: '#bbf7d0' },
  { label: 'Blau', value: '#bfdbfe' },
  { label: 'Pink', value: '#fce7f3' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Lila', value: '#e9d5ff' },
];

const hexToRgb = (hex: string) => {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
};

const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');

const hexToHsl = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, l: 0 };
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToHex = (h: number, s: number, l: number) => {
  const sl = s / 100, ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const parseStyle = (styleStr: string): Record<string, string> => {
  const result: Record<string, string> = {};
  styleStr.split(';').forEach(part => {
    const colonIdx = part.indexOf(':');
    if (colonIdx > -1) {
      const key = part.slice(0, colonIdx).trim();
      const value = part.slice(colonIdx + 1).trim();
      if (key) result[key] = value;
    }
  });
  return result;
};

const mergeStyle = (existingStyle: string, patch: Record<string, string>): string => {
  const styles = parseStyle(existingStyle);
  for (const [k, v] of Object.entries(patch)) {
    if (v) styles[k] = v;
    else delete styles[k];
  }
  return Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join('; ');
};

interface RichTextToolbarProps {
  disabled?: boolean;
  noteId?: string;
}

type ToolbarBtn = {
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  actionWithEvent?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  isActive?: boolean;
  isDisabled?: boolean;
};

const RichTextToolbar = ({ disabled = false }: RichTextToolbarProps) => {
  const [editor] = useLexicalComposerContext();
  const { timers, setTimer, removeTimer } = useCheckResetStore();

  // Format state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [canOutdent, setCanOutdent] = useState(false);

  // Styling state
  const [fontColor, setFontColor] = useState('');
  const [highlightColor, setHighlightColor] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [fontSize, setFontSize] = useState('');

  const [colorInputMode, setColorInputMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [favoriteColors, setFavoriteColors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dendrite-favorite-colors') || '[]'); }
    catch { return []; }
  });
  const [highlightInputMode, setHighlightInputMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [favoriteHighlights, setFavoriteHighlights] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dendrite-favorite-highlights') || '[]'); }
    catch { return []; }
  });

  // Popup positions (null = closed)
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [highlightPickerPos, setHighlightPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [fontFamilyPos, setFontFamilyPos] = useState<{ x: number; y: number } | null>(null);
  const [fontSizePos, setFontSizePos] = useState<{ x: number; y: number } | null>(null);
  const [headingPickerPos, setHeadingPickerPos] = useState<{ x: number; y: number } | null>(null);

  // Modals
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checklistItemElRef = useRef<HTMLElement | null>(null);
  const [checklistMenuPos, setChecklistMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [checklistTimerType, setChecklistTimerType] = useState<'daily' | 'countdown'>('daily');
  const [checklistDailyTime, setChecklistDailyTime] = useState('00:00');
  const [checklistCountdownHours, setChecklistCountdownHours] = useState(1);
  const [checklistCountdownMinutes, setChecklistCountdownMinutes] = useState(0);
  const [checklistExistingTimer, setChecklistExistingTimer] = useState<ResetTimer | undefined>(undefined);

  const containerRef = useRef<HTMLDivElement>(null);

  // Popup refs for glass pill
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const headingPickerRef = useRef<HTMLDivElement>(null);
  const colorModeTabsRef = useRef<HTMLDivElement>(null);
  const highlightModeTabsRef = useRef<HTMLDivElement>(null);

  const { pill, onEnter, onLeave } = useGlassPill(containerRef);
  const { pill: fontFamilyPill, onEnter: onFontFamilyEnter, onLeave: onFontFamilyLeave } = useGlassPill(fontFamilyRef);
  const { pill: headingPill, onEnter: onHeadingEnter, onLeave: onHeadingLeave } = useGlassPill(headingPickerRef);
  const { pill: colorModePill, onEnter: onColorModeEnter, onLeave: onColorModeLeave } = useGlassPill(colorModeTabsRef);
  const { pill: highlightModePill, onEnter: onHighlightModeEnter, onLeave: onHighlightModeLeave } = useGlassPill(highlightModeTabsRef);

  // Font size pill: container-relative position + scrollTop so it stays correct while scrolling
  const [fontSizePillRect, setFontSizePillRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const onFontSizeItemEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const container = fontSizeRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = e.currentTarget.getBoundingClientRect();
    const style = getComputedStyle(container);
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    setFontSizePillRect({
      left: bRect.left - cRect.left - borderLeft,
      top: bRect.top - cRect.top - borderTop + container.scrollTop,
      width: bRect.width,
      height: bRect.height,
    });
  };

  const closeAllPopups = () => {
    setColorPickerPos(null);
    setHighlightPickerPos(null);
    setFontFamilyPos(null);
    setFontSizePos(null);
    setHeadingPickerPos(null);
    setChecklistMenuPos(null);
  };

  const openChecklistMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    closeAllPopups();

    let existingTimer: ResetTimer | undefined;
    editor.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      let node: LexicalNode | null = selection.anchor.getNode();
      while (node && !$isListItemNode(node)) node = node.getParent();
      if (!$isListItemNode(node)) return;
      const domEl = editor.getElementByKey(node.getKey()) as HTMLElement | null;
      if (!domEl) return;
      checklistItemElRef.current = domEl;
      const resetId = domEl.dataset.resetId;
      if (resetId) existingTimer = timers[resetId];
    });

    setChecklistExistingTimer(existingTimer);
    setChecklistTimerType(existingTimer?.type ?? 'daily');
    setChecklistDailyTime(existingTimer?.type === 'daily' ? existingTimer.time : '00:00');
    const remaining = existingTimer?.type === 'countdown' ? Math.max(0, existingTimer.endsAt - Date.now()) : 0;
    setChecklistCountdownHours(existingTimer?.type === 'countdown' ? Math.floor(remaining / 3_600_000) : 1);
    setChecklistCountdownMinutes(existingTimer?.type === 'countdown' ? Math.floor((remaining % 3_600_000) / 60_000) : 0);

    setChecklistMenuPos({ x: rect.left, y: rect.bottom + 4 });
  };

  const handleChecklistTimerSave = () => {
    const el = checklistItemElRef.current;
    if (!el) { setChecklistMenuPos(null); return; }
    let resetId = el.dataset.resetId;
    if (!resetId) {
      resetId = generateResetId();
      el.dataset.resetId = resetId;
    }
    const ms = (checklistCountdownHours * 60 + checklistCountdownMinutes) * 60_000;
    if (checklistTimerType === 'countdown' && ms <= 0) return;
    const timer: ResetTimer = checklistTimerType === 'daily'
      ? { type: 'daily', time: checklistDailyTime }
      : { type: 'countdown', endsAt: Date.now() + ms, totalMs: ms };
    setTimer(resetId, timer);
    setChecklistMenuPos(null);
  };

  const handleChecklistTimerRemove = () => {
    const el = checklistItemElRef.current;
    if (el?.dataset.resetId) {
      removeTimer(el.dataset.resetId);
      delete el.dataset.resetId;
    }
    setChecklistMenuPos(null);
  };

  const openColorPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    closeAllPopups();
    setColorPickerPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4 });
  };

  const openHighlightPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    closeAllPopups();
    setHighlightPickerPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4 });
  };

  const openFontFamilyMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    closeAllPopups();
    setFontFamilyPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4 });
  };

  const openFontSizeMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    closeAllPopups();
    setFontSizePos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4 });
  };

  const openHeadingPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    closeAllPopups();
    setHeadingPickerPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4 });
  };

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

      // Read inline styles — merge node style with pending selection.style for collapsed cursor
      const nodeStyles = $isTextNode(anchorNode) ? parseStyle(anchorNode.getStyle()) : {};
      const pendingStyles = selection.isCollapsed() && selection.style ? parseStyle(selection.style) : {};
      const styles = { ...nodeStyles, ...pendingStyles };
      setFontColor(styles['color'] || '');
      setHighlightColor(styles['background-color'] || '');
      setFontFamily(styles['font-family'] || '');
      const rawSize = styles['font-size'] || '';
      setFontSize(rawSize ? rawSize.replace('px', '') : '');

      // Compute canOutdent: walk up from anchor to count ListItemNode ancestors
      let node: LexicalNode | null = anchorNode;
      let listItemCount = 0;
      let inList = false;
      while (node !== null) {
        if ($isListItemNode(node)) {
          listItemCount++;
          inList = true;
          if (listItemCount >= 2) break;
        }
        node = node.getParent();
      }
      if (inList) {
        setCanOutdent(listItemCount >= 2);
      } else {
        const topEl = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
        const indent = typeof (topEl as any).getIndent === 'function' ? (topEl as any).getIndent() : 0;
        setCanOutdent(indent > 0);
      }
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => { updateToolbar(); });
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    const unregUndo = editor.registerCommand(CAN_UNDO_COMMAND, (payload) => { setCanUndo(payload); return false; }, COMMAND_PRIORITY_LOW);
    const unregRedo = editor.registerCommand(CAN_REDO_COMMAND, (payload) => { setCanRedo(payload); return false; }, COMMAND_PRIORITY_LOW);
    return () => { unregUndo(); unregRedo(); };
  }, [editor]);


  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') => {
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

  const formatCheckList = () => {
    if (blockType !== 'check') {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const indentContent = () => {
    editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
  };

  const outdentContent = () => {
    editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
  };

  const formatAlignment = (alignment: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const applyFontColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color: color || '' });
        if (selection.isCollapsed()) {
          selection.style = mergeStyle(selection.style, { color: color || '' });
        }
      }
    });
    setFontColor(color);
  };

  const applyHighlight = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'background-color': color || '' });
        if (selection.isCollapsed()) {
          selection.style = mergeStyle(selection.style, { 'background-color': color || '' });
        }
      }
    });
    setHighlightColor(color);
  };

  const applyFontFamily = (family: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-family': family || '' });
        if (selection.isCollapsed()) {
          selection.style = mergeStyle(selection.style, { 'font-family': family || '' });
        }
      }
    });
    setFontFamily(family);
  };

  const applyFontSize = (size: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-size': size ? `${size}px` : '' });
        if (selection.isCollapsed()) {
          selection.style = mergeStyle(selection.style, { 'font-size': size ? `${size}px` : '' });
        }
      }
    });
    setFontSize(size);
  };

  const addToFavorites = () => {
    if (!fontColor || favoriteColors.includes(fontColor) || TEXT_COLORS.some(c => c.value === fontColor) || favoriteColors.length >= 13) return;
    const next = [...favoriteColors, fontColor];
    setFavoriteColors(next);
    localStorage.setItem('dendrite-favorite-colors', JSON.stringify(next));
  };

  const removeFromFavorites = (color: string) => {
    const next = favoriteColors.filter(c => c !== color);
    setFavoriteColors(next);
    localStorage.setItem('dendrite-favorite-colors', JSON.stringify(next));
  };

  const addToHighlightFavorites = () => {
    if (!highlightColor || favoriteHighlights.includes(highlightColor) || HIGHLIGHT_COLORS.some(c => c.value === highlightColor) || favoriteHighlights.length >= 13) return;
    const next = [...favoriteHighlights, highlightColor];
    setFavoriteHighlights(next);
    localStorage.setItem('dendrite-favorite-highlights', JSON.stringify(next));
  };

  const removeFromHighlightFavorites = (color: string) => {
    const next = favoriteHighlights.filter(c => c !== color);
    setFavoriteHighlights(next);
    localStorage.setItem('dendrite-favorite-highlights', JSON.stringify(next));
  };

  const openEyeDropper = async () => {
    if (!('EyeDropper' in window)) return;
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const { sRGBHex } = await eyeDropper.open();
      applyFontColor(sRGBHex);
    } catch {
      // user cancelled
    }
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

  const insertImageFromUrl = (url: string, altText?: string) => {
    const name = altText || url.split('/').pop()?.split('?')[0] || 'Uploaded Image';
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { altText: name, src: url });
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
        insertImageFromUrl(attachmentService.getAttachmentUrl(result.url), selectedFile.name);
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

  const fontFamilyLabel = FONT_FAMILIES.find(f => f.value === fontFamily)?.label ?? 'Sans';

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
      id: 'lists',
      buttons: [
        { icon: List, action: formatBulletList, title: 'Aufzählung', isActive: blockType === 'bullet' },
        { icon: ListOrdered, action: formatNumberedList, title: 'Nummerierte Liste', isActive: blockType === 'number' },
        { icon: ListChecks, action: formatCheckList, actionWithEvent: (e) => blockType === 'check' ? openChecklistMenu(e) : formatCheckList(), title: 'Checkliste', isActive: blockType === 'check' },
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
      id: 'indent',
      buttons: [
        { icon: IndentIncrease, action: indentContent, title: 'Einzug vergrößern' },
        { icon: IndentDecrease, action: outdentContent, title: 'Einzug verkleinern', isDisabled: !canOutdent },
      ],
    },
    {
      id: 'history',
      buttons: [
        { icon: Undo, action: () => editor.dispatchCommand(UNDO_COMMAND, undefined), title: 'Rückgängig', isDisabled: !canUndo },
        { icon: Redo, action: () => editor.dispatchCommand(REDO_COMMAND, undefined), title: 'Wiederholen', isDisabled: !canRedo },
      ],
    },
  ];


  const renderBtn = (
    btn: ToolbarBtn,
    key: number,
    enterFn: (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => void = onEnter,
  ) => (
    <button
      key={key}
      onClick={(e) => btn.actionWithEvent ? btn.actionWithEvent(e) : btn.action()}
      onMouseEnter={(e) => enterFn(e, !!btn.isActive)}
      disabled={disabled || !!btn.isDisabled}
      className={clsx(
        'p-2 rounded-lg transition-colors flex-shrink-0 relative z-10',
        btn.isActive ? 'text-brand-primary' : 'text-text-primary',
        'disabled:opacity-30'
      )}
      title={btn.title}
    >
      <btn.icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="px-6 py-1 flex flex-wrap items-center gap-1 relative"
        style={{ background: 'var(--color-bg-header)' }}
        onMouseLeave={onLeave}
      >
        {pill && (
          <div
            className="glass-pill"
            style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
          />
        )}

        {/* Font color button */}
        <button
          onClick={openColorPicker}
          onMouseEnter={(e) => onEnter(e, !!colorPickerPos)}
          disabled={disabled}
          className={clsx(
            'p-2 rounded-lg transition-colors flex-shrink-0 relative z-10 disabled:opacity-30',
            colorPickerPos ? 'text-brand-primary' : 'text-text-primary'
          )}
          title="Schriftfarbe"
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold leading-none select-none" style={{ fontFamily: 'serif' }}>A</span>
            <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: fontColor || 'var(--color-text-primary)' }} />
          </div>
        </button>

        {/* Highlight button */}
        <button
          onClick={openHighlightPicker}
          onMouseEnter={(e) => onEnter(e, !!highlightPickerPos)}
          disabled={disabled}
          className={clsx(
            'p-2 rounded-lg transition-colors flex-shrink-0 relative z-10 disabled:opacity-30',
            highlightPickerPos ? 'text-brand-primary' : 'text-text-primary'
          )}
          title="Textmarkierung"
        >
          <div className="flex flex-col items-center gap-0.5">
            <Highlighter className="w-3.5 h-3.5" />
            <div
              className="w-4 h-1 rounded-sm"
              style={{
                backgroundColor: highlightColor || 'transparent',
                border: highlightColor ? '1px solid var(--color-text-primary)' : '1px solid var(--color-text-primary)',
              }}
            />
          </div>
        </button>

        <div className="h-6 w-px glass-divider flex-shrink-0" />

        {/* Font family button */}
        <button
          onClick={openFontFamilyMenu}
          onMouseEnter={(e) => onEnter(e, !!fontFamilyPos)}
          disabled={disabled}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs relative z-10 disabled:opacity-30 h-7',
            fontFamilyPos ? 'text-brand-primary' : 'text-text-primary'
          )}
          style={{ minWidth: '72px' }}
          title="Schriftart"
        >
          <span className="truncate flex-1 text-left">{fontFamilyLabel}</span>
          <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-60" />
        </button>

        <div className="h-6 w-px glass-divider flex-shrink-0" />

        {/* Font size button */}
        <button
          onClick={openFontSizeMenu}
          onMouseEnter={(e) => onEnter(e, !!fontSizePos)}
          disabled={disabled}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs relative z-10 disabled:opacity-30 h-7',
            fontSizePos || fontSize ? 'text-brand-primary' : 'text-text-primary'
          )}
          style={{ minWidth: '48px' }}
          title="Schriftgröße"
        >
          <span className="flex-1 text-left">{fontSize || '16'}</span>
          <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-60" />
        </button>

        <div className="h-6 w-px glass-divider flex-shrink-0" />

        {/* Format group */}
        {buttonGroups[0].buttons.map((btn, bi) => renderBtn(btn, bi))}

        {/* Heading dropdown button */}
        <button
          onClick={openHeadingPicker}
          onMouseEnter={(e) => onEnter(e, !!headingPickerPos || ['h1','h2','h3','h4','h5','h6'].includes(blockType))}
          disabled={disabled}
          className={clsx(
            'p-2 rounded-lg transition-colors flex-shrink-0 relative z-10 disabled:opacity-30',
            (headingPickerPos || ['h1','h2','h3','h4','h5','h6'].includes(blockType)) ? 'text-brand-primary' : 'text-text-primary'
          )}
          title="Überschrift"
        >
          <Heading className="w-4 h-4" />
        </button>

        {/* Remaining button groups */}
        {buttonGroups.slice(1).map((group) => (
          <Fragment key={group.id}>
            <div className="h-6 w-px glass-divider flex-shrink-0" />
            {group.buttons.map((btn, bi) => renderBtn(btn, bi))}
          </Fragment>
        ))}
      </div>

      {/* Heading picker portal */}
      {headingPickerPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setHeadingPickerPos(null)} />
          <div
            ref={headingPickerRef}
            className="fixed glass-popup rounded-xl shadow-xl z-[9999] py-1 overflow-hidden"
            style={{ left: headingPickerPos.x, top: headingPickerPos.y }}
            onMouseLeave={onHeadingLeave}
          >
            {headingPill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: headingPill.left, top: headingPill.top, width: headingPill.width, height: headingPill.height }}
              />
            )}
            {([
              { tag: 'h1', Icon: Heading1 },
              { tag: 'h2', Icon: Heading2 },
              { tag: 'h3', Icon: Heading3 },
              { tag: 'h4', Icon: Heading4 },
              { tag: 'h5', Icon: Heading5 },
              { tag: 'h6', Icon: Heading6 },
            ] as const).map(({ tag, Icon }) => (
              <button
                key={tag}
                onClick={() => { formatHeading(tag); setHeadingPickerPos(null); }}
                onMouseEnter={(e) => onHeadingEnter(e, blockType === tag)}
                className={clsx(
                  'flex items-center justify-center w-full px-4 py-1.5 transition-colors relative z-10',
                  blockType === tag ? 'text-brand-primary' : 'text-text-primary'
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

      {/* Color picker portal */}
      {colorPickerPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setColorPickerPos(null)} />
          <div
            className="fixed glass-popup rounded-xl shadow-xl z-[9999]"
            style={{ left: colorPickerPos.x, top: colorPickerPos.y, width: '220px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 flex flex-col gap-2">
              {/* Preset swatches */}
              <div className="flex flex-wrap gap-1">
                {TEXT_COLORS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => { applyFontColor(value); setColorPickerPos(null); }}
                    title={label}
                    className={clsx(
                      'w-6 h-6 rounded-md transition-transform hover:scale-110 flex-shrink-0',
                      fontColor === value ? 'ring-2 ring-brand-primary' : 'ring-1 ring-white/20'
                    )}
                    style={{
                      backgroundColor: value || 'transparent',
                      backgroundImage: !value ? 'repeating-linear-gradient(45deg, rgba(150,150,150,0.5) 0, rgba(150,150,150,0.5) 1px, transparent 0, transparent 50%)' : undefined,
                      backgroundSize: !value ? '4px 4px' : undefined,
                    }}
                  />
                ))}
              </div>

              {/* Favorites row */}
              <div className="flex items-center gap-1 flex-wrap min-h-[1.5rem]">
                {favoriteColors.map((color) => (
                  <div key={color} className="relative group/fav w-6 h-6 flex-shrink-0">
                    <button
                      onClick={() => { applyFontColor(color); setColorPickerPos(null); }}
                      title={color}
                      className={clsx(
                        'w-6 h-6 rounded-md transition-transform hover:scale-110',
                        fontColor === color ? 'ring-2 ring-brand-primary' : 'ring-1 ring-white/20'
                      )}
                      style={{ backgroundColor: color }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromFavorites(color); }}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/70 text-white opacity-0 group-hover/fav:opacity-100 transition-opacity grid place-items-center leading-none"
                      title="Entfernen"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addToFavorites}
                  title="Aktuelle Farbe zu Favoriten hinzufügen"
                  className={clsx(
                    'w-6 h-6 rounded-md ring-1 ring-text-muted flex items-center justify-center transition-colors flex-shrink-0',
                    fontColor && !favoriteColors.includes(fontColor) && !TEXT_COLORS.some(c => c.value === fontColor) && favoriteColors.length < 13
                      ? 'text-text-muted hover:text-text-primary hover:ring-text-primary'
                      : 'text-text-muted opacity-30 pointer-events-none'
                  )}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="h-px glass-divider" />

              {/* Gradient picker */}
              <HexColorPicker
                color={fontColor && fontColor.startsWith('#') ? fontColor : '#000000'}
                onChange={applyFontColor}
                style={{ width: '100%', height: '140px' }}
              />

              {/* Format tabs + eyedropper */}
              <div
                ref={colorModeTabsRef}
                className="flex items-center gap-1 relative rounded-lg overflow-hidden"
                onMouseLeave={onColorModeLeave}
              >
                {colorModePill && (
                  <div
                    className="glass-pill pointer-events-none"
                    style={{ left: colorModePill.left, top: colorModePill.top, width: colorModePill.width, height: colorModePill.height }}
                  />
                )}
                {(['hex', 'rgb', 'hsl'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setColorInputMode(mode)}
                    onMouseEnter={(e) => onColorModeEnter(e, colorInputMode === mode)}
                    className={clsx(
                      'flex-1 h-8 rounded text-[10px] font-medium uppercase tracking-wide transition-colors relative z-10',
                      colorInputMode === mode ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
                    )}
                  >
                    {mode}
                  </button>
                ))}
                <button
                  onClick={openEyeDropper}
                  onMouseEnter={(e) => onColorModeEnter(e, false)}
                  title="Pipette"
                  className={clsx(
                    'h-8 w-8 flex items-center justify-center rounded transition-colors relative z-10 flex-shrink-0',
                    !('EyeDropper' in window) ? 'opacity-30 pointer-events-none text-text-muted' : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  <Pipette className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Format-specific inputs */}
              {colorInputMode === 'hex' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-muted select-none">#</span>
                  <HexColorInput
                    color={fontColor && fontColor.startsWith('#') ? fontColor : '#000000'}
                    onChange={applyFontColor}
                    className="input text-xs h-7 px-2 flex-1"
                    style={{ minWidth: 0 }}
                  />
                </div>
              )}

              {colorInputMode === 'rgb' && (() => {
                const rgb = hexToRgb(fontColor && fontColor.startsWith('#') ? fontColor : '#000000') ?? { r: 0, g: 0, b: 0 };
                return (
                  <div className="grid grid-cols-3 gap-1">
                    {(['r', 'g', 'b'] as const).map((ch) => (
                      <div key={ch} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-text-muted uppercase">{ch}</span>
                        <input
                          type="number" min={0} max={255}
                          value={rgb[ch]}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(255, Number(e.target.value)));
                            applyFontColor(rgbToHex(ch === 'r' ? v : rgb.r, ch === 'g' ? v : rgb.g, ch === 'b' ? v : rgb.b));
                          }}
                          className="input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {colorInputMode === 'hsl' && (() => {
                const hsl = hexToHsl(fontColor && fontColor.startsWith('#') ? fontColor : '#000000');
                return (
                  <div className="grid grid-cols-3 gap-1">
                    {([['h', hsl.h, 360], ['s', hsl.s, 100], ['l', hsl.l, 100]] as const).map(([ch, val, max]) => (
                      <div key={ch} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-text-muted uppercase">{ch}</span>
                        <input
                          type="number" min={0} max={max}
                          value={val}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(max, Number(e.target.value)));
                            applyFontColor(hslToHex(ch === 'h' ? v : hsl.h, ch === 's' ? v : hsl.s, ch === 'l' ? v : hsl.l));
                          }}
                          className="input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Highlight picker portal */}
      {highlightPickerPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setHighlightPickerPos(null)} />
          <div
            className="fixed glass-popup rounded-xl shadow-xl z-[9999]"
            style={{ left: highlightPickerPos.x, top: highlightPickerPos.y, width: '220px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 flex flex-col gap-2">
              {/* Preset swatches */}
              <div className="flex flex-wrap gap-1">
                {HIGHLIGHT_COLORS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => { applyHighlight(value); setHighlightPickerPos(null); }}
                    title={label}
                    className={clsx(
                      'w-6 h-6 rounded-md transition-transform hover:scale-110 flex-shrink-0',
                      highlightColor === value ? 'ring-2 ring-brand-primary' : 'ring-1 ring-white/20'
                    )}
                    style={{
                      backgroundColor: value || 'transparent',
                      backgroundImage: !value ? 'repeating-linear-gradient(45deg, rgba(150,150,150,0.5) 0, rgba(150,150,150,0.5) 1px, transparent 0, transparent 50%)' : undefined,
                      backgroundSize: !value ? '4px 4px' : undefined,
                    }}
                  />
                ))}
              </div>

              {/* Favorites row */}
              <div className="flex items-center gap-1 flex-wrap min-h-[1.5rem]">
                {favoriteHighlights.map((color) => (
                  <div key={color} className="relative group/fav w-6 h-6 flex-shrink-0">
                    <button
                      onClick={() => { applyHighlight(color); setHighlightPickerPos(null); }}
                      title={color}
                      className={clsx(
                        'w-6 h-6 rounded-md transition-transform hover:scale-110',
                        highlightColor === color ? 'ring-2 ring-brand-primary' : 'ring-1 ring-white/20'
                      )}
                      style={{ backgroundColor: color }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromHighlightFavorites(color); }}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/70 text-white opacity-0 group-hover/fav:opacity-100 transition-opacity grid place-items-center leading-none"
                      title="Entfernen"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addToHighlightFavorites}
                  title="Aktuelle Farbe zu Favoriten hinzufügen"
                  className={clsx(
                    'w-6 h-6 rounded-md ring-1 ring-text-muted flex items-center justify-center transition-colors flex-shrink-0',
                    highlightColor && !favoriteHighlights.includes(highlightColor) && !HIGHLIGHT_COLORS.some(c => c.value === highlightColor) && favoriteHighlights.length < 13
                      ? 'text-text-muted hover:text-text-primary hover:ring-text-primary'
                      : 'text-text-muted opacity-30 pointer-events-none'
                  )}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="h-px glass-divider" />

              {/* Gradient picker */}
              <HexColorPicker
                color={highlightColor && highlightColor.startsWith('#') ? highlightColor : '#fef08a'}
                onChange={applyHighlight}
                style={{ width: '100%', height: '140px' }}
              />

              {/* Format tabs + eyedropper */}
              <div
                ref={highlightModeTabsRef}
                className="flex items-center gap-1 relative rounded-lg overflow-hidden"
                onMouseLeave={onHighlightModeLeave}
              >
                {highlightModePill && (
                  <div
                    className="glass-pill pointer-events-none"
                    style={{ left: highlightModePill.left, top: highlightModePill.top, width: highlightModePill.width, height: highlightModePill.height }}
                  />
                )}
                {(['hex', 'rgb', 'hsl'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setHighlightInputMode(mode)}
                    onMouseEnter={(e) => onHighlightModeEnter(e, highlightInputMode === mode)}
                    className={clsx(
                      'flex-1 h-8 rounded text-[10px] font-medium uppercase tracking-wide transition-colors relative z-10',
                      highlightInputMode === mode ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
                    )}
                  >
                    {mode}
                  </button>
                ))}
                <button
                  onClick={openEyeDropper}
                  onMouseEnter={(e) => onHighlightModeEnter(e, false)}
                  title="Pipette"
                  className={clsx(
                    'h-8 w-8 flex items-center justify-center rounded transition-colors relative z-10 flex-shrink-0',
                    !('EyeDropper' in window) ? 'opacity-30 pointer-events-none text-text-muted' : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  <Pipette className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Format-specific inputs */}
              {highlightInputMode === 'hex' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-muted select-none">#</span>
                  <HexColorInput
                    color={highlightColor && highlightColor.startsWith('#') ? highlightColor : '#fef08a'}
                    onChange={applyHighlight}
                    className="input text-xs h-7 px-2 flex-1"
                    style={{ minWidth: 0 }}
                  />
                </div>
              )}

              {highlightInputMode === 'rgb' && (() => {
                const rgb = hexToRgb(highlightColor && highlightColor.startsWith('#') ? highlightColor : '#fef08a') ?? { r: 0, g: 0, b: 0 };
                return (
                  <div className="grid grid-cols-3 gap-1">
                    {(['r', 'g', 'b'] as const).map((ch) => (
                      <div key={ch} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-text-muted uppercase">{ch}</span>
                        <input
                          type="number" min={0} max={255}
                          value={rgb[ch]}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(255, Number(e.target.value)));
                            applyHighlight(rgbToHex(ch === 'r' ? v : rgb.r, ch === 'g' ? v : rgb.g, ch === 'b' ? v : rgb.b));
                          }}
                          className="input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {highlightInputMode === 'hsl' && (() => {
                const hsl = hexToHsl(highlightColor && highlightColor.startsWith('#') ? highlightColor : '#fef08a');
                return (
                  <div className="grid grid-cols-3 gap-1">
                    {([['h', hsl.h, 360], ['s', hsl.s, 100], ['l', hsl.l, 100]] as const).map(([ch, val, max]) => (
                      <div key={ch} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-text-muted uppercase">{ch}</span>
                        <input
                          type="number" min={0} max={max}
                          value={val}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(max, Number(e.target.value)));
                            applyHighlight(hslToHex(ch === 'h' ? v : hsl.h, ch === 's' ? v : hsl.s, ch === 'l' ? v : hsl.l));
                          }}
                          className="input text-xs h-7 px-1 text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Font family portal */}
      {fontFamilyPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setFontFamilyPos(null)} />
          <div
            ref={fontFamilyRef}
            className="fixed glass-popup rounded-xl shadow-xl z-[9999] py-1 overflow-hidden"
            style={{ left: fontFamilyPos.x, top: fontFamilyPos.y }}
            onMouseLeave={onFontFamilyLeave}
          >
            {fontFamilyPill && <div className="glass-pill pointer-events-none" style={{ left: fontFamilyPill.left, top: fontFamilyPill.top, width: fontFamilyPill.width, height: fontFamilyPill.height }} />}
            {FONT_FAMILIES.map(({ label, value, previewStyle }) => (
              <button
                key={label}
                onClick={() => { applyFontFamily(value); setFontFamilyPos(null); }}
                onMouseEnter={(e) => onFontFamilyEnter(e, fontFamily === value)}
                className={clsx(
                  'block whitespace-nowrap text-left px-3 py-1.5 text-sm transition-colors relative z-10',
                  fontFamily === value ? 'text-brand-primary' : 'text-text-primary'
                )}
                style={{ fontFamily: previewStyle || value || 'inherit' }}
              >
                {label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

      {/* Font size portal */}
      {fontSizePos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => { setFontSizePos(null); setFontSizePillRect(null); }} />
          <div
            ref={fontSizeRef}
            className="fixed glass-popup rounded-xl shadow-xl z-[9999] py-0 overflow-hidden max-h-48 overflow-y-auto scrollbar-overlay"
            style={{ left: fontSizePos.x, top: fontSizePos.y }}
            onMouseLeave={() => setFontSizePillRect(null)}
            onScroll={() => setFontSizePillRect(null)}
          >
            {fontSizePillRect && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: fontSizePillRect.left, top: fontSizePillRect.top, width: fontSizePillRect.width, height: fontSizePillRect.height }}
              />
            )}
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => { applyFontSize(size); setFontSizePos(null); setFontSizePillRect(null); }}
                onMouseEnter={onFontSizeItemEnter}
                className={clsx(
                  'block whitespace-nowrap text-left px-3 py-1.5 text-sm transition-colors relative z-10',
                  fontSize === size ? 'text-brand-primary' : 'text-text-primary'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

      {/* Link Modal */}
      {showLinkModal && createPortal(
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowLinkModal(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 glass-popup rounded-xl shadow-2xl p-6 w-96">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-text-primary">Link hinzufügen</h3>
              <button onClick={() => setShowLinkModal(false)} className="p-1.5 text-text-secondary hover-text-themed transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-text-primary mb-2 uppercase tracking-wide">URL</label>
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
              <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-sm text-text-secondary hover-text-themed transition-all relative group">
                <span className="relative">Abbrechen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button onClick={handleLinkSubmit} disabled={!linkUrl.trim()} className="px-4 py-2 text-sm text-text-secondary hover-text-themed transition-all relative group disabled:opacity-40 disabled:cursor-not-allowed">
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
          <div className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 glass-popup rounded-xl shadow-2xl p-6 w-[450px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-text-primary">Bild hinzufügen</h3>
              <button onClick={() => !isUploading && setShowImageModal(false)} disabled={isUploading} className="p-1.5 text-text-secondary hover-text-themed transition-colors disabled:opacity-50">
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
                    imageMode === mode ? 'text-brand-primary' : 'text-text-secondary hover-text-themed'
                  )}
                >
                  <span className="relative">{mode === 'url' ? 'URL' : 'Hochladen'}</span>
                  <span className={clsx(
                    'absolute bottom-0 left-0 right-0 h-0.5 transition-opacity',
                    imageMode === mode
                      ? 'bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-100'
                      : 'bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100'
                  )} />
                </button>
              ))}
            </div>

            {imageMode === 'url' && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-text-primary mb-2 uppercase tracking-wide">Bild-URL</label>
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
                <label className="block text-xs font-medium text-text-primary mb-2 uppercase tracking-wide">Datei auswählen</label>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center justify-center space-x-2 px-4 py-6 border-2 border-dashed border-white/30 rounded-xl text-text-secondary hover:border-brand-primary/50 hover:text-brand-primary hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-sm font-medium">{selectedFile ? 'Andere Datei wählen' : 'Datei auswählen'}</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  {selectedFile && (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-white/20 border border-white/30 rounded-lg">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Image className="w-4 h-4 text-brand-primary flex-shrink-0" />
                        <span className="text-sm text-text-primary truncate">{selectedFile.name}</span>
                      </div>
                      <button onClick={() => setSelectedFile(null)} disabled={isUploading} className="ml-2 p-1 rounded-md hover-highlight text-text-secondary hover-text-themed transition-all disabled:opacity-50">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-text-secondary text-center">JPG, PNG, GIF, WebP, SVG · max. 10 MB</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowImageModal(false)} disabled={isUploading} className="px-4 py-2 text-sm text-text-secondary hover-text-themed transition-all relative group disabled:opacity-50">
                <span className="relative">Abbrechen</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={handleImageSubmit}
                disabled={isUploading || (imageMode === 'url' && !imageUrl.trim()) || (imageMode === 'upload' && !selectedFile)}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-text-secondary hover-text-themed transition-all relative group disabled:opacity-40 disabled:cursor-not-allowed"
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
      {/* Checklist auto-reset popup */}
      {checklistMenuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setChecklistMenuPos(null)} />
          <div
            className="fixed glass-popup rounded-xl shadow-xl z-[9999] p-3.5"
            style={{ left: checklistMenuPos.x, top: checklistMenuPos.y, width: 228 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="text-xs font-semibold text-text-primary">
                <Clock className="w-3 h-3" /> 
              </span>
              <span className="text-xs font-semibold text-text-primary">
                Auto-Reset
              </span>
              <button onClick={() => setChecklistMenuPos(null)} className="text-text-muted p-0.5 flex">
                <X className="w-3 h-3" />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['daily', 'countdown'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setChecklistTimerType(t)}
                  className="flex-1 py-1 rounded-lg text-[11px] font-medium cursor-pointer border-none transition-colors"
                  style={{
                    background: checklistTimerType === t ? 'var(--color-text-primary)' : 'color-mix(in srgb, var(--color-text-primary) 10%, transparent)',
                    color: checklistTimerType === t ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  {t === 'daily' ? 'Täglich' : 'Countdown'}
                </button>
              ))}
            </div>

            {checklistTimerType === 'daily' && (
              <div style={{ marginBottom: 12 }}>
                <label className="block text-[11px] text-text-muted mb-1">Jeden Tag um</label>
                <input
                  type="time"
                  value={checklistDailyTime}
                  onChange={e => setChecklistDailyTime(e.target.value)}
                  className="input w-full text-sm h-8"
                />
              </div>
            )}

            {checklistTimerType === 'countdown' && (
              <div style={{ marginBottom: 12 }}>
                <label className="block text-[11px] text-text-muted mb-1">In</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number" min={0} max={99}
                      value={checklistCountdownHours}
                      onChange={e => setChecklistCountdownHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="input w-full text-sm h-8 text-center"
                    />
                    <div className="text-[10px] text-text-muted text-center mt-1">Std</div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number" min={0} max={59}
                      value={checklistCountdownMinutes}
                      onChange={e => setChecklistCountdownMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="input w-full text-sm h-8 text-center"
                    />
                    <div className="text-[10px] text-text-muted text-center mt-1">Min</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-1.5">
              {checklistExistingTimer && (
                <button
                  onClick={handleChecklistTimerRemove}
                  className="flex-1 py-1.5 rounded-lg border-none text-[11px] font-medium cursor-pointer"
                  style={{ background: 'color-mix(in srgb, #ef4444 14%, transparent)', color: '#ef4444' }}
                >
                  Entfernen
                </button>
              )}
              <button
                onClick={handleChecklistTimerSave}
                className="flex-[2] py-1.5 rounded-lg border-none text-[11px] font-semibold cursor-pointer"
                style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' }}
              >
                Speichern
              </button>
            </div>

            <div className="mt-2 pt-2" style={{ borderTop: '1px solid color-mix(in srgb, var(--color-text-primary) 10%, transparent)' }}>
              <button
                onClick={() => { formatCheckList(); setChecklistMenuPos(null); }}
                className="w-full py-1.5 rounded-lg border-none text-[11px] text-white cursor-pointer"
                style={{ background: 'color-mix(in srgb, var(--color-text-primary) 100%, transparent)' }}
              >
                Checkliste entfernen
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

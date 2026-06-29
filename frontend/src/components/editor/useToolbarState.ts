import { useState, useCallback, useEffect, useRef } from 'react';
import type { MouseEvent, RefObject } from 'react';
import type { PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { animate, useMotionValue, useTransform } from 'motion/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createRangeSelection,
  $setSelection,
  $getNodeByKey,
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
  $isParagraphNode,
  ElementFormatType,
  $isElementNode,
  $isTextNode,
  LexicalNode,
  ElementNode,
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
import { $createCodeNode, $isCodeNode, normalizeCodeLang } from '@lexical/code';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { INSERT_TABLE_COMMAND, $isTableNode } from '@lexical/table';
import { INSERT_IMAGE_COMMAND } from './ImagePlugin';
import { INSERT_ATTACHMENT_COMMAND } from './AttachmentPlugin';
import { AttachmentPayload } from './AttachmentNode';
import { $isTimerListItemNode } from './TimerListItemNode';
import { $createDropCapParagraphNode, $isDropCapParagraphNode } from './DropCapParagraphNode';
import { useChecklistTimer, type SavedSelection } from './useChecklistTimer';

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

export function useToolbarState(toolbarRef?: RefObject<HTMLElement | null>) {
  // Popups mirror the More-panel exactly — same width, height and vertical position —
  // docked flush to its left edge.
  const tbAnchor = (): PopupAnchor => {
    const panel = toolbarRef?.current?.getBoundingClientRect();
    return {
      x: 0,
      top: panel?.top ?? 0,
      bottom: panel?.bottom ?? 0,
      dockSide: panel?.left,
      width: panel?.width,
    };
  };

  const [editor] = useLexicalComposerContext();

  const [wordCount, setWordCount] = useState(0);
  const motionCount = useMotionValue(0);
  const roundedCount = useTransform(() => Math.round(motionCount.get()));
  useEffect(() => {
    const controls = animate(motionCount, wordCount, { duration: 0.8, ease: 'easeOut' });
    return () => controls.stop();
  }, [wordCount]);

  const [isInTable, setIsInTable] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [canOutdent, setCanOutdent] = useState(false);
  const [isDropCap, setIsDropCap] = useState(false);
  const [canDropCap, setCanDropCap] = useState(false);

  const [fontColor, setFontColor] = useState('');
  const [highlightColor, setHighlightColor] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [lineHeight, setLineHeight] = useState('');

  const [fontPickerPos, setFontPickerPos] = useState<PopupAnchor | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<PopupAnchor | null>(null);
  const [highlightPickerPos, setHighlightPickerPos] = useState<PopupAnchor | null>(null);
  const [fontSizePos, setFontSizePos] = useState<PopupAnchor | null>(null);
  const [lineHeightPickerPos, setLineHeightPickerPos] = useState<PopupAnchor | null>(null);
  const [headingPickerPos, setHeadingPickerPos] = useState<PopupAnchor | null>(null);
  const [codeLanguage, setCodeLanguage] = useState('js');
  const [codeLangPickerPos, setCodeLangPickerPos] = useState<PopupAnchor | null>(null);

  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);

  const savedSelectionRef = useRef<SavedSelection>(null);

  const saveSelection = () => {
    editor.getEditorState().read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        savedSelectionRef.current = {
          anchor: { key: sel.anchor.key, offset: sel.anchor.offset, type: sel.anchor.type },
          focus: { key: sel.focus.key, offset: sel.focus.offset, type: sel.focus.type },
        };
      } else {
        savedSelectionRef.current = null;
      }
    });
  };

  const [checklistDropdownPos, setChecklistDropdownPos] = useState<PopupAnchor | null>(null);
  const checklistTimer = useChecklistTimer(saveSelection, savedSelectionRef);

  // Memoised so RichTextToolbar's "close pickers when the More panel closes" effect only
  // fires on the moreOpen transition. An unstable identity made it run every render and
  // wipe context pickers (e.g. the floating bar's fontPickerPos) right after they opened.
  const closeAllPopups = useCallback(() => {
    setColorPickerPos(null);
    setHighlightPickerPos(null);
    setFontPickerPos(null);
    setFontSizePos(null);
    setLineHeightPickerPos(null);
    setHeadingPickerPos(null);
    setChecklistDropdownPos(null);
    setCodeLangPickerPos(null);
  }, []);

  const openColorFromMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (colorPickerPos) { closeAllPopups(); return; }
    saveSelection();
    closeAllPopups();
    setColorPickerPos(tbAnchor());
  };

  const openHighlightFromMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (highlightPickerPos) { closeAllPopups(); return; }
    saveSelection();
    closeAllPopups();
    setHighlightPickerPos(tbAnchor());
  };

  const openFontPickerFromMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (fontPickerPos) { closeAllPopups(); return; }
    saveSelection();
    closeAllPopups();
    setFontPickerPos(tbAnchor());
  };

  const openFontSizeFromMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (fontSizePos) { closeAllPopups(); return; }
    saveSelection();
    closeAllPopups();
    setFontSizePos(tbAnchor());
  };

  const openLineHeightFromMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (lineHeightPickerPos) { closeAllPopups(); return; }
    saveSelection();
    closeAllPopups();
    setLineHeightPickerPos(tbAnchor());
  };

  const openChecklistDropdown = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (checklistDropdownPos) { closeAllPopups(); return; }
    closeAllPopups();
    setChecklistDropdownPos(tbAnchor());
  };

  const openHeadingPicker = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (headingPickerPos) { closeAllPopups(); return; }
    closeAllPopups();
    setHeadingPickerPos(tbAnchor());
  };

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSuperscript(selection.hasFormat('superscript'));
      setIsSubscript(selection.hasFormat('subscript'));

      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

      const elementDOM = editor.getElementByKey(element.getKey());
      if (elementDOM !== null) {
        if ($isListNode(element)) {
          let listItem: LexicalNode | null = anchorNode;
          while (listItem && !$isListItemNode(listItem)) listItem = listItem.getParent();
          setBlockType($isTimerListItemNode(listItem) ? 'timer-checkbox' : element.getListType());
        } else {
          // A drop-cap paragraph is still a normal paragraph for every other tool.
          const type = $isHeadingNode(element)
            ? element.getTag()
            : $isDropCapParagraphNode(element) ? 'paragraph' : element.getType();
          setBlockType(type);
          if (type === 'code' && $isCodeNode(element)) {
            setCodeLanguage(normalizeCodeLang(element.getLanguage() ?? 'js'));
          }
        }
      }

      // Drop cap: active when this block is one; enabled when it's a plain paragraph,
      // already a drop cap, or sits directly under one (clicking then clears the one above).
      const isDC = $isDropCapParagraphNode(element);
      setIsDropCap(isDC);
      setCanDropCap(isDC || $isDropCapParagraphNode(element.getPreviousSibling()) || $isParagraphNode(element));

      const nodeStyles = $isTextNode(anchorNode) ? parseStyle(anchorNode.getStyle()) : {};
      const pendingStyles = selection.isCollapsed() && selection.style ? parseStyle(selection.style) : {};
      const styles = { ...nodeStyles, ...pendingStyles };
      setFontColor(styles['color'] || '');
      setHighlightColor(styles['background-color'] || '');
      setFontFamily(styles['font-family'] || '');
      const rawSize = styles['font-size'] || '';
      setFontSize(rawSize ? String(Math.round(parseFloat(rawSize) * 3 / 4)) : '');
      // Read line-height from the block's first text node (the storage anchor for
      // LineHeightSyncPlugin), not just the caret's node, so the indicator matches
      // what is actually rendered. Pending style covers the still-empty block.
      const blockFirstText = $isElementNode(element) ? element.getAllTextNodes()[0] : undefined;
      const blockLh = blockFirstText ? parseStyle(blockFirstText.getStyle())['line-height'] || '' : '';
      setLineHeight(blockLh || pendingStyles['line-height'] || '');

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
        const indent = $isElementNode(topEl) ? topEl.getIndent() : 0;
        setCanOutdent(indent > 0);
      }

      let tableCheck: LexicalNode | null = anchorNode;
      let foundTable = false;
      while (tableCheck !== null) {
        if ($isTableNode(tableCheck)) { foundTable = true; break; }
        tableCheck = tableCheck.getParent();
      }
      setIsInTable(foundTable);
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
        const text = $getRoot().getTextContent().trim();
        setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0);
      });
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    const unregUndo = editor.registerCommand(CAN_UNDO_COMMAND, (payload) => { setCanUndo(payload); return false; }, COMMAND_PRIORITY_LOW);
    const unregRedo = editor.registerCommand(CAN_REDO_COMMAND, (payload) => { setCanRedo(payload); return false; }, COMMAND_PRIORITY_LOW);
    return () => { unregUndo(); unregRedo(); };
  }, [editor]);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'superscript' | 'subscript') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const removeHeading = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
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

  // Toggle the drop cap on the current line. A drop cap glyph is ~2 lines tall, so two
  // adjacent paragraphs may never both be drop caps: clicking the line right below one
  // clears the one above instead of stacking a second. Plain paragraphs only.
  const toggleDropCap = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const anchorNode = selection.anchor.getNode();
      if (anchorNode.getKey() === 'root') return;
      const block = anchorNode.getTopLevelElementOrThrow();

      // $setBlocksType applies to every block in the range — collapse to the anchor so
      // only the current line flips (it also keeps the selection and moves the children).
      const onAnchor = $createRangeSelection();
      onAnchor.anchor.set(selection.anchor.key, selection.anchor.offset, selection.anchor.type);
      onAnchor.focus.set(selection.anchor.key, selection.anchor.offset, selection.anchor.type);

      // Demote a neighbour back to a plain paragraph, preserving alignment/indent/children.
      const demote = (node: LexicalNode | null) => {
        if (!$isDropCapParagraphNode(node)) return;
        const p = $createParagraphNode();
        p.setFormat(node.getFormatType());
        p.setIndent(node.getIndent());
        node.replace(p, true);
      };

      if ($isDropCapParagraphNode(block)) {
        $setBlocksType(onAnchor, () => $createParagraphNode());
        return;
      }
      if ($isDropCapParagraphNode(block.getPreviousSibling())) {
        demote(block.getPreviousSibling());
        return;
      }
      if ($isParagraphNode(block)) {
        demote(block.getNextSibling());
        $setBlocksType(onAnchor, () => $createDropCapParagraphNode());
      }
    });
  };

  const formatCode = (language?: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const anchorNode = selection.anchor.getNode();
      const topEl = anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
      if (!$isCodeNode(topEl)) {
        // Collapse to anchor paragraph — $setBlocksType creates one code node per selected
        // block, so a multi-paragraph selection would produce multiple code blocks.
        const collapsed = $createRangeSelection();
        collapsed.anchor.set(selection.anchor.key, selection.anchor.offset, selection.anchor.type);
        collapsed.focus.set(selection.anchor.key, selection.anchor.offset, selection.anchor.type);
        $setBlocksType(collapsed, () => $createCodeNode(language));
      } else {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  const setCodeNodeLanguage = (lang: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const anchorNode = selection.anchor.getNode();
      const topEl = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
      if ($isCodeNode(topEl)) topEl.setLanguage(lang);
    });
    setCodeLanguage(lang);
  };

  const openCodeLangPicker = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (codeLangPickerPos) { closeAllPopups(); return; }
    closeAllPopups();
    setCodeLangPickerPos(tbAnchor());
  };

  const formatCheckList = () => {
    if (blockType !== 'check') {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const indentContent = () => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
  const outdentContent = () => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);

  const formatAlignment = (alignment: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const restoreSelection = (): ReturnType<typeof $getSelection> => {
    const saved = savedSelectionRef.current;
    savedSelectionRef.current = null;
    let sel = $getSelection();
    if (!$isRangeSelection(sel) && saved) {
      const anchorNode = $getNodeByKey(saved.anchor.key);
      const focusNode = $getNodeByKey(saved.focus.key);
      if (anchorNode && focusNode) {
        const newSel = $createRangeSelection();
        newSel.anchor.set(saved.anchor.key, saved.anchor.offset, saved.anchor.type);
        newSel.focus.set(saved.focus.key, saved.focus.offset, saved.focus.type);
        $setSelection(newSel);
        sel = newSel;
      }
    }
    return sel;
  };

  const applyFontColor = (color: string) => {
    editor.update(() => {
      const selection = restoreSelection();
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
      const selection = restoreSelection();
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
      const selection = restoreSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-family': family || '' });
        if (selection.isCollapsed()) {
          selection.style = mergeStyle(selection.style, { 'font-family': family || '' });
        }
      }
    });
    setFontFamily(family);
  };

  const applyLineHeight = (value: string) => {
    editor.update(() => {
      const selection = restoreSelection();
      if (!$isRangeSelection(selection)) return;
      // Line-height is a block concern: write it to every text node of each
      // touched block so the first-text-node read in LineHeightSyncPlugin and
      // the toolbar read-back always see a uniform value, regardless of how
      // much of the block the selection covered.
      const blocks = new Set<ElementNode>();
      for (const node of selection.getNodes()) {
        if (node.getKey() === 'root') continue;
        const top = node.getTopLevelElementOrThrow();
        if ($isElementNode(top)) blocks.add(top);
      }
      for (const block of blocks) {
        for (const textNode of block.getAllTextNodes()) {
          textNode.setStyle(mergeStyle(textNode.getStyle(), { 'line-height': value }));
        }
      }
      if (selection.isCollapsed()) {
        selection.style = mergeStyle(selection.style, { 'line-height': value });
      }
    });
    setLineHeight(value);
  };

  const applyFontSize = (size: string) => {
    const px = size ? `${Math.round(parseFloat(size) * 4 / 3)}px` : '';
    editor.update(() => {
      const selection = restoreSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-size': px });
        if (selection.isCollapsed()) {
          selection.style = mergeStyle(selection.style, { 'font-size': px });
        }
      }
    });
    setFontSize(size);
  };

  const undoAction = () => editor.dispatchCommand(UNDO_COMMAND, undefined);
  const redoAction = () => editor.dispatchCommand(REDO_COMMAND, undefined);

  const insertHorizontalRule = () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);

  const removeTable = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      let node: LexicalNode | null = selection.anchor.getNode();
      while (node !== null) {
        if ($isTableNode(node)) {
          const paragraph = $createParagraphNode();
          node.replace(paragraph);
          paragraph.select();
          break;
        }
        node = node.getParent();
      }
    });
  };

  const insertTable = (rows: string, columns: string) => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows, columns });
  };

  const insertAttachment = () => setShowAttachModal(true);
  const insertImage = () => setShowImageModal(true);

  const insertAttachmentNode = (payload: AttachmentPayload) => {
    editor.dispatchCommand(INSERT_ATTACHMENT_COMMAND, payload);
  };

  const insertImageFromUrl = (url: string, altText?: string) => {
    const name = altText || url.split('/').pop()?.split('?')[0] || 'Uploaded Image';
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { altText: name, src: url });
  };

  return {
    roundedCount,
    wordCount,
    saveSelection,
    isInTable,
    isBold, isItalic, isUnderline, isStrikethrough, isSuperscript, isSubscript,
    blockType,
    canUndo, canRedo, canOutdent,
    isDropCap, canDropCap,
    fontColor, highlightColor, fontFamily, fontSize, lineHeight,
    fontPickerPos, setFontPickerPos,
    colorPickerPos, setColorPickerPos,
    highlightPickerPos, setHighlightPickerPos,
    fontSizePos, setFontSizePos,
    lineHeightPickerPos, setLineHeightPickerPos,
    headingPickerPos, setHeadingPickerPos,
    codeLanguage,
    codeLangPickerPos, setCodeLangPickerPos,
    showAttachModal, setShowAttachModal,
    showImageModal, setShowImageModal,
    showTableModal, setShowTableModal,
    checklistDropdownPos, setChecklistDropdownPos,
    ...checklistTimer,
    closeAllPopups,
    openColorFromMenu,
    openHighlightFromMenu,
    openFontPickerFromMenu,
    openFontSizeFromMenu,
    openLineHeightFromMenu,
    openChecklistDropdown,
    openHeadingPicker,
    openCodeLangPicker,
    formatText,
    formatHeading,
    removeHeading,
    formatBulletList,
    formatNumberedList,
    formatQuote,
    toggleDropCap,
    formatCode,
    setCodeNodeLanguage,
    formatCheckList,
    indentContent,
    outdentContent,
    formatAlignment,
    applyFontColor,
    applyHighlight,
    applyFontFamily,
    applyFontSize,
    applyLineHeight,
    undoAction,
    redoAction,
    insertHorizontalRule,
    insertTable,
    removeTable,
    insertAttachment,
    insertImage,
    insertAttachmentNode,
    insertImageFromUrl,
  };
}

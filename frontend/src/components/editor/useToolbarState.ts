import { useState, useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
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
import { $createCodeNode, $isCodeNode, normalizeCodeLang } from '@lexical/code';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { INSERT_TABLE_COMMAND, $isTableNode } from '@lexical/table';
import { INSERT_IMAGE_COMMAND } from './ImagePlugin';
import { useCheckResetStore, ResetTimer } from '../../store/useCheckResetStore';
import {
  $isTimerListItemNode,
  $createTimerListItemNode,
  type TimerConfig,
} from './TimerListItemNode';
import { $createListItemNode, $createListNode } from '@lexical/list';

function generateResetId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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

export function useToolbarState(minimalChrome: boolean) {
  const [editor] = useLexicalComposerContext();
  const { timers, setTimer, removeTimer } = useCheckResetStore();

  const [wordCount, setWordCount] = useState(0);
  const motionCount = useMotionValue(0);
  const roundedCount = useTransform(() => Math.round(motionCount.get()));
  useEffect(() => {
    const controls = animate(motionCount, wordCount, { duration: 0.8, ease: 'easeOut' });
    return () => controls.stop();
  }, [wordCount]);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  useEffect(() => {
    if (minimalChrome) setShowMoreMenu(false);
  }, [minimalChrome]);

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

  const [fontColor, setFontColor] = useState('');
  const [highlightColor, setHighlightColor] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [lineHeight, setLineHeight] = useState('');

  const [showFontPickerModal, setShowFontPickerModal] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState<PopupAnchor | null>(null);
  const [highlightPickerPos, setHighlightPickerPos] = useState<PopupAnchor | null>(null);
  const [fontSizePos, setFontSizePos] = useState<PopupAnchor | null>(null);
  const [lineHeightPickerPos, setLineHeightPickerPos] = useState<PopupAnchor | null>(null);
  const [headingPickerPos, setHeadingPickerPos] = useState<PopupAnchor | null>(null);
  const [codeLanguage, setCodeLanguage] = useState('js');
  const [codeLangPickerPos, setCodeLangPickerPos] = useState<{ x: number; y: number } | null>(null);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  type SavedPoint = { key: string; offset: number; type: 'text' | 'element' };
  const savedSelectionRef = useRef<{ anchor: SavedPoint; focus: SavedPoint } | null>(null);

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

  const checklistNodeKeyRef = useRef<string | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [checklistDropdownPos, setChecklistDropdownPos] = useState<{ x: number; y: number } | null>(null);
  const [checklistCountdownHours, setChecklistCountdownHours] = useState(1);
  const [checklistCountdownMinutes, setChecklistCountdownMinutes] = useState(0);
  const [checklistExistingTimer, setChecklistExistingTimer] = useState<ResetTimer | undefined>(undefined);

  const closeAllPopups = () => {
    setColorPickerPos(null);
    setHighlightPickerPos(null);
    setFontSizePos(null);
    setLineHeightPickerPos(null);
    setHeadingPickerPos(null);
    setChecklistDropdownPos(null);
    setCodeLangPickerPos(null);
  };

  const openColorFromMenu = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    saveSelection();
    closeAllPopups();
    setColorPickerPos({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
  };

  const openHighlightFromMenu = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    saveSelection();
    closeAllPopups();
    setHighlightPickerPos({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
  };

  const openFontPickerFromMenu = () => {
    saveSelection();
    closeAllPopups();
    setShowFontPickerModal(true);
  };

  const openFontSizeFromMenu = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    saveSelection();
    closeAllPopups();
    setFontSizePos({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
  };

  const openLineHeightFromMenu = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    saveSelection();
    closeAllPopups();
    setLineHeightPickerPos({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
  };

  const openChecklistDropdown = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    closeAllPopups();
    setChecklistDropdownPos({ x: rect.left, y: rect.bottom + 4 });
  };

  const openTimerModal = () => {
    saveSelection();
    let existingTimerConfig: TimerConfig | undefined;
    let existingTimer: ResetTimer | undefined;

    checklistNodeKeyRef.current = null;
    editor.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      let node: LexicalNode | null = selection.anchor.getNode();
      while (node && !$isListItemNode(node)) node = node.getParent();
      if (!$isListItemNode(node)) return;
      checklistNodeKeyRef.current = node.getKey();
      if ($isTimerListItemNode(node)) {
        existingTimerConfig = node.getTimerConfig();
        existingTimer = timers[node.getResetId()] ?? { type: 'countdown', endsAt: 0, totalMs: existingTimerConfig.totalMs };
      }
    });

    if (existingTimerConfig) {
      setChecklistCountdownHours(Math.floor(existingTimerConfig.totalMs / 3_600_000));
      setChecklistCountdownMinutes(Math.floor((existingTimerConfig.totalMs % 3_600_000) / 60_000));
    } else {
      setChecklistCountdownHours(1);
      setChecklistCountdownMinutes(0);
    }
    setChecklistExistingTimer(existingTimer);
    setShowTimerModal(true);
  };

  const handleChecklistTimerSave = () => {
    const nodeKey = checklistNodeKeyRef.current;
    const totalMs = (checklistCountdownHours * 60 + checklistCountdownMinutes) * 60_000;
    if (totalMs <= 0) return;

    if (!nodeKey) {
      // Kein vorhandenes Listenelement — neue Timer-Checkbox an der gespeicherten Cursorposition erstellen
      const timerConfig: TimerConfig = { type: 'countdown', totalMs };
      const newResetId = generateResetId();
      checklistNodeKeyRef.current = null;
      setShowTimerModal(false);

      editor.update(() => {
        const saved = savedSelectionRef.current;
        savedSelectionRef.current = null;
        if (saved) {
          const an = $getNodeByKey(saved.anchor.key);
          const fn = $getNodeByKey(saved.focus.key);
          if (an && fn) {
            const sel = $createRangeSelection();
            sel.anchor.set(saved.anchor.key, saved.anchor.offset, saved.anchor.type);
            sel.focus.set(saved.focus.key, saved.focus.offset, saved.focus.type);
            $setSelection(sel);
          }
        }

        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return;

        const anchorNode = sel.anchor.getNode();

        // Prüfen ob Cursor bereits in einem Listenelement sitzt
        let listItem: LexicalNode | null = anchorNode;
        while (listItem && !$isListItemNode(listItem)) listItem = listItem.getParent();

        const timerNode = $createTimerListItemNode(timerConfig, newResetId);
        timerNode.setChecked(false);

        if (listItem && $isListItemNode(listItem) && !$isTimerListItemNode(listItem)) {
          for (const child of listItem.getChildren()) timerNode.append(child);
          listItem.replace(timerNode);
        } else {
          // Cursor in Paragraph oder anderem Block → in Check-Liste einbetten
          const topEl = anchorNode.getKey() === 'root'
            ? anchorNode
            : (anchorNode.getTopLevelElementOrThrow() as LexicalNode);
          if ('getChildren' in topEl) {
            for (const child of (topEl as any).getChildren() as LexicalNode[]) timerNode.append(child);
          }
          const listNode = $createListNode('check');
          listNode.append(timerNode);
          topEl.replace(listNode);
        }

        timerNode.selectEnd();
      });
      return;
    }

    const timerConfig: TimerConfig = { type: 'countdown', totalMs };

    // Read existing resetId and checked state before update (new nodes get a pre-generated one)
    let resetId = generateResetId();
    let nodeIsChecked = false;
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isTimerListItemNode(node)) {
        resetId = node.getResetId();
        nodeIsChecked = node.getChecked() ?? false;
      } else if ($isListItemNode(node)) {
        nodeIsChecked = node.getChecked() ?? false;
      }
    });
    const finalResetId = resetId;

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!node) return;
      if ($isTimerListItemNode(node)) {
        node.setTimerConfig(timerConfig);
      } else if ($isListItemNode(node)) {
        const timerNode = $createTimerListItemNode(timerConfig, finalResetId);
        timerNode.setChecked(node.getChecked() ?? false);
        for (const child of node.getChildren()) timerNode.append(child);
        node.replace(timerNode);
      }
    });

    if (nodeIsChecked) {
      setTimer(finalResetId, { type: 'countdown', endsAt: Date.now() + totalMs, totalMs });
    }
    // Unchecked: TimerCheckboxPlugin startet den Timer beim ersten Check

    checklistNodeKeyRef.current = null;
    setShowTimerModal(false);
  };

  const handleChecklistTimerRemove = () => {
    const nodeKey = checklistNodeKeyRef.current;
    if (!nodeKey) { setShowTimerModal(false); return; }

    let resetIdToRemove = '';
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isTimerListItemNode(node)) resetIdToRemove = node.getResetId();
    });

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isTimerListItemNode(node)) return;
      const regularNode = $createListItemNode();
      regularNode.setChecked(node.getChecked() ?? false);
      for (const child of node.getChildren()) regularNode.append(child);
      node.replace(regularNode);
    });

    if (resetIdToRemove) removeTimer(resetIdToRemove);
    checklistNodeKeyRef.current = null;
    setShowTimerModal(false);
  };

  const openHeadingPicker = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    closeAllPopups();
    setHeadingPickerPos(prev => prev ? null : { x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
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
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          setBlockType(type);
          if (type === 'code' && $isCodeNode(element)) {
            setCodeLanguage(normalizeCodeLang(element.getLanguage() ?? 'js'));
          }
        }
      }

      const nodeStyles = $isTextNode(anchorNode) ? parseStyle(anchorNode.getStyle()) : {};
      const pendingStyles = selection.isCollapsed() && selection.style ? parseStyle(selection.style) : {};
      const styles = { ...nodeStyles, ...pendingStyles };
      setFontColor(styles['color'] || '');
      setHighlightColor(styles['background-color'] || '');
      setFontFamily(styles['font-family'] || '');
      const rawSize = styles['font-size'] || '';
      setFontSize(rawSize ? String(Math.round(parseFloat(rawSize) * 3 / 4)) : '');
      setLineHeight(styles['line-height'] || '');

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

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (blockType !== 'code') {
        // Collapse to anchor paragraph — $setBlocksType creates one code node per selected
        // block, so a multi-paragraph selection would produce multiple code blocks.
        const collapsed = $createRangeSelection();
        collapsed.anchor.set(selection.anchor.key, selection.anchor.offset, selection.anchor.type);
        collapsed.focus.set(selection.anchor.key, selection.anchor.offset, selection.anchor.type);
        $setBlocksType(collapsed, () => $createCodeNode());
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
    const rect = e.currentTarget.getBoundingClientRect();
    closeAllPopups();
    setCodeLangPickerPos(prev => prev ? null : { x: rect.left, y: rect.bottom + 4 });
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
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'line-height': value });
        if (selection.isCollapsed()) {
          selection.style = mergeStyle(selection.style, { 'line-height': value });
        }
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

  const insertLink = () => setShowLinkModal(true);
  const insertImage = () => setShowImageModal(true);

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
      setLinkUrl('');
      setShowLinkModal(false);
    }
  };

  const insertImageFromUrl = (url: string, altText?: string) => {
    const name = altText || url.split('/').pop()?.split('?')[0] || 'Uploaded Image';
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { altText: name, src: url });
  };

  return {
    roundedCount,
    wordCount,
    saveSelection,
    showMoreMenu, setShowMoreMenu,
    isInTable,
    isBold, isItalic, isUnderline, isStrikethrough, isSuperscript, isSubscript,
    blockType,
    canUndo, canRedo, canOutdent,
    fontColor, highlightColor, fontFamily, fontSize, lineHeight,
    showFontPickerModal, setShowFontPickerModal,
    colorPickerPos, setColorPickerPos,
    highlightPickerPos, setHighlightPickerPos,
    fontSizePos, setFontSizePos,
    lineHeightPickerPos, setLineHeightPickerPos,
    headingPickerPos, setHeadingPickerPos,
    codeLanguage,
    codeLangPickerPos, setCodeLangPickerPos,
    showLinkModal, setShowLinkModal,
    showImageModal, setShowImageModal,
    showTableModal, setShowTableModal,
    linkUrl, setLinkUrl,
    showTimerModal, setShowTimerModal,
    checklistDropdownPos, setChecklistDropdownPos,
    checklistCountdownHours, setChecklistCountdownHours,
    checklistCountdownMinutes, setChecklistCountdownMinutes,
    checklistExistingTimer,
    closeAllPopups,
    openColorFromMenu,
    openHighlightFromMenu,
    openFontPickerFromMenu,
    openFontSizeFromMenu,
    openLineHeightFromMenu,
    openChecklistDropdown,
    openTimerModal,
    handleChecklistTimerSave,
    handleChecklistTimerRemove,
    openHeadingPicker,
    openCodeLangPicker,
    formatText,
    formatHeading,
    removeHeading,
    formatBulletList,
    formatNumberedList,
    formatQuote,
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
    insertLink,
    insertImage,
    handleLinkSubmit,
    insertImageFromUrl,
  };
}

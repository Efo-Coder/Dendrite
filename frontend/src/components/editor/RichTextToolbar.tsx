import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useSmartPopupStyle } from '../../hooks/useSmartPopupStyle';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import ElevatedToolbar from './ElevatedToolbar';
import ImageInsertModal from '../modals/ImageInsertModal';
import { useGoogleFonts } from '../../hooks/useGoogleFonts';
import ChecklistTimerModal from '../modals/ChecklistTimerModal';
import TableInsertModal from '../modals/TableInsertModal';
import LinkInsertModal from '../modals/LinkInsertModal';
import ColorPickerPortal from './ColorPickerPortal';
import { useToolbarState } from './useToolbarState';
import { ToolbarStateContext } from './ToolbarStateContext';
import { CODE_LANGUAGE_FRIENDLY_NAME_MAP, getLanguageFriendlyName } from '@lexical/code';
import {
  SiJavascript, SiTypescript, SiPython, SiRust, SiSwift,
  SiHtml5, SiCss, SiCplusplus, SiC,
  SiMarkdown, SiPhp, SiRuby, SiGo, SiKotlin, SiLua, SiScala,
  SiR, SiGnubash,
} from 'react-icons/si';
import type { IconType } from 'react-icons';
import {
  Bold, Italic, Underline, Strikethrough, Superscript, Subscript, List, ListOrdered, ListChecks, Quote, CodeXml, Link, Image, Minus, Table,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, X,
  Heading,
  ClockCheck, IndentIncrease, IndentDecrease, Tag, Info, MoreVertical,
  Palette, Highlighter, Type, ListChevronsUpDown,
} from 'lucide-react';
import clsx from 'clsx';


const LANG_ICONS: Record<string, IconType> = {
  js: SiJavascript, javascript: SiJavascript,
  ts: SiTypescript, typescript: SiTypescript,
  py: SiPython, python: SiPython,
  rust: SiRust, swift: SiSwift,
  html: SiHtml5, css: SiCss,
  cpp: SiCplusplus, c: SiC,
  markdown: SiMarkdown, php: SiPhp,
  ruby: SiRuby, go: SiGo,
  kotlin: SiKotlin, lua: SiLua,
  scala: SiScala, r: SiR,
  bash: SiGnubash, shell: SiGnubash,
};

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];
const LINE_HEIGHTS = ['1', '1.25', '1.5', '1.75', '2', '2.5'];

const isPickerActive = (value: string, current: string, defaultValue: string) =>
  current === value || (value === defaultValue && !current);

const popupCls = (placement: 'above' | 'below', extra = '') =>
  clsx(
    'fixed overflow-hidden z-40',
    'border border-(--line)',
    placement === 'above' ? 'border-b-0' : 'border-t-0',
    extra,
  );

const getPopupStyle = (placement: 'above' | 'below'): React.CSSProperties => ({
  background: 'transparent',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: placement === 'above' ? '1rem 1rem 0 0' : '0 0 1rem 1rem',
  clipPath: placement === 'above' ? 'inset(-1px round 1rem 1rem 0 0)' : 'inset(-1px round 0 0 1rem 1rem)',
});

const popupPad = (placement: 'above' | 'below', near = '2', far = '6') =>
  placement === 'above' ? `pt-${near} pb-${far}` : `pb-${near} pt-${far}`;

const popupMotion = (placement: 'above' | 'below') => {
  const dock  = placement === 'above' ?  16 : -16;
  const enter = dock + 8;
  return {
    initial: { opacity: 0, y: enter },
    animate: { opacity: 1, y: dock },
    exit: { opacity: 0, y: enter, transition: { duration: 0.12 } },
    transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  };
};

const isToolbarActive = (pickerOpen: boolean, current = '', defaultValue = '') =>
  pickerOpen || (!!current && current !== defaultValue);

const menuBtnCls = (active: boolean) =>
  clsx(
    'icon-btn-md rounded-lg transition-colors shrink-0 disabled:opacity-30',
    active ? 'text-(--ink) sidebar-item-active' : '',
  );

const pickerItemCls = (active: boolean, extra = '') =>
  clsx(
    'py-1.5 text-sm transition-colors text-left whitespace-nowrap hover:bg-(--surface-hi)',
    active ? 'text-(--accent)' : 'text-(--ink)',
    extra,
  );

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Black', value: '#111827' },
  { label: 'Gray', value: '#9ca3af' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Pink', value: '#ec4899' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fce7f3' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Purple', value: '#e9d5ff' },
];

interface RichTextToolbarProps {
  disabled?: boolean;
  noteId?: string;
  onManageTags?: () => void;
  onInfo?: () => void;
  minimalChrome?: boolean;
}

type ToolbarBtn = {
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  actionWithEvent?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  isActive?: boolean;
  isDisabled?: boolean;
};


const RichTextToolbar = ({ disabled = false, onManageTags, onInfo, minimalChrome = false }: RichTextToolbarProps) => {
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const toolbarState = useToolbarState(minimalChrome, moreMenuRef);
  const {
    roundedCount, wordCount,
    showMoreMenu, setShowMoreMenu,
    isInTable,
    isBold, isItalic, isUnderline, isStrikethrough, isSuperscript, isSubscript,
    blockType, canUndo, canRedo, canOutdent,
    fontColor, highlightColor, fontFamily, fontSize, lineHeight,
    fontPickerPos, setFontPickerPos,
    colorPickerPos, setColorPickerPos,
    highlightPickerPos, setHighlightPickerPos,
    fontSizePos, setFontSizePos,
    lineHeightPickerPos, setLineHeightPickerPos,
    headingPickerPos, setHeadingPickerPos,
    codeLanguage, codeLangPickerPos, setCodeLangPickerPos,
    showLinkModal, setShowLinkModal,
    showImageModal, setShowImageModal,
    showTableModal, setShowTableModal,
    linkUrl, setLinkUrl,
    showTimerModal, setShowTimerModal,
    checklistDropdownPos, setChecklistDropdownPos,
    checklistCountdownHours, setChecklistCountdownHours,
    checklistCountdownMinutes, setChecklistCountdownMinutes,
    checklistExistingTimer,
    openColorFromMenu, openHighlightFromMenu, openFontPickerFromMenu, openFontSizeFromMenu, openLineHeightFromMenu,
    openChecklistDropdown, openTimerModal, handleChecklistTimerSave, handleChecklistTimerRemove,
    openHeadingPicker, openCodeLangPicker, setCodeNodeLanguage, closeAllPopups,
    formatText, formatHeading, removeHeading, formatBulletList, formatNumberedList,
    formatQuote, formatCode, formatCheckList,
    indentContent, outdentContent, formatAlignment,
    applyFontColor, applyHighlight, applyFontFamily, applyFontSize, applyLineHeight,
    undoAction, redoAction,
    insertHorizontalRule, insertTable, removeTable,
    insertLink, insertImage, handleLinkSubmit, insertImageFromUrl,
  } = toolbarState;

  const { fonts: allFonts, loading: fontPickerLoading, error: fontPickerError } = useGoogleFonts();
  const [fontSearch, setFontSearch] = useState('');
  const filteredFonts = useMemo(
    () => allFonts.filter((f) => f.family.toLowerCase().includes(fontSearch.toLowerCase())),
    [allFonts, fontSearch]
  );
  useEffect(() => { if (!fontPickerPos) setFontSearch(''); }, [fontPickerPos]);

  const fontPickerRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const lineHeightPickerRef = useRef<HTMLDivElement>(null);
  const headingPickerRef = useRef<HTMLDivElement>(null);
  const miniToolbarRef = useRef<HTMLDivElement>(null);
  const codeLangPickerRef = useRef<HTMLDivElement>(null);
  const checklistDropdownRef = useRef<HTMLDivElement>(null);

  const { style: headingPickerStyle } = useSmartPopupStyle(headingPickerPos, headingPickerRef, -8);
  const { style: fontPickerStyle, placement: fontPickerPlacement } = useSmartPopupStyle(fontPickerPos, fontPickerRef, 0);
  const { style: fontSizeStyle } = useSmartPopupStyle(fontSizePos, fontSizeRef, -8);
  const { style: lineHeightStyle } = useSmartPopupStyle(lineHeightPickerPos, lineHeightPickerRef, -8);
  const { style: codeLangStyle, placement: codeLangPlacement } = useSmartPopupStyle(codeLangPickerPos, codeLangPickerRef, 0);
  const { style: checklistStyle, placement: checklistPlacement } = useSmartPopupStyle(checklistDropdownPos, checklistDropdownRef, 0);

  const isInCode = blockType === 'code';

  const buttonGroups: { id: string; buttons: ToolbarBtn[] }[] = [
    {
      id: 'format',
      buttons: [
        { icon: Bold, action: () => formatText('bold'), title: 'Bold', isActive: isBold, isDisabled: isInCode },
        { icon: Italic, action: () => formatText('italic'), title: 'Italic', isActive: isItalic, isDisabled: isInCode },
        { icon: Underline, action: () => formatText('underline'), title: 'Underline', isActive: isUnderline, isDisabled: isInCode },
        { icon: Strikethrough, action: () => formatText('strikethrough'), title: 'Strikethrough', isActive: isStrikethrough, isDisabled: isInCode },
        { icon: Superscript, action: () => formatText('superscript'), title: 'Superscript', isActive: isSuperscript, isDisabled: isInCode },
        { icon: Subscript, action: () => formatText('subscript'), title: 'Subscript', isActive: isSubscript, isDisabled: isInCode },
      ],
    },
    {
      id: 'lists',
      buttons: [
        { icon: List, action: formatBulletList, title: 'Bullet list', isActive: blockType === 'bullet' },
        { icon: ListOrdered, action: formatNumberedList, title: 'Numbered list', isActive: blockType === 'number' },
        { icon: ListChecks, action: () => {}, actionWithEvent: (e) => openChecklistDropdown(e), title: 'Checklist', isActive: blockType === 'check' || blockType === 'timer-checkbox' || !!checklistDropdownPos },
        { icon: Quote, action: formatQuote, title: 'Quote', isActive: blockType === 'quote' },
      ],
    },
    {
      id: 'align',
      buttons: [
        { icon: AlignLeft, action: () => formatAlignment('left'), title: 'Align left', isDisabled: isInCode },
        { icon: AlignCenter, action: () => formatAlignment('center'), title: 'Center', isDisabled: isInCode },
        { icon: AlignRight, action: () => formatAlignment('right'), title: 'Align right', isDisabled: isInCode },
        { icon: AlignJustify, action: () => formatAlignment('justify'), title: 'Justify', isDisabled: isInCode },
      ],
    },
    {
      id: 'insert',
      buttons: [
        { icon: Link, action: insertLink, title: 'Insert link' },
        { icon: Image, action: insertImage, title: 'Insert image', isDisabled: isInCode },
        { icon: Minus, action: insertHorizontalRule, title: 'Horizontal rule', isDisabled: isInCode },
        { icon: Table, action: () => isInTable ? removeTable() : setShowTableModal(true), title: 'Table', isActive: isInTable, isDisabled: isInCode },
      ],
    },
    {
      id: 'indent',
      buttons: [
        { icon: IndentIncrease, action: indentContent, title: 'Increase indent' },
        { icon: IndentDecrease, action: outdentContent, title: 'Decrease indent', isDisabled: !canOutdent },
      ],
    },
    {
      id: 'history',
      buttons: [
        { icon: Undo, action: undoAction, title: 'Undo', isDisabled: !canUndo },
        { icon: Redo, action: redoAction, title: 'Redo', isDisabled: !canRedo },
      ],
    },
  ];

  const anyGroupActive = buttonGroups.some(g => g.buttons.some(btn => !!btn.isActive));
  const headingBtnActive = !!headingPickerPos || blockType.startsWith('h');
  const colorBtnActive = !!colorPickerPos;
  const highlightBtnActive = !!highlightPickerPos;
  const fontPickerBtnActive = !!fontPickerPos;
  const fontSizeBtnActive = isToolbarActive(!!fontSizePos, fontSize, '12');
  const lineHeightBtnActive = isToolbarActive(!!lineHeightPickerPos, lineHeight, '1.5');
  const codeBtnActive = blockType === 'code';
  const hasPopupActive = showMoreMenu || anyGroupActive ||
    headingBtnActive || colorBtnActive || highlightBtnActive ||
    fontPickerBtnActive || fontSizeBtnActive || lineHeightBtnActive || codeBtnActive;

  const renderBtn = (
    btn: ToolbarBtn,
    key: number,
    enterFn: (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => void = () => {},
  ) => (
    <button
      key={key}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => btn.actionWithEvent ? btn.actionWithEvent(e) : btn.action()}
      onMouseEnter={(e) => enterFn(e, !!btn.isActive)}
      disabled={disabled || !!btn.isDisabled}
      className={menuBtnCls(!!btn.isActive)}
      title={btn.title}
    >
      <btn.icon className="w-4 h-4" />
    </button>
  );

  const miniIconBtn = (
    onClick: () => void,
    title: string,
    Icon: typeof List,
    active: boolean | undefined,
    onEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void,
    extraDisabled?: boolean,
  ) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      onMouseEnter={onEnter}
      disabled={disabled || extraDisabled}
      title={title}
      className={clsx(
        'icon-btn-md rounded-full transition-colors disabled:opacity-30',
        active ? 'text-(--ink)' : ''
      )}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
    </button>
  );

  return (
    <ToolbarStateContext.Provider value={toolbarState}>
    <div className="relative">
      <ElevatedToolbar disabled={disabled} />

      <div
        className={clsx(
          'overflow-hidden transition-all duration-500 ease-out',
          minimalChrome
            ? 'pointer-events-none max-h-0 py-0 opacity-0'
            : 'max-h-40 opacity-100'
        )}
      >
        <div
          className={clsx(
            'mx-8 shrink-0 transition-colors duration-500 sm:mx-14 border-b',
            minimalChrome ? 'border-transparent' : 'border-divider'
          )}
          aria-hidden
        />
        <div className="flex h-15.5 shrink-0 items-center justify-between gap-3 px-6 sm:px-12">
          <span className="text-xs text-(--ink-dim) tabular-nums tracking-wide select-none">
            <motion.span>{roundedCount}</motion.span> {wordCount === 1 ? 'word' : 'words'}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <div
              ref={miniToolbarRef}
              className="relative flex items-center gap-0.5 rounded-full border border-[color-mix(in_srgb,var(--line)_48%,transparent)] px-1 py-1 shadow-[0_8px_28px_color-mix(in_srgb,#000_18%,transparent)]"
            >
              {miniIconBtn(formatBulletList, 'Bullet list', List, blockType === 'bullet', undefined)}
              {miniIconBtn(insertImage, 'Image', Image, false, undefined, isInCode)}
              {onManageTags && miniIconBtn(() => onManageTags(), 'Tags', Tag, false, undefined)}
              {onInfo && miniIconBtn(() => onInfo(), 'Info', Info, false, undefined)}
              {miniIconBtn(() => setShowMoreMenu((v) => !v), 'More tools', MoreVertical, hasPopupActive, undefined)}
            </div>
          </div>
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {showMoreMenu && !minimalChrome && (
          <>
          <div className="fixed inset-0" onClick={() => setShowMoreMenu(false)} />
          <motion.div
            ref={moreMenuRef}
            className="fixed bottom-24 right-6 sm:right-12 w-[min(92vw,280px)] max-h-[70vh] overflow-y-auto rounded-2xl border border-[color-mix(in_srgb,var(--line)_50%,transparent)] p-2 glass-popup shadow-2xl z-50"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => closeAllPopups()}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-(--ink-mid)">Edit</p>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {buttonGroups[0].buttons.map((btn, bi) => renderBtn(btn, bi))}
              <button
                type="button"
                onClick={(e) => openHeadingPicker(e)}
                disabled={disabled}
                className={menuBtnCls(headingBtnActive)}
                title="Heading"
              >
                <Heading className="w-4 h-4" />
              </button>
              <button type="button" onClick={openColorFromMenu} disabled={disabled || isInCode} className={menuBtnCls(colorBtnActive)} title="Font color">
                <Palette className="w-4 h-4" />
              </button>
              <button type="button" onClick={openHighlightFromMenu} disabled={disabled || isInCode} className={menuBtnCls(highlightBtnActive)} title="Highlight">
                <Highlighter className="w-4 h-4" />
              </button>
              <button type="button" onClick={openFontPickerFromMenu} disabled={disabled || isInCode} className={menuBtnCls(fontPickerBtnActive)} title="Font">
                <Type className="w-4 h-4" />
              </button>
              <button type="button" onClick={openFontSizeFromMenu} disabled={disabled || isInCode} className={menuBtnCls(fontSizeBtnActive)} title="Font size">
                <svg viewBox="0 0 29.000999 19" className="w-4 h-4" fill="currentColor"><g transform="translate(-90.999,-506)"><path d="m 119.115,523.838 c -0.325,-0.07 -0.611,-0.176 -0.857,-0.316 -0.326,-0.193 -0.577,-0.398 -0.753,-0.613 -0.177,-0.217 -0.321,-0.455 -0.437,-0.721 -0.687,-1.619 -1.518,-3.66 -2.495,-6.125 -0.978,-2.465 -2.329,-5.818 -4.054,-10.063 h -2.641 c -1.241,2.994 -2.375,5.73 -3.399,8.213 -1.026,2.482 -2.049,4.961 -3.07,7.434 -0.167,0.422 -0.376,0.789 -0.627,1.096 -0.251,0.309 -0.557,0.568 -0.917,0.779 -0.212,0.133 -0.5,0.236 -0.865,0.31 -0.365,0.074 -0.693,0.121 -0.984,0.139 V 525 h 7.686 v -1.029 c -0.995,-0.088 -1.707,-0.231 -2.133,-0.43 -0.428,-0.197 -0.641,-0.438 -0.641,-0.719 0,-0.088 0.015,-0.242 0.047,-0.463 0.029,-0.219 0.129,-0.576 0.297,-1.068 0.132,-0.379 0.288,-0.81 0.469,-1.295 0.139,-0.371 0.265,-0.697 0.385,-0.996 h 6.691 l 1.486,3.611 c 0.061,0.148 0.099,0.268 0.111,0.355 0.014,0.088 0.021,0.168 0.021,0.238 0,0.203 -0.321,0.371 -0.964,0.508 -0.643,0.137 -0.995,0.223 -1.471,0.258 V 525 h 10 v -1.029 c -0.264,-0.018 -0.56,-0.061 -0.885,-0.133 z M 109.994,517 h -5.064 l 2.514,-6.365 z" /><path d="m 106.547,524.144 c -0.24,-0.053 -0.451,-0.129 -0.633,-0.234 -0.24,-0.143 -0.425,-0.293 -0.555,-0.451 -0.129,-0.16 -0.236,-0.336 -0.32,-0.531 -0.506,-1.193 -1.119,-2.697 -1.84,-4.514 -0.719,-1.816 -1.715,-4.287 -2.986,-7.414 h -1.945 c -0.914,2.205 -1.75,4.223 -2.506,6.053 -0.756,1.828 -1.51,3.654 -2.262,5.477 -0.123,0.31 -0.277,0.58 -0.462,0.809 -0.185,0.227 -0.41,0.418 -0.676,0.572 -0.156,0.098 -0.368,0.174 -0.638,0.23 -0.27,0.055 -0.512,0.088 -0.725,0.102 V 525 h 5.662 v -0.758 c -0.732,-0.065 -1.257,-0.17 -1.571,-0.316 -0.313,-0.146 -0.472,-0.322 -0.472,-0.531 0,-0.064 0.012,-0.178 0.035,-0.34 0.021,-0.162 0.094,-0.424 0.218,-0.787 0.097,-0.279 0.212,-0.598 0.346,-0.955 0.034,-0.092 0.237,-0.607 0.516,-1.313 h 4.479 l 1.314,3.24 c 0.045,0.109 0.072,0.197 0.082,0.262 0.01,0.064 0.016,0.123 0.016,0.176 0,0.148 -0.238,0.273 -0.711,0.375 -0.475,0.1 -0.886,0.164 -1.236,0.19 V 525 H 107 v -0.758 c 0,0 -0.213,-0.045 -0.453,-0.098 z M 96.129,519 c 0.795,-2.008 1.817,-4.584 1.817,-4.584 l 1.86,4.584 z" /></g></svg>
              </button>
            </div>
            <div className="h-px border-t border-(--line-soft) my-1" />
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-(--ink-mid)">Lists &amp; Layout</p>
            <div className="flex flex-wrap gap-1 px-1 pb-1">
              {buttonGroups[1].buttons.map((btn, bi) => renderBtn(btn, bi + 100))}
              {(() => {
                const LangIcon = blockType === 'code' ? LANG_ICONS[codeLanguage] : undefined;
                return (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => blockType === 'code' ? openCodeLangPicker(e) : formatCode()}
                    disabled={disabled}
                    className={menuBtnCls(codeBtnActive)}
                    title={blockType === 'code' ? `Language: ${getLanguageFriendlyName(codeLanguage)}` : 'Code'}
                  >
                    {LangIcon
                      ? <LangIcon className="w-4 h-4" />
                      : blockType === 'code'
                        ? <span className="font-mono text-[10px] leading-none px-0.5">{getLanguageFriendlyName(codeLanguage).slice(0, 4).toUpperCase()}</span>
                        : <CodeXml className="w-4 h-4" />
                    }
                  </button>
                );
              })()}
            </div>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {buttonGroups[2].buttons.map((btn, bi) => renderBtn(btn, bi + 200))}
              <button type="button" onClick={openLineHeightFromMenu} disabled={disabled || isInCode} className={menuBtnCls(lineHeightBtnActive)} title="Line spacing">
                <ListChevronsUpDown className="w-4 h-4" />
              </button>
              {buttonGroups[4].buttons.map((btn, bi) => renderBtn(btn, bi + 300))}
            </div>
            <div className="h-px border-t border-(--line-soft) my-1" />
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-(--ink-mid)">Insert</p>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {buttonGroups[3].buttons.map((btn, bi) => renderBtn(btn, bi + 400))}
            </div>
            <div className="h-px border-t border-(--line-soft) my-1" />
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {buttonGroups[5].buttons.map((btn, bi) => renderBtn(btn, bi + 500))}
            </div>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot()
      )}

      {createPortal(
        <AnimatePresence>
          {headingPickerPos && (
          <>
          <div className="fixed inset-0" onClick={() => setHeadingPickerPos(null)} />
          <motion.div
            ref={headingPickerRef}
            className={popupCls('above', popupPad('above'))}
            style={{ ...(headingPickerPos?.width !== undefined ? { width: headingPickerPos.width } : {}), ...headingPickerStyle, ...getPopupStyle('above') }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion('above')}
          >
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden" onWheel={(e) => { e.currentTarget.scrollBy({ left: e.deltaY, behavior: 'smooth' }); }}>
              {blockType.startsWith('h') && (
                <button
                  onClick={() => { removeHeading(); setHeadingPickerPos(null); }}
                  className="px-2.5 py-1 text-sm rounded-lg transition-colors text-red-500 hover:bg-(--surface-hi) shrink-0 whitespace-nowrap"
                >
                  ✕
                </button>
              )}
              {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((tag) => (
                <button
                  key={tag}
                  onClick={() => { formatHeading(tag); setHeadingPickerPos(null); }}
                  className={clsx('px-2.5 py-1 text-sm rounded-lg transition-colors whitespace-nowrap hover:bg-(--surface-hi)', blockType === tag ? 'text-(--accent)' : 'text-(--ink)')}
                >
                  {tag.toUpperCase()}
                </button>
              ))}
            </div>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot()
      )}

      {createPortal(
        <AnimatePresence>
          {codeLangPickerPos && (
          <>
          <div className="fixed inset-0" onClick={() => setCodeLangPickerPos(null)} />
          <motion.div
            ref={codeLangPickerRef}
            className={popupCls(codeLangPlacement, popupPad(codeLangPlacement))}
            style={{ ...codeLangStyle, ...getPopupStyle(codeLangPlacement) }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion(codeLangPlacement)}
          >
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden" onWheel={(e) => { e.currentTarget.scrollBy({ left: e.deltaY, behavior: 'smooth' }); }}>
              <button
                onClick={() => { formatCode(); setCodeLangPickerPos(null); }}
                className="flex items-center justify-center px-2.5 py-1 rounded-lg transition-colors text-red-500 hover:bg-(--surface-hi) shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
              {Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP).map(([lang, label]) => {
                const LangIcon = LANG_ICONS[lang];
                return (
                  <button
                    key={lang}
                    onClick={() => { setCodeNodeLanguage(lang); setCodeLangPickerPos(null); }}
                    className={clsx('flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-lg transition-colors shrink-0 hover:bg-(--surface-hi)', isPickerActive(lang, codeLanguage, 'js') ? 'text-(--accent)' : 'text-(--ink)')}
                  >
                    {LangIcon
                      ? <LangIcon className="w-3.5 h-3.5 shrink-0" />
                      : <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center font-mono text-[9px] leading-none ring-1 ring-current rounded-sm">{label.slice(0, 3).toUpperCase()}</span>
                    }
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot()
      )}

      <ColorPickerPortal
        position={colorPickerPos}
        onClose={() => setColorPickerPos(null)}
        color={fontColor}
        onChange={applyFontColor}
        presets={TEXT_COLORS}
        storageKey="dendrite-favorite-colors"
        padding={-8}
      />

      <ColorPickerPortal
        position={highlightPickerPos}
        onClose={() => setHighlightPickerPos(null)}
        color={highlightColor}
        onChange={applyHighlight}
        presets={HIGHLIGHT_COLORS}
        storageKey="dendrite-favorite-highlights"
        fallbackColor="#fef08a"
        padding={-8}
      />

      {createPortal(
        <AnimatePresence>
          {fontSizePos && (
          <>
          <div className="fixed inset-0" onClick={() => setFontSizePos(null)} />
          <motion.div
            ref={fontSizeRef}
            className={popupCls('above', popupPad('above'))}
            style={{ ...(fontSizePos?.width !== undefined ? { width: fontSizePos.width } : {}), ...fontSizeStyle, ...getPopupStyle('above') }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion('above')}
          >
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden" onWheel={(e) => { e.currentTarget.scrollBy({ left: e.deltaY, behavior: 'smooth' }); }}>
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => { applyFontSize(size); setFontSizePos(null); }}
                  className={clsx('px-2.5 py-1 text-sm rounded-lg transition-colors whitespace-nowrap hover:bg-(--surface-hi)', isPickerActive(size, fontSize, '12') ? 'text-(--accent)' : 'text-(--ink)')}
                >
                  {size}
                </button>
              ))}
            </div>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot()
      )}

      {createPortal(
        <AnimatePresence>
          {lineHeightPickerPos && (
          <>
          <div className="fixed inset-0" onClick={() => setLineHeightPickerPos(null)} />
          <motion.div
            ref={lineHeightPickerRef}
            className={popupCls('above', popupPad('above'))}
            style={{ ...(lineHeightPickerPos?.width !== undefined ? { width: lineHeightPickerPos.width } : {}), ...lineHeightStyle, ...getPopupStyle('above') }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion('above')}
          >
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden" onWheel={(e) => { e.currentTarget.scrollBy({ left: e.deltaY, behavior: 'smooth' }); }}>
              {LINE_HEIGHTS.map((value) => (
                <button
                  key={value}
                  onClick={() => { applyLineHeight(value); setLineHeightPickerPos(null); }}
                  className={clsx('px-2.5 py-1 text-sm rounded-lg transition-colors whitespace-nowrap hover:bg-(--surface-hi)', isPickerActive(value, lineHeight, '1.5') ? 'text-(--accent)' : 'text-(--ink)')}
                >
                  {value}×
                </button>
              ))}
            </div>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot()
      )}

      <LinkInsertModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        onSubmit={handleLinkSubmit}
      />

      <TableInsertModal isOpen={showTableModal} onClose={() => setShowTableModal(false)} onInsert={(r, c) => { insertTable(r, c); setShowTableModal(false); }} />

      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={insertImageFromUrl}
      />

      {createPortal(
        <AnimatePresence>
          {fontPickerPos && (
          <>
          <div className="fixed inset-0" onClick={() => setFontPickerPos(null)} />
          <motion.div
            ref={fontPickerRef}
            className={popupCls(fontPickerPlacement, popupPad(fontPickerPlacement, '1', '4'))}
            style={{ width: 220, ...fontPickerStyle, ...getPopupStyle(fontPickerPlacement) }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion(fontPickerPlacement)}
          >
            <div className="flex flex-col px-1 py-1">
              <input
                type="text"
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                placeholder="Search font..."
                className="w-full outline-none border-solid border-(--line) focus:border-(--accent) focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--accent)_14%,transparent)]"
                style={{
                  background: 'var(--bg)',
                  borderWidth: '0.5px',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontFamily: 'var(--serif-display)',
                  fontSize: '15px',
                  color: 'var(--ink)',
                  transition: 'border-color .15s, box-shadow .15s',
                }}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <div style={{ height: '0.5px', background: 'var(--line-soft)', margin: '8px 0' }} />
              {fontPickerLoading ? (
                <p style={{ color: 'var(--ink-dim)', fontFamily: 'var(--mono)', fontSize: 12 }}>Loading…</p>
              ) : fontPickerError ? (
                <p style={{ color: 'var(--danger)', fontFamily: 'var(--mono)', fontSize: 12 }}>{fontPickerError}</p>
              ) : (
                <div className="overflow-y-auto max-h-52">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => { applyFontFamily(''); setFontPickerPos(null); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm hover:bg-(--surface-hi)"
                      style={!fontFamily ? {
                        backgroundColor: 'color-mix(in oklch, var(--accent) 10%, transparent)',
                        border: '1px solid color-mix(in oklch, var(--accent) 50%, transparent)',
                        color: 'var(--accent)',
                      } : { color: 'var(--ink-mid)' }}
                    >
                      <span>Default</span>
                      {!fontFamily && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                    </button>
                    {filteredFonts.map((font) => (
                      <button
                        key={font.family}
                        type="button"
                        onClick={() => { applyFontFamily(font.family); setFontPickerPos(null); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm hover:bg-(--surface-hi)"
                        style={fontFamily === font.family ? {
                          backgroundColor: 'color-mix(in oklch, var(--accent) 10%, transparent)',
                          border: '1px solid color-mix(in oklch, var(--accent) 50%, transparent)',
                          color: 'var(--accent)',
                          fontFamily: `'${font.family}', sans-serif`,
                        } : {
                          color: 'var(--ink-mid)',
                          fontFamily: `'${font.family}', sans-serif`,
                        }}
                      >
                        <span>{font.family}</span>
                        {fontFamily === font.family && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot()
      )}

      {createPortal(
        <AnimatePresence>
          {checklistDropdownPos && (
          <>
          <div className="fixed inset-0" onClick={() => setChecklistDropdownPos(null)} />
          <motion.div
            ref={checklistDropdownRef}
            className={popupCls(checklistPlacement, popupPad(checklistPlacement, '1', '4'))}
            style={{ ...checklistStyle, ...getPopupStyle(checklistPlacement) }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion(checklistPlacement)}
          >
            <button
              onClick={() => { formatCheckList(); setChecklistDropdownPos(null); }}
              className={pickerItemCls(blockType === 'check', 'flex items-center gap-2 px-3 w-full')}
            >
              <ListChecks className="w-4 h-4 shrink-0" />
              Checkbox
            </button>
            <button
              onClick={() => {
                setChecklistDropdownPos(null);
                openTimerModal();
              }}
              className={pickerItemCls(blockType === 'timer-checkbox', 'flex items-center gap-2 px-3 w-full')}
            >
              <ClockCheck className="w-4 h-4 shrink-0" />
              Timer-Checkbox
            </button>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot()
      )}

      <ChecklistTimerModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        countdownHours={checklistCountdownHours}
        setCountdownHours={setChecklistCountdownHours}
        countdownMinutes={checklistCountdownMinutes}
        setCountdownMinutes={setChecklistCountdownMinutes}
        existingTimer={checklistExistingTimer}
        onSave={handleChecklistTimerSave}
        onRemove={handleChecklistTimerRemove}
      />
    </div>
    </ToolbarStateContext.Provider>
  );
};

export default RichTextToolbar;

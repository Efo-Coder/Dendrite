import { useState, useRef } from 'react';
import { useSmartPopupStyle } from '../../hooks/useSmartPopupStyle';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useGlassPill } from '../../hooks/useGlassPill';
import ElevatedToolbar from './ElevatedToolbar';
import ImageInsertModal from '../modals/ImageInsertModal';
import FontPickerModal from '../modals/FontPickerModal';
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
  Heading, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  ClockCheck, IndentIncrease, IndentDecrease, Tag, Info, MoreVertical,
  Palette, Highlighter, Type, ALargeSmall, ListChevronsUpDown,
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

const isToolbarActive = (pickerOpen: boolean, current = '', defaultValue = '') =>
  pickerOpen || (!!current && current !== defaultValue);

const menuBtnCls = (active: boolean) =>
  clsx(
    'icon-btn-md rounded-lg transition-colors flex-shrink-0 relative z-10 disabled:opacity-30',
    active ? 'text-text-primary sidebar-item-active' : '',
  );

const pickerItemCls = (active: boolean, extra = '') =>
  clsx(
    'py-1.5 text-sm transition-colors relative z-10 text-left whitespace-nowrap',
    active ? 'text-brand-primary' : 'text-text-primary',
    extra,
  );

const TEXT_COLORS = [
  { label: 'Standard', value: '' },
  { label: 'Schwarz', value: '#111827' },
  { label: 'Grau', value: '#9ca3af' },
  { label: 'Rot', value: '#ef4444' },
  { label: 'Grün', value: '#22c55e' },
  { label: 'Blau', value: '#3b82f6' },
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
  const toolbarState = useToolbarState(minimalChrome);
  const {
    roundedCount, wordCount,
    showMoreMenu, setShowMoreMenu,
    isInTable,
    isBold, isItalic, isUnderline, isStrikethrough, isSuperscript, isSubscript,
    blockType, canUndo, canRedo, canOutdent,
    fontColor, highlightColor, fontFamily, fontSize, lineHeight,
    showFontPickerModal, setShowFontPickerModal,
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
    openHeadingPicker, openCodeLangPicker, setCodeNodeLanguage,
    formatText, formatHeading, removeHeading, formatBulletList, formatNumberedList,
    formatQuote, formatCode, formatCheckList,
    indentContent, outdentContent, formatAlignment,
    applyFontColor, applyHighlight, applyFontFamily, applyFontSize, applyLineHeight,
    undoAction, redoAction,
    insertHorizontalRule, insertTable, removeTable,
    insertLink, insertImage, handleLinkSubmit, insertImageFromUrl,
  } = toolbarState;

  const fontSizeRef = useRef<HTMLDivElement>(null);
  const lineHeightPickerRef = useRef<HTMLDivElement>(null);
  const headingPickerRef = useRef<HTMLDivElement>(null);
  const miniToolbarRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const codeLangPickerRef = useRef<HTMLDivElement>(null);
  const checklistDropdownRef = useRef<HTMLDivElement>(null);

  const { pill: headingPill, onEnter: onHeadingEnter, onLeave: onHeadingLeave } = useGlassPill(headingPickerRef);
  const { pill: miniToolbarPill, onEnter: onMiniToolbarEnter, onLeave: onMiniToolbarLeave } = useGlassPill(miniToolbarRef);
  const { pill: moreMenuPill, onEnter: onMoreMenuEnter, onLeave: onMoreMenuLeave } = useGlassPill(moreMenuRef);
  const { pill: codeLangPill, onEnter: onCodeLangEnter, onLeave: onCodeLangLeave } = useGlassPill(codeLangPickerRef);
  const { pill: checklistDropdownPill, onEnter: onChecklistDropdownEnter, onLeave: onChecklistDropdownLeave } = useGlassPill(checklistDropdownRef);

  const headingPickerStyle = useSmartPopupStyle(headingPickerPos, headingPickerRef);
  const fontSizeStyle = useSmartPopupStyle(fontSizePos, fontSizeRef);
  const lineHeightStyle = useSmartPopupStyle(lineHeightPickerPos, lineHeightPickerRef);

  const [fontSizePillRect, setFontSizePillRect] = useState<{ left: number; top: number; width: number; height: number; visible: boolean } | null>(null);
  const onFontSizeItemEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const container = fontSizeRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = e.currentTarget.getBoundingClientRect();
    const style = getComputedStyle(container);
    setFontSizePillRect({
      left: bRect.left - cRect.left - (parseFloat(style.borderLeftWidth) || 0),
      top: bRect.top - cRect.top - (parseFloat(style.borderTopWidth) || 0) + container.scrollTop,
      width: bRect.width,
      height: bRect.height,
      visible: true,
    });
  };

  const [lineHeightPillRect, setLineHeightPillRect] = useState<{ left: number; top: number; width: number; height: number; visible: boolean } | null>(null);
  const onLineHeightItemEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const container = lineHeightPickerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = e.currentTarget.getBoundingClientRect();
    const style = getComputedStyle(container);
    setLineHeightPillRect({
      left: bRect.left - cRect.left - (parseFloat(style.borderLeftWidth) || 0),
      top: bRect.top - cRect.top - (parseFloat(style.borderTopWidth) || 0) + container.scrollTop,
      width: bRect.width,
      height: bRect.height,
      visible: true,
    });
  };

  const isInCode = blockType === 'code';

  const buttonGroups: { id: string; buttons: ToolbarBtn[] }[] = [
    {
      id: 'format',
      buttons: [
        { icon: Bold, action: () => formatText('bold'), title: 'Fett', isActive: isBold, isDisabled: isInCode },
        { icon: Italic, action: () => formatText('italic'), title: 'Kursiv', isActive: isItalic, isDisabled: isInCode },
        { icon: Underline, action: () => formatText('underline'), title: 'Unterstrichen', isActive: isUnderline, isDisabled: isInCode },
        { icon: Strikethrough, action: () => formatText('strikethrough'), title: 'Durchgestrichen', isActive: isStrikethrough, isDisabled: isInCode },
        { icon: Superscript, action: () => formatText('superscript'), title: 'Hochgestellt', isActive: isSuperscript, isDisabled: isInCode },
        { icon: Subscript, action: () => formatText('subscript'), title: 'Tiefgestellt', isActive: isSubscript, isDisabled: isInCode },
      ],
    },
    {
      id: 'lists',
      buttons: [
        { icon: List, action: formatBulletList, title: 'Aufzählung', isActive: blockType === 'bullet' },
        { icon: ListOrdered, action: formatNumberedList, title: 'Nummerierte Liste', isActive: blockType === 'number' },
        { icon: ListChecks, action: () => {}, actionWithEvent: (e) => openChecklistDropdown(e), title: 'Checkliste', isActive: blockType === 'check' || blockType === 'timer-checkbox' || !!checklistDropdownPos },
        { icon: Quote, action: formatQuote, title: 'Zitat', isActive: blockType === 'quote' },
      ],
    },
    {
      id: 'align',
      buttons: [
        { icon: AlignLeft, action: () => formatAlignment('left'), title: 'Linksbündig', isDisabled: isInCode },
        { icon: AlignCenter, action: () => formatAlignment('center'), title: 'Zentriert', isDisabled: isInCode },
        { icon: AlignRight, action: () => formatAlignment('right'), title: 'Rechtsbündig', isDisabled: isInCode },
        { icon: AlignJustify, action: () => formatAlignment('justify'), title: 'Blocksatz', isDisabled: isInCode },
      ],
    },
    {
      id: 'insert',
      buttons: [
        { icon: Link, action: insertLink, title: 'Link einfügen' },
        { icon: Image, action: insertImage, title: 'Bild einfügen', isDisabled: isInCode },
        { icon: Minus, action: insertHorizontalRule, title: 'Trennlinie', isDisabled: isInCode },
        { icon: Table, action: () => isInTable ? removeTable() : setShowTableModal(true), title: 'Tabelle', isActive: isInTable, isDisabled: isInCode },
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
        { icon: Undo, action: undoAction, title: 'Rückgängig', isDisabled: !canUndo },
        { icon: Redo, action: redoAction, title: 'Wiederholen', isDisabled: !canRedo },
      ],
    },
  ];

  const anyGroupActive = buttonGroups.some(g => g.buttons.some(btn => !!btn.isActive));
  const headingBtnActive = !!headingPickerPos || blockType.startsWith('h');
  const colorBtnActive = !!colorPickerPos;
  const highlightBtnActive = !!highlightPickerPos;
  const fontPickerBtnActive = showFontPickerModal;
  const fontSizeBtnActive = isToolbarActive(!!fontSizePos, fontSize, '12');
  const lineHeightBtnActive = isToolbarActive(!!lineHeightPickerPos, lineHeight, '1.5');
  const codeBtnActive = blockType === 'code';
  const hasPopupActive = showMoreMenu || anyGroupActive ||
    headingBtnActive || colorBtnActive || highlightBtnActive ||
    fontPickerBtnActive || fontSizeBtnActive || lineHeightBtnActive || codeBtnActive;

  const renderBtn = (
    btn: ToolbarBtn,
    key: number,
    enterFn: (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => void = onMoreMenuEnter,
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
    onEnter: (e: React.MouseEvent<HTMLButtonElement>) => void,
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
        'icon-btn-md rounded-full transition-colors disabled:opacity-30 relative z-10',
        active ? 'text-text-primary' : ''
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
        <div className="flex h-16 flex-shrink-0 items-center justify-between gap-3 px-6 sm:px-12">
          <span className="text-xs text-text-secondary tabular-nums tracking-wide select-none">
            <motion.span>{roundedCount}</motion.span> {wordCount === 1 ? 'Wort' : 'Wörter'}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <div
              ref={miniToolbarRef}
              className="relative flex items-center gap-0.5 rounded-full border border-[color-mix(in_srgb,var(--color-border-default)_48%,transparent)] px-1 py-1 shadow-[0_8px_28px_color-mix(in_srgb,#000_18%,transparent)]"
              onMouseLeave={onMiniToolbarLeave}
            >
              {miniToolbarPill && (
                <div
                  className="glass-pill glass-pill-circle pointer-events-none"
                  style={{ left: miniToolbarPill.left, top: miniToolbarPill.top, width: miniToolbarPill.width, height: miniToolbarPill.height, opacity: miniToolbarPill.visible ? 1 : 0 }}
                />
              )}
              {miniIconBtn(formatBulletList, 'Aufzählung', List, blockType === 'bullet', (e) => onMiniToolbarEnter(e, blockType === 'bullet'))}
              {miniIconBtn(insertImage, 'Bild', Image, false, (e) => onMiniToolbarEnter(e, false), isInCode)}
              {onManageTags && miniIconBtn(() => onManageTags(), 'Tags', Tag, false, (e) => onMiniToolbarEnter(e, false))}
              {onInfo && miniIconBtn(() => onInfo(), 'Info', Info, false, (e) => onMiniToolbarEnter(e, false))}
              {miniIconBtn(() => setShowMoreMenu((v) => !v), 'Weitere Werkzeuge', MoreVertical, hasPopupActive, (e) => onMiniToolbarEnter(e, hasPopupActive))}
            </div>
          </div>
        </div>
      </div>

      {showMoreMenu && !minimalChrome && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setShowMoreMenu(false)} />
          <div
            ref={moreMenuRef}
            className="fixed bottom-24 right-6 sm:right-12 w-[min(92vw,280px)] max-h-[70vh] overflow-y-auto rounded-2xl border border-[color-mix(in_srgb,var(--color-border-default)_50%,transparent)] p-2 glass-popup shadow-2xl"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseLeave={onMoreMenuLeave}
          >
            {moreMenuPill && (
              <div
                className="glass-pill pointer-events-none"
                style={{ left: moreMenuPill.left, top: moreMenuPill.top, width: moreMenuPill.width, height: moreMenuPill.height, opacity: moreMenuPill.visible ? 1 : 0 }}
              />
            )}
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">Bearbeiten</p>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {buttonGroups[0].buttons.map((btn, bi) => renderBtn(btn, bi))}
              <button
                type="button"
                onClick={(e) => openHeadingPicker(e)}
                onMouseEnter={(e) => onMoreMenuEnter(e, headingBtnActive)}
                disabled={disabled}
                className={menuBtnCls(headingBtnActive)}
                title="Überschrift"
              >
                <Heading className="w-4 h-4" />
              </button>
              <button type="button" onClick={openColorFromMenu} onMouseEnter={(e) => onMoreMenuEnter(e, colorBtnActive)} disabled={disabled || isInCode} className={menuBtnCls(colorBtnActive)} title="Schriftfarbe">
                <Palette className="w-4 h-4" />
              </button>
              <button type="button" onClick={openHighlightFromMenu} onMouseEnter={(e) => onMoreMenuEnter(e, highlightBtnActive)} disabled={disabled || isInCode} className={menuBtnCls(highlightBtnActive)} title="Markierung">
                <Highlighter className="w-4 h-4" />
              </button>
              <button type="button" onClick={openFontPickerFromMenu} onMouseEnter={(e) => onMoreMenuEnter(e, fontPickerBtnActive)} disabled={disabled || isInCode} className={menuBtnCls(fontPickerBtnActive)} title="Schriftart">
                <Type className="w-4 h-4" />
              </button>
              <button type="button" onClick={openFontSizeFromMenu} onMouseEnter={(e) => onMoreMenuEnter(e, fontSizeBtnActive)} disabled={disabled || isInCode} className={menuBtnCls(fontSizeBtnActive)} title="Schriftgröße">
                <ALargeSmall className="w-4 h-4" />
              </button>
            </div>
            <div className="h-px glass-divider my-1" />
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">Listen &amp; Layout</p>
            <div className="flex flex-wrap gap-1 px-1 pb-1">
              {buttonGroups[1].buttons.map((btn, bi) => renderBtn(btn, bi + 100))}
              {(() => {
                const LangIcon = blockType === 'code' ? LANG_ICONS[codeLanguage] : undefined;
                return (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => blockType === 'code' ? openCodeLangPicker(e) : formatCode()}
                    onMouseEnter={(e) => onMoreMenuEnter(e, codeBtnActive)}
                    disabled={disabled}
                    className={menuBtnCls(codeBtnActive)}
                    title={blockType === 'code' ? `Sprache: ${getLanguageFriendlyName(codeLanguage)}` : 'Code'}
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
              <button type="button" onClick={openLineHeightFromMenu} onMouseEnter={(e) => onMoreMenuEnter(e, lineHeightBtnActive)} disabled={disabled || isInCode} className={menuBtnCls(lineHeightBtnActive)} title="Zeilenabstand">
                <ListChevronsUpDown className="w-4 h-4" />
              </button>
              {buttonGroups[4].buttons.map((btn, bi) => renderBtn(btn, bi + 300))}
            </div>
            <div className="h-px glass-divider my-1" />
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">Einfügen</p>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {buttonGroups[3].buttons.map((btn, bi) => renderBtn(btn, bi + 400))}
            </div>
            <div className="h-px glass-divider my-1" />
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {buttonGroups[5].buttons.map((btn, bi) => renderBtn(btn, bi + 500))}
            </div>
          </div>
        </>,
        getModalPortalRoot()
      )}

      {headingPickerPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setHeadingPickerPos(null)} />
          <div
            ref={headingPickerRef}
            className="fixed glass-popup rounded-xl shadow-xl py-1 overflow-hidden"
            style={headingPickerStyle}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={onHeadingLeave}
          >
            {headingPill && (
              <div className="glass-pill pointer-events-none" style={{ left: headingPill.left, top: headingPill.top, width: headingPill.width, height: headingPill.height, opacity: headingPill.visible ? 1 : 0 }} />
            )}
            {blockType.startsWith('h') && (
              <>
                <button
                  onClick={() => { removeHeading(); setHeadingPickerPos(null); }}
                  onMouseEnter={(e) => onHeadingEnter(e, false)}
                  className="flex items-center gap-2 w-full px-4 py-1.5 text-sm transition-colors relative z-10 text-red-500"
                >
                  <X className="w-4 h-4 flex-shrink-0" />
    
                </button>
                <div className="h-px mx-2 my-1 glass-divider" />
              </>
            )}
            {([{ tag: 'h1', Icon: Heading1 }, { tag: 'h2', Icon: Heading2 }, { tag: 'h3', Icon: Heading3 }, { tag: 'h4', Icon: Heading4 }, { tag: 'h5', Icon: Heading5 }, { tag: 'h6', Icon: Heading6 }] as const).map(({ tag, Icon }) => (
              <button
                key={tag}
                onClick={() => { formatHeading(tag); setHeadingPickerPos(null); }}
                onMouseEnter={(e) => onHeadingEnter(e, blockType === tag)}
                className={pickerItemCls(blockType === tag, 'flex items-center justify-center w-full px-4')}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </>,
        getModalPortalRoot()
      )}

      {codeLangPickerPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setCodeLangPickerPos(null)} />
          <div
            ref={codeLangPickerRef}
            className="fixed glass-popup rounded-xl shadow-xl py-1 overflow-hidden max-h-64 overflow-y-auto scrollbar-overlay"
            style={{ left: codeLangPickerPos.x, top: codeLangPickerPos.y }}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={onCodeLangLeave}
            onScroll={onCodeLangLeave}
          >
            {codeLangPill && (
              <div className="glass-pill pointer-events-none" style={{ left: codeLangPill.left, top: codeLangPill.top, width: codeLangPill.width, height: codeLangPill.height, opacity: codeLangPill.visible ? 1 : 0 }} />
            )}
            <button
              onClick={() => { formatCode(); setCodeLangPickerPos(null); }}
              onMouseEnter={(e) => onCodeLangEnter(e, false)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors relative z-10 text-red-500"
            >
              <X className="w-4 h-4 flex-shrink-0" />

            </button>
            <div className="h-px mx-2 my-1 glass-divider" />
            {Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP).map(([lang, label]) => {
              const LangIcon = LANG_ICONS[lang];
              return (
                <button
                  key={lang}
                  onClick={() => { setCodeNodeLanguage(lang); setCodeLangPickerPos(null); }}
                  onMouseEnter={(e) => onCodeLangEnter(e, codeLanguage === lang)}
                  className={pickerItemCls(isPickerActive(lang, codeLanguage, 'js'), 'flex items-center gap-2 px-3 w-full')}
                >
                  {LangIcon
                    ? <LangIcon className="w-4 h-4 flex-shrink-0" />
                    : <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center font-mono text-[9px] leading-none ring-1 ring-current rounded-sm">{label.slice(0, 3).toUpperCase()}</span>
                  }
                  {label}
                </button>
              );
            })}
          </div>
        </>,
        getModalPortalRoot()
      )}

      <ColorPickerPortal
        position={colorPickerPos}
        onClose={() => setColorPickerPos(null)}
        color={fontColor}
        onChange={applyFontColor}
        presets={TEXT_COLORS}
        storageKey="dendrite-favorite-colors"
      />

      <ColorPickerPortal
        position={highlightPickerPos}
        onClose={() => setHighlightPickerPos(null)}
        color={highlightColor}
        onChange={applyHighlight}
        presets={HIGHLIGHT_COLORS}
        storageKey="dendrite-favorite-highlights"
        fallbackColor="#fef08a"
      />

      {fontSizePos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => { setFontSizePos(null); setFontSizePillRect(null); }} />
          <div
            ref={fontSizeRef}
            className="fixed glass-popup rounded-xl shadow-xl py-0 overflow-hidden max-h-48 overflow-y-auto scrollbar-overlay"
            style={fontSizeStyle}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={() => setFontSizePillRect(p => p ? { ...p, visible: false } : null)}
            onScroll={() => setFontSizePillRect(p => p ? { ...p, visible: false } : null)}
          >
            {fontSizePillRect && (
              <div className="glass-pill pointer-events-none" style={{ left: fontSizePillRect.left, top: fontSizePillRect.top, width: fontSizePillRect.width, height: fontSizePillRect.height, opacity: fontSizePillRect.visible ? 1 : 0 }} />
            )}
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => { applyFontSize(size); setFontSizePos(null); setFontSizePillRect(null); }}
                onMouseEnter={onFontSizeItemEnter}
                className={pickerItemCls(isPickerActive(size, fontSize, '12'), 'block px-3')}
              >
                {size}
              </button>
            ))}
          </div>
        </>,
        getModalPortalRoot()
      )}

      {lineHeightPickerPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => { setLineHeightPickerPos(null); setLineHeightPillRect(null); }} />
          <div
            ref={lineHeightPickerRef}
            className="fixed glass-popup rounded-xl shadow-xl py-0 overflow-hidden"
            style={lineHeightStyle}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={() => setLineHeightPillRect(p => p ? { ...p, visible: false } : null)}
          >
            {lineHeightPillRect && (
              <div className="glass-pill pointer-events-none" style={{ left: lineHeightPillRect.left, top: lineHeightPillRect.top, width: lineHeightPillRect.width, height: lineHeightPillRect.height, opacity: lineHeightPillRect.visible ? 1 : 0 }} />
            )}
            {LINE_HEIGHTS.map((value) => (
              <button
                key={value}
                onClick={() => { applyLineHeight(value); setLineHeightPickerPos(null); setLineHeightPillRect(null); }}
                onMouseEnter={onLineHeightItemEnter}
                className={pickerItemCls(isPickerActive(value, lineHeight, '1.5'), 'block px-3')}
              >
                {value}×
              </button>
            ))}
          </div>
        </>,
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

      <FontPickerModal
        isOpen={showFontPickerModal}
        onClose={() => setShowFontPickerModal(false)}
        onSelectFont={(family) => applyFontFamily(family ?? '')}
        currentFont={fontFamily}
      />

      {checklistDropdownPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setChecklistDropdownPos(null)} />
          <div
            ref={checklistDropdownRef}
            className="fixed glass-popup rounded-xl shadow-xl py-1 overflow-hidden"
            style={{ left: checklistDropdownPos.x, top: checklistDropdownPos.y }}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={onChecklistDropdownLeave}
          >
            {checklistDropdownPill && (
              <div className="glass-pill pointer-events-none" style={{ left: checklistDropdownPill.left, top: checklistDropdownPill.top, width: checklistDropdownPill.width, height: checklistDropdownPill.height, opacity: checklistDropdownPill.visible ? 1 : 0 }} />
            )}
            <button
              onClick={() => { formatCheckList(); setChecklistDropdownPos(null); }}
              onMouseEnter={(e) => onChecklistDropdownEnter(e, blockType === 'check')}
              className={pickerItemCls(blockType === 'check', 'flex items-center gap-2 px-3 w-full')}
            >
              <ListChecks className="w-4 h-4 flex-shrink-0" />
              Checkbox
            </button>
            <button
              onClick={() => {
                setChecklistDropdownPos(null);
                openTimerModal();
              }}
              onMouseEnter={(e) => onChecklistDropdownEnter(e, blockType === 'timer-checkbox')}
              className={pickerItemCls(blockType === 'timer-checkbox', 'flex items-center gap-2 px-3 w-full')}
            >
              <ClockCheck className="w-4 h-4 flex-shrink-0" />
              Timer-Checkbox
            </button>
          </div>
        </>,
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

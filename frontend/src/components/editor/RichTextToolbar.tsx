import React, { useRef, useEffect } from 'react';
import { useMagicHover } from '../../hooks/useMagicHover';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import ElevatedToolbar from './ElevatedToolbar';
import ImageInsertModal from '../modals/ImageInsertModal';
import ChecklistTimerModal from '../modals/ChecklistTimerModal';
import TableInsertModal from '../modals/TableInsertModal';
import AttachmentInsertModal from '../modals/AttachmentInsertModal';
import ColorPickerPortal from './ColorPickerPortal';
import { useToolbarState } from './useToolbarState';
import { ToolbarStateContext } from './ToolbarStateContext';
import { HeadingPicker, CodeLangPicker, FontSizePicker, LineHeightPicker, ChecklistDropdown } from './ToolbarPickers';
import FontPicker from './FontPicker';
import { LANG_ICONS, TEXT_COLORS, HIGHLIGHT_COLORS, isToolbarActive, menuBtnCls } from './toolbarPopupUtils';
import { getLanguageFriendlyName } from '@lexical/code';
import {
  Bold, Italic, Underline, Strikethrough, Superscript, Subscript, List, ListOrdered, ListChecks, Quote, CodeXml, Paperclip, Image, Minus, Table,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo,
  Heading,
  IndentIncrease, IndentDecrease, Info, MoreVertical,
  Palette, Highlighter, Type, ListChevronsUpDown, History,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/useAuthStore';
import { canAccess } from '../../lib/planFeatures';

// Drop cap: an oversized serif initial beside lines of body text.
const DropCapIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <text x="0.5" y="19" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontWeight="600" fill="currentColor">A</text>
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="13" y1="9" x2="21.5" y2="9" />
      <line x1="13" y1="14" x2="21.5" y2="14" />
      <line x1="13" y1="19" x2="21.5" y2="19" />
    </g>
  </svg>
);

interface RichTextToolbarProps {
  disabled?: boolean;
  noteId?: string;
  onInfo?: () => void;
  onVersionHistory?: () => void;
  minimalChrome?: boolean;
  moreOpen: boolean;
  onMoreToggle: () => void;
}

type ToolbarBtn = {
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  actionWithEvent?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  isActive?: boolean;
  isDisabled?: boolean;
};

const RichTextToolbar = ({ disabled = false, noteId, onInfo, onVersionHistory, minimalChrome = false, moreOpen, onMoreToggle }: RichTextToolbarProps) => {
  const { user } = useAuthStore();
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const toolbarState = useToolbarState(moreMenuRef);
  const {
    roundedCount, wordCount,
    isInTable,
    isBold, isItalic, isUnderline, isStrikethrough, isSuperscript, isSubscript,
    blockType, canUndo, canRedo, canOutdent,
    isDropCap, canDropCap,
    fontColor, highlightColor, fontSize, lineHeight,
    fontPickerPos,
    colorPickerPos, setColorPickerPos,
    highlightPickerPos, setHighlightPickerPos,
    fontSizePos,
    lineHeightPickerPos,
    headingPickerPos,
    codeLanguage,
    codeLangPickerPos,
    showAttachModal, setShowAttachModal,
    showImageModal, setShowImageModal,
    showTableModal, setShowTableModal,
    showTimerModal, setShowTimerModal,
    checklistDropdownPos,
    checklistCountdownHours, setChecklistCountdownHours,
    checklistCountdownMinutes, setChecklistCountdownMinutes,
    checklistExistingTimer,
    openColorFromMenu, openHighlightFromMenu, openFontPickerFromMenu, openFontSizeFromMenu, openLineHeightFromMenu,
    openChecklistDropdown, handleChecklistTimerSave, handleChecklistTimerRemove,
    openHeadingPicker, openCodeLangPicker, closeAllPopups,
    formatText, formatBulletList, formatNumberedList,
    formatQuote, toggleDropCap, formatCode,
    indentContent, outdentContent, formatAlignment,
    applyFontColor, applyHighlight,
    undoAction, redoAction,
    insertHorizontalRule, insertTable, removeTable,
    insertAttachment, insertImage, insertAttachmentNode, insertImageFromUrl,
  } = toolbarState;

  const miniToolbarRef = useRef<HTMLDivElement>(null);
  const { onItemEnter: onMiniEnter, onItemLeave: onMiniLeave, Indicator: MiniIndicator } = useMagicHover({ mode: 'free', borderRadius: 9999, ref: miniToolbarRef });
  const { onItemEnter: onMoreEnter, onItemLeave: onMoreLeave, Indicator: MoreIndicator } = useMagicHover({ mode: 'free', borderRadius: 8, ref: moreMenuRef });

  // Sub-pickers belong to the More panel: closing the panel dismisses them too.
  useEffect(() => {
    if (!moreOpen) closeAllPopups();
  }, [moreOpen, closeAllPopups]);

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
        { icon: Paperclip, action: insertAttachment, title: 'Attach file', isDisabled: isInCode || !noteId },
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
        { icon: Undo, action: undoAction, title: 'Undo (Ctrl+Z)', isDisabled: !canUndo },
        { icon: Redo, action: redoAction, title: 'Redo (Ctrl+Y)', isDisabled: !canRedo },
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
  const hasPopupActive = moreOpen || anyGroupActive ||
    headingBtnActive || colorBtnActive || highlightBtnActive ||
    fontPickerBtnActive || fontSizeBtnActive || lineHeightBtnActive || codeBtnActive;

  // An open sub-picker docks flush to the panel's left edge; the panel drops its
  // own left rounding/border there so the two read as one connected surface.
  const anyPickerOpen = !!colorPickerPos || !!highlightPickerPos || !!fontPickerPos ||
    !!fontSizePos || !!lineHeightPickerPos || !!headingPickerPos ||
    !!codeLangPickerPos || !!checklistDropdownPos;

  const renderBtn = (btn: ToolbarBtn, key: number) => (
    <button
      key={key}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => btn.actionWithEvent ? btn.actionWithEvent(e) : btn.action()}
      onMouseEnter={onMoreEnter}
      onMouseLeave={onMoreLeave}
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
    _onEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void,
    extraDisabled?: boolean,
  ) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      onMouseEnter={onMiniEnter}
      onMouseLeave={onMiniLeave}
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
        <div className="relative flex h-15.5 shrink-0 items-center gap-3 px-6 sm:px-12">
          <span className="text-xs text-(--ink-dim) tabular-nums tracking-wide select-none">
            <motion.span>{roundedCount}</motion.span> {wordCount === 1 ? 'word' : 'words'}
          </span>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 min-w-0">
            <div
              ref={miniToolbarRef}
              className="relative flex items-center gap-0.5 rounded-full border border-[color-mix(in_srgb,var(--line)_75%,transparent)] bg-(--panel-bg) backdrop-blur-md px-1 py-1 shadow-[0_10px_30px_color-mix(in_srgb,#000_45%,transparent),0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)] magic-hover"
            >
              {MiniIndicator}
              {miniIconBtn(formatBulletList, 'Bullet list', List, blockType === 'bullet', undefined)}
              {miniIconBtn(insertImage, 'Image', Image, false, undefined, isInCode)}
              {onInfo && miniIconBtn(() => onInfo(), 'Info', Info, false, undefined)}
              {onVersionHistory && miniIconBtn(() => onVersionHistory(), 'Version History', History, false, undefined)}
              {miniIconBtn(() => onMoreToggle(), 'More tools', MoreVertical, hasPopupActive, undefined)}
            </div>
          </div>
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {moreOpen && !minimalChrome && (
          <motion.div
            ref={moreMenuRef}
            className={clsx(
              'fixed top-1/2 right-0 w-[min(92vw,280px)] max-h-[70vh] overflow-y-auto rounded-r-none border border-r-0 border-[color-mix(in_srgb,var(--line)_50%,transparent)] p-2 glass-popup shadow-2xl z-4 magic-hover',
              anyPickerOpen ? 'rounded-l-none border-l-0' : 'rounded-l-2xl',
            )}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            // Clicking another tool in the panel closes the picker; the picker's own
            // icons stopPropagation, so re-/cross-selecting them is handled by their toggles.
            onClick={() => closeAllPopups()}
            initial={{ x: '110%', y: '-50%' }}
            animate={{ x: 0, y: '-50%' }}
            exit={{ x: '110%', y: '-50%', transition: { duration: 0.18 } }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            {MoreIndicator}
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-(--ink-mid)">Edit</p>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {buttonGroups[0].buttons.map((btn, bi) => renderBtn(btn, bi))}
              <button
                type="button"
                onClick={(e) => openHeadingPicker(e)}
                onMouseEnter={onMoreEnter} onMouseLeave={onMoreLeave}
                disabled={disabled}
                className={menuBtnCls(headingBtnActive)}
                title="Heading"
              >
                <Heading className="w-4 h-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleDropCap}
                onMouseEnter={onMoreEnter} onMouseLeave={onMoreLeave}
                disabled={disabled || !canDropCap}
                className={menuBtnCls(isDropCap)}
                title="Drop cap"
              >
                <DropCapIcon className="w-4 h-4" />
              </button>
              <button type="button" onClick={openColorFromMenu} onMouseEnter={onMoreEnter} onMouseLeave={onMoreLeave} disabled={disabled || isInCode} className={menuBtnCls(colorBtnActive)} title="Font color">
                <Palette className="w-4 h-4" />
              </button>
              <button type="button" onClick={openHighlightFromMenu} onMouseEnter={onMoreEnter} onMouseLeave={onMoreLeave} disabled={disabled || isInCode} className={menuBtnCls(highlightBtnActive)} title="Highlight">
                <Highlighter className="w-4 h-4" />
              </button>
              <button type="button" onClick={openFontPickerFromMenu} onMouseEnter={onMoreEnter} onMouseLeave={onMoreLeave} disabled={disabled || isInCode} className={menuBtnCls(fontPickerBtnActive)} title="Font">
                <Type className="w-4 h-4" />
              </button>
              <button type="button" onClick={openFontSizeFromMenu} onMouseEnter={onMoreEnter} onMouseLeave={onMoreLeave} disabled={disabled || isInCode} className={menuBtnCls(fontSizeBtnActive)} title="Font size">
                <svg viewBox="0 0 29.000999 19" className="w-4 h-4" fill="currentColor"><g transform="translate(-90.999,-506)"><path d="m 119.115,523.838 c -0.325,-0.07 -0.611,-0.176 -0.857,-0.316 -0.326,-0.193 -0.577,-0.398 -0.753,-0.613 -0.177,-0.217 -0.321,-0.455 -0.437,-0.721 -0.687,-1.619 -1.518,-3.66 -2.495,-6.125 -0.978,-2.465 -2.329,-5.818 -4.054,-10.063 h -2.641 c -1.241,2.994 -2.375,5.73 -3.399,8.213 -1.026,2.482 -2.049,4.961 -3.07,7.434 -0.167,0.422 -0.376,0.789 -0.627,1.096 -0.251,0.309 -0.557,0.568 -0.917,0.779 -0.212,0.133 -0.5,0.236 -0.865,0.31 -0.365,0.074 -0.693,0.121 -0.984,0.139 V 525 h 7.686 v -1.029 c -0.995,-0.088 -1.707,-0.231 -2.133,-0.43 -0.428,-0.197 -0.641,-0.438 -0.641,-0.719 0,-0.088 0.015,-0.242 0.047,-0.463 0.029,-0.219 0.129,-0.576 0.297,-1.068 0.132,-0.379 0.288,-0.81 0.469,-1.295 0.139,-0.371 0.265,-0.697 0.385,-0.996 h 6.691 l 1.486,3.611 c 0.061,0.148 0.099,0.268 0.111,0.355 0.014,0.088 0.021,0.168 0.021,0.238 0,0.203 -0.321,0.371 -0.964,0.508 -0.643,0.137 -0.995,0.223 -1.471,0.258 V 525 h 10 v -1.029 c -0.264,-0.018 -0.56,-0.061 -0.885,-0.133 z M 109.994,517 h -5.064 l 2.514,-6.365 z" /><path d="m 106.547,524.144 c -0.24,-0.053 -0.451,-0.129 -0.633,-0.234 -0.24,-0.143 -0.425,-0.293 -0.555,-0.451 -0.129,-0.16 -0.236,-0.336 -0.32,-0.531 -0.506,-1.193 -1.119,-2.697 -1.84,-4.514 -0.719,-1.816 -1.715,-4.287 -2.986,-7.414 h -1.945 c -0.914,2.205 -1.75,4.223 -2.506,6.053 -0.756,1.828 -1.51,3.654 -2.262,5.477 -0.123,0.31 -0.277,0.58 -0.462,0.809 -0.185,0.227 -0.41,0.418 -0.676,0.572 -0.156,0.098 -0.368,0.174 -0.638,0.23 -0.27,0.055 -0.512,0.088 -0.725,0.102 V 525 h 5.662 v -0.758 c -0.732,-0.065 -1.257,-0.17 -1.571,-0.316 -0.313,-0.146 -0.472,-0.322 -0.472,-0.531 0,-0.064 0.012,-0.178 0.035,-0.34 0.021,-0.162 0.094,-0.424 0.218,-0.787 0.097,-0.279 0.212,-0.598 0.346,-0.955 0.034,-0.092 0.237,-0.607 0.516,-1.313 h 4.479 l 1.314,3.24 c 0.045,0.109 0.072,0.197 0.082,0.262 0.01,0.064 0.016,0.123 0.016,0.176 0,0.148 -0.238,0.273 -0.711,0.375 -0.475,0.1 -0.886,0.164 -1.236,0.19 V 525 H 107 v -0.758 c 0,0 -0.213,-0.045 -0.453,-0.098 z M 96.129,519 c 0.795,-2.008 1.817,-4.584 1.817,-4.584 l 1.86,4.584 z" /></g></svg>
              </button>
            </div>
            <div className="h-px border-t border-(--line-soft) my-1" />
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-(--ink-mid)">Lists &amp; Layout</p>
            <div className="flex flex-wrap gap-1 px-1 pb-1">
              {buttonGroups[1].buttons.map((btn, bi) => renderBtn(btn, bi + 100))}
              {(() => {
                const canLang = canAccess(user?.plan, 'syntaxHighlighting');
                const LangIcon = (canLang && blockType === 'code') ? LANG_ICONS[codeLanguage] : undefined;
                return (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      if (blockType === 'code' && canLang) {
                        openCodeLangPicker(e);
                      } else {
                        formatCode(canLang ? undefined : 'plain');
                      }
                    }}
                    onMouseEnter={onMoreEnter} onMouseLeave={onMoreLeave}
                    disabled={disabled}
                    className={menuBtnCls(codeBtnActive)}
                    title="Code"
                  >
                    {LangIcon
                      ? <LangIcon className="w-4 h-4" />
                      : (canLang && blockType === 'code')
                        ? <span className="font-mono text-[10px] leading-none px-0.5">{getLanguageFriendlyName(codeLanguage).slice(0, 4).toUpperCase()}</span>
                        : <CodeXml className="w-4 h-4" />
                    }
                  </button>
                );
              })()}
            </div>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {buttonGroups[2].buttons.map((btn, bi) => renderBtn(btn, bi + 200))}
              <button type="button" onClick={openLineHeightFromMenu} onMouseEnter={onMoreEnter} onMouseLeave={onMoreLeave} disabled={disabled || isInCode} className={menuBtnCls(lineHeightBtnActive)} title="Line spacing">
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
          )}
        </AnimatePresence>,
        getModalPortalRoot()
      )}

      <HeadingPicker />
      <CodeLangPicker />
      <FontSizePicker />
      <LineHeightPicker />
      <FontPicker />
      <ChecklistDropdown />

      <ColorPickerPortal
        position={colorPickerPos}
        onClose={() => setColorPickerPos(null)}
        color={fontColor}
        onChange={applyFontColor}
        presets={TEXT_COLORS}
        storageKey="dendrite-favorite-colors"
        padding={-8}
        canFavorite={canAccess(user?.plan, 'colorFavorites')}
        canCustomColor={canAccess(user?.plan, 'customColor')}
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
        canFavorite={canAccess(user?.plan, 'colorFavorites')}
        canCustomColor={canAccess(user?.plan, 'customColor')}
      />

      {noteId && (
        <AttachmentInsertModal
          isOpen={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          noteId={noteId}
          onInsert={insertAttachmentNode}
        />
      )}

      <TableInsertModal isOpen={showTableModal} onClose={() => setShowTableModal(false)} onInsert={(r, c) => { insertTable(r, c); setShowTableModal(false); }} />

      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={insertImageFromUrl}
      />

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

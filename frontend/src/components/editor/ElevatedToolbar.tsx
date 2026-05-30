import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSmartPopupStyle, type PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CODE_LANGUAGE_FRIENDLY_NAME_MAP, getLanguageFriendlyName } from '@lexical/code';
import {
  Bold, Italic, Underline, Strikethrough, Highlighter, Heading,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  IndentIncrease, IndentDecrease, ChevronRight,
  Type, Palette, ListChevronsUpDown,
  List, ListOrdered, ListChecks, ClockCheck, Quote, CodeXml, X,
  Superscript, Subscript,
} from 'lucide-react';
import {
  SiJavascript, SiTypescript, SiPython, SiRust, SiSwift,
  SiHtml5, SiCss, SiCplusplus, SiC,
  SiMarkdown, SiPhp, SiRuby, SiGo, SiKotlin, SiLua, SiScala,
  SiR, SiGnubash,
} from 'react-icons/si';
import type { IconType } from 'react-icons';
import clsx from 'clsx';
import ColorPickerPortal from './ColorPickerPortal';
import { useToolbarStateContext } from './ToolbarStateContext';

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];
const LINE_HEIGHTS = ['1', '1.25', '1.5', '1.75', '2', '2.5'];

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

const isPickerActive = (value: string, current: string, defaultValue: string) =>
  current === value || (value === defaultValue && !current);


const PAGES = 3;
const ITEM_W = 32;
const GAP = 2;
const ITEMS_PER_PAGE = 8;
const PAGE_W = ITEMS_PER_PAGE * ITEM_W + (ITEMS_PER_PAGE - 1) * GAP;

interface ElevatedToolbarProps {
  disabled?: boolean;
}

export default function ElevatedToolbar({ disabled = false }: ElevatedToolbarProps) {
  const [editor] = useLexicalComposerContext();
  const {
    isBold, isItalic, isUnderline, isStrikethrough, isSuperscript, isSubscript,
    blockType, codeLanguage,
    fontColor, highlightColor, fontFamily, fontSize, lineHeight,
    fontPickerPos, showTimerModal,
    saveSelection, closeAllPopups: closeContextPopups, openFontPickerFromMenu, openTimerModal,
    formatText,
    formatHeading, removeHeading,
    formatBulletList, formatNumberedList, formatCheckList, formatQuote,
    formatCode: contextFormatCode, setCodeNodeLanguage,
    formatAlignment, indentContent, outdentContent,
    applyFontColor, applyHighlight, applyFontSize, applyLineHeight,
  } = useToolbarStateContext();

  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [page, setPage] = useState(0);

  const [headingPos, setHeadingPos] = useState<PopupAnchor | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<PopupAnchor | null>(null);
  const [highlightPickerPos, setHighlightPickerPos] = useState<PopupAnchor | null>(null);
  const [fontSizePos, setFontSizePos] = useState<PopupAnchor | null>(null);
  const [lineHeightPickerPos, setLineHeightPickerPos] = useState<PopupAnchor | null>(null);
  const [codeLangPickerPos, setCodeLangPickerPos] = useState<PopupAnchor | null>(null);
  const [colorPickerPlacement, setColorPickerPlacement] = useState<'above' | 'below'>('above');
  const [highlightPickerPlacement, setHighlightPickerPlacement] = useState<'above' | 'below'>('above');

  const rafRef = useRef<number>(0);
  const posLockedRef = useRef(false);
  const keepVisibleRef = useRef(false);
  const codeFormattingRef = useRef(false);
  const isMouseSelectingRef = useRef(false);

  const floatingBarRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const lineHeightRef = useRef<HTMLDivElement>(null);
  const codeLangRef = useRef<HTMLDivElement>(null);
  const headingPickerRef = useRef<HTMLDivElement>(null);

  const { style: headingStyle, placement: headingPlacement } = useSmartPopupStyle(headingPos, headingPickerRef, 0);
  const { style: fontSizeStyle, placement: fontSizePlacement } = useSmartPopupStyle(fontSizePos, fontSizeRef, 0);
  const { style: lineHeightStyle, placement: lineHeightPlacement } = useSmartPopupStyle(lineHeightPickerPos, lineHeightRef, 0);
  const { style: codeLangStyle, placement: codeLangPlacement } = useSmartPopupStyle(codeLangPickerPos, codeLangRef, 0);

  useEffect(() => {
    keepVisibleRef.current = !!fontPickerPos || showTimerModal || !!colorPickerPos || !!highlightPickerPos;
  }, [fontPickerPos, showTimerModal, colorPickerPos, highlightPickerPos]);

  const closeAllLocalPickers = () => {
    setHeadingPos(null);
    setColorPickerPos(null);
    setHighlightPickerPos(null);
    setFontSizePos(null);
    setLineHeightPickerPos(null);
    setCodeLangPickerPos(null);
  };

  const closeAll = () => {
    closeContextPopups();
    closeAllLocalPickers();
  };

  const updatePosition = useCallback(() => {
    if (isMouseSelectingRef.current) return;
    if (disabled) { setVisible(false); posLockedRef.current = false; return; }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      if (!keepVisibleRef.current && !codeFormattingRef.current) { setVisible(false); posLockedRef.current = false; }
      return;
    }
    const range = sel.getRangeAt(0);
    const root = editor.getRootElement();
    if (!root || !root.contains(range.commonAncestorContainer)) { setVisible(false); posLockedRef.current = false; return; }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { setVisible(false); posLockedRef.current = false; return; }

    let scrollParent: HTMLElement | null = root.parentElement;
    while (scrollParent) {
      const { overflow, overflowY } = window.getComputedStyle(scrollParent);
      if (/auto|scroll/.test(overflow + overflowY)) break;
      scrollParent = scrollParent.parentElement;
    }
    if (scrollParent) {
      const cr = scrollParent.getBoundingClientRect();
      if (rect.bottom < cr.top || rect.top > cr.bottom) { setVisible(false); posLockedRef.current = false; return; }
    }

    if (!posLockedRef.current) {
      const pad = 8;
      const toolbarH = 44;
      let top = rect.top - toolbarH - pad;
      if (top < pad) top = rect.bottom + pad;
      setPos({ top, left: rect.left + rect.width / 2 });
      posLockedRef.current = true;
    }
    codeFormattingRef.current = false;
    setVisible(true);
  }, [editor, disabled]);

  useEffect(() => {
    const schedule = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };
    return editor.registerUpdateListener(schedule);
  }, [editor, updatePosition]);

  useEffect(() => {
    const onScroll = () => updatePosition();
    const onMouseDown = () => { isMouseSelectingRef.current = true; };
    const onMouseUp = () => {
      isMouseSelectingRef.current = false;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('selectionchange', onScroll);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('selectionchange', onScroll);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updatePosition]);

  useEffect(() => {
    if (!visible) closeAllLocalPickers();
  }, [visible]);

  const handleFormatCode = () => {
    codeFormattingRef.current = true;
    contextFormatCode();
    setTimeout(() => { codeFormattingRef.current = false; }, 300);
  };

  const isInCode = blockType === 'code';

  const anyPopupOpen = !!headingPos || !!fontSizePos || !!lineHeightPickerPos || !!codeLangPickerPos || !!colorPickerPos || !!highlightPickerPos;
  const activePopupPlacement: 'above' | 'below' =
    headingPos ? headingPlacement :
    fontSizePos ? fontSizePlacement :
    lineHeightPickerPos ? lineHeightPlacement :
    codeLangPickerPos ? codeLangPlacement :
    colorPickerPos ? colorPickerPlacement :
    highlightPickerPos ? highlightPickerPlacement :
    'above';

  const popupCls = (placement: 'above' | 'below', extra = '') => clsx(
    'fixed overflow-hidden z-40',
    'border border-[color-mix(in_srgb,var(--line)_50%,transparent)]',
    placement === 'above' ? 'border-b-0' : 'border-t-0',
    extra,
  );

  const getPopupStyle = (placement: 'above' | 'below') => ({
    background: 'transparent',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: placement === 'above' ? '1rem 1rem 0 0' : '0 0 1rem 1rem',
    clipPath: placement === 'above' ? 'inset(0 round 1rem 1rem 0 0)' : 'inset(0 round 0 0 1rem 1rem)',
    transformOrigin: placement === 'above' ? 'center bottom' : 'center top',
  });

  const popupPad = (placement: 'above' | 'below', near = '2', far = '6') =>
    placement === 'above' ? `pt-${near} pb-${far}` : `pb-${near} pt-${far}`;

  const popupMotion = (placement: 'above' | 'below') => {
    const dockY = placement === 'above' ? 16 : -16;
    const initY = placement === 'above' ? 8 : -8;
    return {
      initial: { opacity: 0, scale: 0.97, y: initY },
      animate: { opacity: 1, scale: 1, y: dockY },
      exit: { opacity: 0, scale: 0.97, y: initY, transition: { duration: 0.1 } },
      transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
    };
  };

  const btn = (
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void,
    title: string,
    children: React.ReactNode,
    active?: boolean,
    btnDisabled?: boolean,
  ) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(e); }}
      onMouseEnter={() => {}}
      disabled={btnDisabled}
      title={title}
      className={clsx(
        'icon-btn-md rounded-lg transition-colors shrink-0 relative z-10 disabled:opacity-30',
        active ? 'text-(--ink) sidebar-item-active' : '',
      )}
    >
      {children}
    </button>
  );

  if (!visible || disabled) return null;

  const page0 = (
    <>
      {btn((_e) => formatText('bold'), 'Bold', <Bold className="w-4 h-4" />, isBold, isInCode)}
      {btn((_e) => formatText('italic'), 'Italic', <Italic className="w-4 h-4" />, isItalic, isInCode)}
      {btn((_e) => formatText('underline'), 'Underline', <Underline className="w-4 h-4" />, isUnderline, isInCode)}
      {btn((_e) => formatText('strikethrough'), 'Strikethrough', <Strikethrough className="w-4 h-4" />, isStrikethrough, isInCode)}
      {btn((e) => { closeAllLocalPickers(); openFontPickerFromMenu(e); }, 'Font', <Type className="w-4 h-4" />, !!fontPickerPos, isInCode)}
      {btn(
        (e) => {
          if (fontSizePos) { setFontSizePos(null); return; }
          closeAll();
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          const tb = floatingBarRef.current?.getBoundingClientRect();
          setFontSizePos({ x: r.left + r.width / 2, top: tb?.top ?? r.top, bottom: tb?.bottom ?? r.bottom, left: tb?.left, width: tb?.width });
        },
        'Font size', <svg viewBox="0 0 29.000999 19" className="w-4 h-4" fill="currentColor"><g transform="translate(-90.999,-506)"><path d="m 119.115,523.838 c -0.325,-0.07 -0.611,-0.176 -0.857,-0.316 -0.326,-0.193 -0.577,-0.398 -0.753,-0.613 -0.177,-0.217 -0.321,-0.455 -0.437,-0.721 -0.687,-1.619 -1.518,-3.66 -2.495,-6.125 -0.978,-2.465 -2.329,-5.818 -4.054,-10.063 h -2.641 c -1.241,2.994 -2.375,5.73 -3.399,8.213 -1.026,2.482 -2.049,4.961 -3.07,7.434 -0.167,0.422 -0.376,0.789 -0.627,1.096 -0.251,0.309 -0.557,0.568 -0.917,0.779 -0.212,0.133 -0.5,0.236 -0.865,0.31 -0.365,0.074 -0.693,0.121 -0.984,0.139 V 525 h 7.686 v -1.029 c -0.995,-0.088 -1.707,-0.231 -2.133,-0.43 -0.428,-0.197 -0.641,-0.438 -0.641,-0.719 0,-0.088 0.015,-0.242 0.047,-0.463 0.029,-0.219 0.129,-0.576 0.297,-1.068 0.132,-0.379 0.288,-0.81 0.469,-1.295 0.139,-0.371 0.265,-0.697 0.385,-0.996 h 6.691 l 1.486,3.611 c 0.061,0.148 0.099,0.268 0.111,0.355 0.014,0.088 0.021,0.168 0.021,0.238 0,0.203 -0.321,0.371 -0.964,0.508 -0.643,0.137 -0.995,0.223 -1.471,0.258 V 525 h 10 v -1.029 c -0.264,-0.018 -0.56,-0.061 -0.885,-0.133 z M 109.994,517 h -5.064 l 2.514,-6.365 z" /><path d="m 106.547,524.144 c -0.24,-0.053 -0.451,-0.129 -0.633,-0.234 -0.24,-0.143 -0.425,-0.293 -0.555,-0.451 -0.129,-0.16 -0.236,-0.336 -0.32,-0.531 -0.506,-1.193 -1.119,-2.697 -1.84,-4.514 -0.719,-1.816 -1.715,-4.287 -2.986,-7.414 h -1.945 c -0.914,2.205 -1.75,4.223 -2.506,6.053 -0.756,1.828 -1.51,3.654 -2.262,5.477 -0.123,0.31 -0.277,0.58 -0.462,0.809 -0.185,0.227 -0.41,0.418 -0.676,0.572 -0.156,0.098 -0.368,0.174 -0.638,0.23 -0.27,0.055 -0.512,0.088 -0.725,0.102 V 525 h 5.662 v -0.758 c -0.732,-0.065 -1.257,-0.17 -1.571,-0.316 -0.313,-0.146 -0.472,-0.322 -0.472,-0.531 0,-0.064 0.012,-0.178 0.035,-0.34 0.021,-0.162 0.094,-0.424 0.218,-0.787 0.097,-0.279 0.212,-0.598 0.346,-0.955 0.034,-0.092 0.237,-0.607 0.516,-1.313 h 4.479 l 1.314,3.24 c 0.045,0.109 0.072,0.197 0.082,0.262 0.01,0.064 0.016,0.123 0.016,0.176 0,0.148 -0.238,0.273 -0.711,0.375 -0.475,0.1 -0.886,0.164 -1.236,0.19 V 525 H 107 v -0.758 c 0,0 -0.213,-0.045 -0.453,-0.098 z M 96.129,519 c 0.795,-2.008 1.817,-4.584 1.817,-4.584 l 1.86,4.584 z" /></g></svg>, !!fontSizePos, isInCode,
      )}
      {btn(
        (e) => {
          if (colorPickerPos) { setColorPickerPos(null); return; }
          closeAll(); saveSelection();
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          const tb = floatingBarRef.current?.getBoundingClientRect();
          setColorPickerPos({ x: r.left + r.width / 2, top: tb?.top ?? r.top, bottom: tb?.bottom ?? r.bottom, left: tb?.left, width: tb?.width });
        },
        'Font color', <Palette className="w-4 h-4" />, !!colorPickerPos, isInCode,
      )}
      {btn(
        (e) => {
          if (highlightPickerPos) { setHighlightPickerPos(null); return; }
          closeAll(); saveSelection();
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          const tb = floatingBarRef.current?.getBoundingClientRect();
          setHighlightPickerPos({ x: r.left + r.width / 2, top: tb?.top ?? r.top, bottom: tb?.bottom ?? r.bottom, left: tb?.left, width: tb?.width });
        },
        'Highlight', <Highlighter className="w-4 h-4" />, !!highlightPickerPos, isInCode,
      )}
    </>
  );

  const page1 = (
    <>
      {btn(
        (e) => {
          if (headingPos) { setHeadingPos(null); return; }
          closeAll();
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          const tb = floatingBarRef.current?.getBoundingClientRect();
          setHeadingPos({ x: r.left + r.width / 2, top: tb?.top ?? r.top, bottom: tb?.bottom ?? r.bottom, left: tb?.left, width: tb?.width });
        },
        'Heading', <Heading className="w-4 h-4" />, !!headingPos,
      )}
      {btn((_e) => formatAlignment('left'), 'Align left', <AlignLeft className="w-4 h-4" />, undefined, isInCode)}
      {btn((_e) => formatAlignment('center'), 'Center', <AlignCenter className="w-4 h-4" />, undefined, isInCode)}
      {btn((_e) => formatAlignment('right'), 'Align right', <AlignRight className="w-4 h-4" />, undefined, isInCode)}
      {btn((_e) => formatAlignment('justify'), 'Justify', <AlignJustify className="w-4 h-4" />, undefined, isInCode)}
      {btn(
        (e) => {
          if (lineHeightPickerPos) { setLineHeightPickerPos(null); return; }
          closeAll();
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          const tb = floatingBarRef.current?.getBoundingClientRect();
          setLineHeightPickerPos({ x: r.left + r.width / 2, top: tb?.top ?? r.top, bottom: tb?.bottom ?? r.bottom, left: tb?.left, width: tb?.width });
        },
        'Line height', <ListChevronsUpDown className="w-4 h-4" />, !!lineHeightPickerPos, isInCode,
      )}
      {btn((_e) => outdentContent(), 'Decrease indent', <IndentDecrease className="w-4 h-4" />)}
      {btn((_e) => indentContent(), 'Increase indent', <IndentIncrease className="w-4 h-4" />)}
    </>
  );

  const page2 = (
    <>
      {btn((_e) => formatBulletList(), 'Bullet list', <List className="w-4 h-4" />, blockType === 'bullet')}
      {btn((_e) => formatNumberedList(), 'Numbered list', <ListOrdered className="w-4 h-4" />, blockType === 'number')}
      {btn((_e) => formatCheckList(), 'Checklist', <ListChecks className="w-4 h-4" />, blockType === 'check')}
      {btn((_e) => openTimerModal(), 'Timer checklist', <ClockCheck className="w-4 h-4" />, blockType === 'timer-checkbox' || showTimerModal)}
      {btn((_e) => formatQuote(), 'Quote', <Quote className="w-4 h-4" />, blockType === 'quote')}
      {(() => {
        const LangIcon = blockType === 'code' ? LANG_ICONS[codeLanguage] : undefined;
        const codeIcon = LangIcon
          ? <LangIcon className="w-4 h-4" />
          : blockType === 'code'
            ? <span className="font-mono text-[10px] leading-none px-0.5">{getLanguageFriendlyName(codeLanguage).slice(0, 4).toUpperCase()}</span>
            : <CodeXml className="w-4 h-4" />;
        return btn(
          (e) => {
            if (blockType !== 'code') {
              closeAll();
              handleFormatCode();
            } else {
              if (codeLangPickerPos) { setCodeLangPickerPos(null); return; }
              closeAll();
              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              const tb = floatingBarRef.current?.getBoundingClientRect();
              setCodeLangPickerPos({ x: r.left + r.width / 2, top: tb?.top ?? r.top, bottom: tb?.bottom ?? r.bottom, left: tb?.left, width: tb?.width });
            }
          },
          blockType === 'code' ? `Language: ${getLanguageFriendlyName(codeLanguage)}` : 'Code block',
          codeIcon,
          blockType === 'code' || !!codeLangPickerPos,
        );
      })()}
      {btn((_e) => formatText('superscript'), 'Superscript', <Superscript className="w-4 h-4" />, isSuperscript, isInCode)}
      {btn((_e) => formatText('subscript'), 'Subscript', <Subscript className="w-4 h-4" />, isSubscript, isInCode)}
    </>
  );

  // suppress unused variable warning — fontFamily is tracked in context for state sync
  void fontFamily;

  return createPortal(
    <>
      <div
        ref={floatingBarRef}
        className={clsx(
          'fixed flex items-center gap-0.5 px-1.5 py-1 z-50',
          'border border-[color-mix(in_srgb,var(--line)_55%,transparent)]',
          'shadow-[0_12px_40px_color-mix(in_srgb,#000_35%,transparent),0_0_0_1px_color-mix(in_srgb,var(--accent)_8%,transparent)]',
          anyPopupOpen
            ? activePopupPlacement === 'above'
              ? 'rounded-b-2xl rounded-t-none'
              : 'rounded-t-2xl rounded-b-none'
            : 'rounded-2xl',
        )}
        style={{
          top: pos.top,
          left: pos.left,
          transform: 'translateX(-50%)',
          background: 'transparent',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="overflow-hidden" style={{ width: PAGE_W }}>
          <div
            className="flex transition-transform duration-200 ease-in-out"
            style={{ transform: `translateX(${-page * PAGE_W}px)`, width: PAGE_W * PAGES }}
          >
            <div className="flex gap-0.5 shrink-0" style={{ width: PAGE_W }}>{page0}</div>
            <div className="flex gap-0.5 shrink-0" style={{ width: PAGE_W }}>{page1}</div>
            <div className="flex gap-0.5 shrink-0" style={{ width: PAGE_W }}>{page2}</div>
          </div>
        </div>

        <div className="w-px self-stretch bg-[color-mix(in_srgb,var(--line)_50%,transparent)] mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeAllLocalPickers();
            setPage((p) => (p + 1) % PAGES);
          }}
          title="More options"
          className="icon-btn-md rounded-lg transition-colors shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {createPortal(
        <AnimatePresence>
          {headingPos && (
          <>
          <div className="fixed inset-0" onClick={() => setHeadingPos(null)} />
          <motion.div
            ref={headingPickerRef}
            className={popupCls(headingPlacement, popupPad(headingPlacement))}
            style={{ ...headingStyle, ...getPopupStyle(headingPlacement) }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion(headingPlacement)}
          >
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden" onWheel={(e) => { e.currentTarget.scrollBy({ left: e.deltaY, behavior: 'smooth' }); }}>
              {blockType.startsWith('h') && (
                <button
                  type="button"
                  onClick={() => { removeHeading(); setHeadingPos(null); }}
                  className="flex items-center justify-center px-2.5 py-1 rounded-lg transition-colors text-red-500 hover:bg-(--surface-hi) shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {([{ tag: 'h1', Icon: Heading1 }, { tag: 'h2', Icon: Heading2 }, { tag: 'h3', Icon: Heading3 }, { tag: 'h4', Icon: Heading4 }, { tag: 'h5', Icon: Heading5 }, { tag: 'h6', Icon: Heading6 }] as const).map(({ tag, Icon }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { formatHeading(tag); setHeadingPos(null); }}
                  className={clsx('flex items-center justify-center px-2.5 py-1 rounded-lg transition-colors shrink-0 hover:bg-(--surface-hi)', blockType === tag ? 'text-(--accent)' : 'text-(--ink)')}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot(),
      )}

      {createPortal(
        <AnimatePresence>
          {fontSizePos && (
          <>
          <div className="fixed inset-0" onClick={() => setFontSizePos(null)} />
          <motion.div
            ref={fontSizeRef}
            className={popupCls(fontSizePlacement, popupPad(fontSizePlacement))}
            style={{ ...fontSizeStyle, ...getPopupStyle(fontSizePlacement) }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion(fontSizePlacement)}
          >
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden" onWheel={(e) => { e.currentTarget.scrollBy({ left: e.deltaY, behavior: 'smooth' }); }}>
              {FONT_SIZES.map((size) => (
                <button key={size} type="button"
                  onClick={() => { applyFontSize(size); setFontSizePos(null); }}
                  className={clsx('px-2.5 py-1 text-sm rounded-lg transition-colors whitespace-nowrap hover:bg-(--surface-hi)', fontSize === size ? 'text-(--accent)' : 'text-(--ink)')}
                >
                  {size}
                </button>
              ))}
            </div>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot(),
      )}

      {createPortal(
        <AnimatePresence>
          {lineHeightPickerPos && (
          <>
          <div className="fixed inset-0" onClick={() => setLineHeightPickerPos(null)} />
          <motion.div
            ref={lineHeightRef}
            className={popupCls(lineHeightPlacement, popupPad(lineHeightPlacement))}
            style={{ ...(lineHeightPickerPos?.width !== undefined ? { width: lineHeightPickerPos.width } : {}), ...lineHeightStyle, ...getPopupStyle(lineHeightPlacement) }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion(lineHeightPlacement)}
          >
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden" onWheel={(e) => { e.currentTarget.scrollBy({ left: e.deltaY, behavior: 'smooth' }); }}>
              {LINE_HEIGHTS.map((value) => (
                <button key={value} type="button"
                  onClick={() => { applyLineHeight(value); setLineHeightPickerPos(null); }}
                  className={clsx('px-2.5 py-1 text-sm rounded-lg transition-colors whitespace-nowrap hover:bg-(--surface-hi)', (lineHeight === value || (value === '1.5' && !lineHeight)) ? 'text-(--accent)' : 'text-(--ink)')}
                >
                  {value}×
                </button>
              ))}
            </div>
          </motion.div>
          </>)}
        </AnimatePresence>,
        getModalPortalRoot(),
      )}

      {createPortal(
        <AnimatePresence>
          {codeLangPickerPos && (
          <>
          <div className="fixed inset-0" onClick={() => setCodeLangPickerPos(null)} />
          <motion.div
            ref={codeLangRef}
            className={popupCls(codeLangPlacement, popupPad(codeLangPlacement))}
            style={{ ...codeLangStyle, ...getPopupStyle(codeLangPlacement) }}
            onMouseDown={(e) => e.preventDefault()}
            {...popupMotion(codeLangPlacement)}
          >
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden" onWheel={(e) => { e.currentTarget.scrollBy({ left: e.deltaY, behavior: 'smooth' }); }}>
              <button
                type="button"
                onClick={() => { handleFormatCode(); setCodeLangPickerPos(null); }}
                className="flex items-center justify-center px-2.5 py-1 rounded-lg transition-colors text-red-500 hover:bg-(--surface-hi) shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
              {Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP).map(([lang, label]) => {
                const LangIcon = LANG_ICONS[lang];
                return (
                  <button
                    key={lang}
                    type="button"
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
        getModalPortalRoot(),
      )}

      <ColorPickerPortal
        position={colorPickerPos}
        onClose={() => setColorPickerPos(null)}
        color={fontColor}
        onChange={applyFontColor}
        presets={TEXT_COLORS}
        storageKey="dendrite-favorite-colors"
        padding={0}
        onPlacementChange={setColorPickerPlacement}
      />

      <ColorPickerPortal
        position={highlightPickerPos}
        onClose={() => setHighlightPickerPos(null)}
        color={highlightColor}
        onChange={applyHighlight}
        presets={HIGHLIGHT_COLORS}
        storageKey="dendrite-favorite-highlights"
        fallbackColor="#fef08a"
        padding={0}
        onPlacementChange={setHighlightPickerPlacement}
      />
    </>,
    getModalPortalRoot(),
  );
}

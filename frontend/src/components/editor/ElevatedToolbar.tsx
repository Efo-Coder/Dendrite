import { useState, useEffect, useCallback, useRef } from 'react';
import { useSmartPopupStyle, type PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useGlassPill } from '../../hooks/useGlassPill';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CODE_LANGUAGE_FRIENDLY_NAME_MAP, getLanguageFriendlyName } from '@lexical/code';
import {
  Bold, Italic, Underline, Strikethrough, Highlighter, Heading,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  IndentIncrease, IndentDecrease, ChevronRight,
  Type, ALargeSmall, Palette, ListChevronsUpDown,
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

const pickerItemCls = (active: boolean, extra = '') =>
  clsx(
    'py-1.5 text-sm transition-colors relative z-10 text-left whitespace-nowrap',
    active ? 'text-brand-primary' : 'text-text-primary',
    extra,
  );

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
    showFontPickerModal, showTimerModal,
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

  const { pill: floatingPill, onEnter: onFloatingEnter, onLeave: onFloatingLeave } = useGlassPill(floatingBarRef);
  const { pill: codeLangPill, onEnter: onCodeLangEnter, onLeave: onCodeLangLeave } = useGlassPill(codeLangRef);
  const { pill: headingPill, onEnter: onHeadingEnter, onLeave: onHeadingLeave } = useGlassPill(headingPickerRef);

  const headingStyle = useSmartPopupStyle(headingPos, headingPickerRef);
  const fontSizeStyle = useSmartPopupStyle(fontSizePos, fontSizeRef);
  const lineHeightStyle = useSmartPopupStyle(lineHeightPickerPos, lineHeightRef);
  const codeLangStyle = useSmartPopupStyle(codeLangPickerPos, codeLangRef);

  const [fontSizePillRect, setFontSizePillRect] = useState<{ left: number; top: number; width: number; height: number; visible: boolean } | null>(null);
  const [lineHeightPillRect, setLineHeightPillRect] = useState<{ left: number; top: number; width: number; height: number; visible: boolean } | null>(null);

  const onFontSizeItemEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const container = fontSizeRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = e.currentTarget.getBoundingClientRect();
    const style = getComputedStyle(container);
    setFontSizePillRect({
      left: bRect.left - cRect.left - (parseFloat(style.borderLeftWidth) || 0),
      top: bRect.top - cRect.top - (parseFloat(style.borderTopWidth) || 0) + container.scrollTop,
      width: bRect.width, height: bRect.height, visible: true,
    });
  };

  const onLineHeightItemEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const container = lineHeightRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = e.currentTarget.getBoundingClientRect();
    const style = getComputedStyle(container);
    setLineHeightPillRect({
      left: bRect.left - cRect.left - (parseFloat(style.borderLeftWidth) || 0),
      top: bRect.top - cRect.top - (parseFloat(style.borderTopWidth) || 0) + container.scrollTop,
      width: bRect.width, height: bRect.height, visible: true,
    });
  };

  useEffect(() => {
    keepVisibleRef.current = showFontPickerModal || showTimerModal || !!colorPickerPos || !!highlightPickerPos;
  }, [showFontPickerModal, showTimerModal, colorPickerPos, highlightPickerPos]);

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
      onMouseEnter={(e) => onFloatingEnter(e, !!active)}
      disabled={btnDisabled}
      title={title}
      className={clsx(
        'icon-btn-md rounded-lg transition-colors flex-shrink-0 relative z-10 disabled:opacity-30',
        active ? 'text-text-primary sidebar-item-active' : '',
      )}
    >
      {children}
    </button>
  );

  if (!visible || disabled) return null;

  const page0 = (
    <>
      {btn((_e) => formatText('bold'), 'Fett', <Bold className="w-4 h-4" />, isBold, isInCode)}
      {btn((_e) => formatText('italic'), 'Kursiv', <Italic className="w-4 h-4" />, isItalic, isInCode)}
      {btn((_e) => formatText('underline'), 'Unterstrichen', <Underline className="w-4 h-4" />, isUnderline, isInCode)}
      {btn((_e) => formatText('strikethrough'), 'Durchgestrichen', <Strikethrough className="w-4 h-4" />, isStrikethrough, isInCode)}
      {btn((_e) => { closeAllLocalPickers(); openFontPickerFromMenu(); }, 'Schriftart', <Type className="w-4 h-4" />, showFontPickerModal, isInCode)}
      {btn(
        (e) => {
          if (fontSizePos) { setFontSizePos(null); return; }
          closeAll();
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          setFontSizePos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
        },
        'Schriftgröße', <ALargeSmall className="w-4 h-4" />, !!fontSizePos, isInCode,
      )}
      {btn(
        (e) => {
          if (colorPickerPos) { setColorPickerPos(null); return; }
          closeAll(); saveSelection();
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          setColorPickerPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
        },
        'Schriftfarbe', <Palette className="w-4 h-4" />, !!colorPickerPos, isInCode,
      )}
      {btn(
        (e) => {
          if (highlightPickerPos) { setHighlightPickerPos(null); return; }
          closeAll(); saveSelection();
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          setHighlightPickerPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
        },
        'Hervorheben', <Highlighter className="w-4 h-4" />, !!highlightPickerPos, isInCode,
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
          setHeadingPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
        },
        'Überschrift', <Heading className="w-4 h-4" />, !!headingPos,
      )}
      {btn((_e) => formatAlignment('left'), 'Linksbündig', <AlignLeft className="w-4 h-4" />, undefined, isInCode)}
      {btn((_e) => formatAlignment('center'), 'Zentriert', <AlignCenter className="w-4 h-4" />, undefined, isInCode)}
      {btn((_e) => formatAlignment('right'), 'Rechtsbündig', <AlignRight className="w-4 h-4" />, undefined, isInCode)}
      {btn((_e) => formatAlignment('justify'), 'Blocksatz', <AlignJustify className="w-4 h-4" />, undefined, isInCode)}
      {btn(
        (e) => {
          if (lineHeightPickerPos) { setLineHeightPickerPos(null); return; }
          closeAll();
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          setLineHeightPickerPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
        },
        'Zeilenhöhe', <ListChevronsUpDown className="w-4 h-4" />, !!lineHeightPickerPos, isInCode,
      )}
      {btn((_e) => outdentContent(), 'Einzug verkleinern', <IndentDecrease className="w-4 h-4" />)}
      {btn((_e) => indentContent(), 'Einzug vergrößern', <IndentIncrease className="w-4 h-4" />)}
    </>
  );

  const page2 = (
    <>
      {btn((_e) => formatBulletList(), 'Liste', <List className="w-4 h-4" />, blockType === 'bullet')}
      {btn((_e) => formatNumberedList(), 'Nummerierte Liste', <ListOrdered className="w-4 h-4" />, blockType === 'number')}
      {btn((_e) => formatCheckList(), 'Checkbox', <ListChecks className="w-4 h-4" />, blockType === 'check')}
      {btn((_e) => openTimerModal(), 'Timer-Checkbox', <ClockCheck className="w-4 h-4" />, blockType === 'timer-checkbox' || showTimerModal)}
      {btn((_e) => formatQuote(), 'Zitat', <Quote className="w-4 h-4" />, blockType === 'quote')}
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
              setCodeLangPickerPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
            }
          },
          blockType === 'code' ? `Sprache: ${getLanguageFriendlyName(codeLanguage)}` : 'Code-Block',
          codeIcon,
          blockType === 'code' || !!codeLangPickerPos,
        );
      })()}
      {btn((_e) => formatText('superscript'), 'Hochgestellt', <Superscript className="w-4 h-4" />, isSuperscript, isInCode)}
      {btn((_e) => formatText('subscript'), 'Tiefgestellt', <Subscript className="w-4 h-4" />, isSubscript, isInCode)}
    </>
  );

  // suppress unused variable warning — fontFamily is tracked in context for state sync
  void fontFamily;

  return createPortal(
    <>
      <div
        ref={floatingBarRef}
        className="fixed flex items-center gap-0.5 px-1.5 py-1 rounded-2xl border border-[color-mix(in_srgb,var(--color-border-default)_55%,transparent)] shadow-[0_12px_40px_color-mix(in_srgb,#000_35%,transparent),0_0_0_1px_color-mix(in_srgb,var(--color-brand-primary)_8%,transparent)]"
        style={{
          top: pos.top,
          left: pos.left,
          transform: 'translateX(-50%)',
          background: 'transparent',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onMouseDown={(e) => e.preventDefault()}
        onMouseLeave={onFloatingLeave}
      >
        {floatingPill && (
          <div
            className="glass-pill pointer-events-none"
            style={{ left: floatingPill.left, top: floatingPill.top, width: floatingPill.width, height: floatingPill.height, opacity: floatingPill.visible ? 1 : 0 }}
          />
        )}

        <div className="overflow-hidden" style={{ width: PAGE_W }}>
          <div
            className="flex transition-transform duration-200 ease-in-out"
            style={{ transform: `translateX(${-page * PAGE_W}px)`, width: PAGE_W * PAGES }}
          >
            <div className="flex gap-0.5 flex-shrink-0" style={{ width: PAGE_W }}>{page0}</div>
            <div className="flex gap-0.5 flex-shrink-0" style={{ width: PAGE_W }}>{page1}</div>
            <div className="flex gap-0.5 flex-shrink-0" style={{ width: PAGE_W }}>{page2}</div>
          </div>
        </div>

        <div className="w-px self-stretch bg-[color-mix(in_srgb,var(--color-border-default)_50%,transparent)] mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFloatingLeave();
            closeAllLocalPickers();
            setPage((p) => (p + 1) % PAGES);
          }}
          onMouseEnter={(e) => onFloatingEnter(e, false)}
          title="Weitere Optionen"
          className="icon-btn-md rounded-lg transition-colors flex-shrink-0 relative z-10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {headingPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setHeadingPos(null)} />
          <div
            ref={headingPickerRef}
            className="fixed glass-popup rounded-xl shadow-xl py-1 overflow-hidden"
            style={headingStyle}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={onHeadingLeave}
          >
            {headingPill && (
              <div className="glass-pill pointer-events-none" style={{ left: headingPill.left, top: headingPill.top, width: headingPill.width, height: headingPill.height, opacity: headingPill.visible ? 1 : 0 }} />
            )}
            {blockType.startsWith('h') && (
              <>
                <button
                  type="button"
                  onClick={() => { removeHeading(); setHeadingPos(null); }}
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
                type="button"
                onClick={() => { formatHeading(tag); setHeadingPos(null); }}
                onMouseEnter={(e) => onHeadingEnter(e, blockType === tag)}
                className={pickerItemCls(blockType === tag, 'flex items-center justify-center w-full px-4')}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </>,
        getModalPortalRoot(),
      )}

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
              <button key={size} type="button"
                onClick={() => { applyFontSize(size); setFontSizePos(null); setFontSizePillRect(null); }}
                onMouseEnter={onFontSizeItemEnter}
                className={clsx('block whitespace-nowrap text-left px-3 py-1.5 text-sm transition-colors relative z-10 w-full', fontSize === size ? 'text-brand-primary' : 'text-text-primary')}
              >
                {size}
              </button>
            ))}
          </div>
        </>,
        getModalPortalRoot(),
      )}

      {lineHeightPickerPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => { setLineHeightPickerPos(null); setLineHeightPillRect(null); }} />
          <div
            ref={lineHeightRef}
            className="fixed glass-popup rounded-xl shadow-xl py-0 overflow-hidden"
            style={lineHeightStyle}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={() => setLineHeightPillRect(p => p ? { ...p, visible: false } : null)}
          >
            {lineHeightPillRect && (
              <div className="glass-pill pointer-events-none" style={{ left: lineHeightPillRect.left, top: lineHeightPillRect.top, width: lineHeightPillRect.width, height: lineHeightPillRect.height, opacity: lineHeightPillRect.visible ? 1 : 0 }} />
            )}
            {LINE_HEIGHTS.map((value) => (
              <button key={value} type="button"
                onClick={() => { applyLineHeight(value); setLineHeightPickerPos(null); setLineHeightPillRect(null); }}
                onMouseEnter={onLineHeightItemEnter}
                className={clsx('block whitespace-nowrap text-left px-3 py-1.5 text-sm transition-colors relative z-10 w-full', (lineHeight === value || (value === '1.5' && !lineHeight)) ? 'text-brand-primary' : 'text-text-primary')}
              >
                {value}×
              </button>
            ))}
          </div>
        </>,
        getModalPortalRoot(),
      )}

      {codeLangPickerPos && createPortal(
        <>
          <div className="fixed inset-0" onClick={() => setCodeLangPickerPos(null)} />
          <div
            ref={codeLangRef}
            className="fixed glass-popup rounded-xl shadow-xl py-1 overflow-hidden max-h-64 overflow-y-auto scrollbar-overlay"
            style={codeLangStyle}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={onCodeLangLeave}
            onScroll={onCodeLangLeave}
          >
            {codeLangPill && (
              <div className="glass-pill pointer-events-none" style={{ left: codeLangPill.left, top: codeLangPill.top, width: codeLangPill.width, height: codeLangPill.height, opacity: codeLangPill.visible ? 1 : 0 }} />
            )}
            <button
              type="button"
              onClick={() => { handleFormatCode(); setCodeLangPickerPos(null); }}
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
                  type="button"
                  onClick={() => { setCodeNodeLanguage(lang); setCodeLangPickerPos(null); }}
                  onMouseEnter={(e) => onCodeLangEnter(e, isPickerActive(lang, codeLanguage, 'js'))}
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
        getModalPortalRoot(),
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
    </>,
    getModalPortalRoot(),
  );
}

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { ListChecks, X } from 'lucide-react';
import { CODE_LANGUAGE_FRIENDLY_NAME_MAP } from '@lexical/code';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useMagicHover } from '../../hooks/useMagicHover';
import { useSmartPopupStyle } from '../../hooks/useSmartPopupStyle';
import { useAuthStore } from '../../store/useAuthStore';
import { canAccess } from '../../lib/planFeatures';
import { Icons } from '../ui/Icons';
import { useToolbarStateContext } from './ToolbarStateContext';
import {
  FONT_SIZES, LINE_HEIGHTS, LANG_ICONS,
  isPickerActive, pickerItemCls,
  popupCls, popupPad, popupMotion, getPopupStyle,
} from './toolbarPopupUtils';

// Vertical list pickers docked to the left of the More panel. All state comes from
// ToolbarStateContext, so they must render inside RichTextToolbar's provider.

export const HeadingPicker = () => {
  const { headingPickerPos, setHeadingPickerPos, blockType, removeHeading, formatHeading } = useToolbarStateContext();
  const ref = useRef<HTMLDivElement>(null);
  const { onItemEnter, onItemLeave, Indicator } = useMagicHover({ mode: 'free', borderRadius: 8, ref });
  const { style, placement } = useSmartPopupStyle(headingPickerPos, ref, -8);

  return createPortal(
    <AnimatePresence>
      {headingPickerPos && (
      <motion.div
        ref={ref}
        className={clsx(popupCls(placement, popupPad(placement)), 'magic-hover')}
        style={{ ...style, ...getPopupStyle(placement) }}
        onMouseDown={(e) => e.preventDefault()}
        {...popupMotion(placement)}
      >
        {Indicator}
        <div className="flex flex-col px-1">
          {blockType.startsWith('h') && (
            <button
              onClick={() => { removeHeading(); setHeadingPickerPos(null); }}
              onMouseEnter={onItemEnter} onMouseLeave={onItemLeave}
              className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors text-red-500 whitespace-nowrap"
            >
              <X className="w-4 h-4 shrink-0" /> Remove
            </button>
          )}
          {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => { formatHeading(tag); setHeadingPickerPos(null); }}
              onMouseEnter={onItemEnter} onMouseLeave={onItemLeave}
              className={clsx('w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap', blockType === tag ? 'text-(--accent)' : 'text-(--ink)')}
            >
              {tag.toUpperCase()}
            </button>
          ))}
        </div>
      </motion.div>
      )}
    </AnimatePresence>,
    getModalPortalRoot()
  );
};

export const CodeLangPicker = () => {
  const { codeLangPickerPos, setCodeLangPickerPos, codeLanguage, formatCode, setCodeNodeLanguage } = useToolbarStateContext();
  const ref = useRef<HTMLDivElement>(null);
  const { onItemEnter, onItemLeave, Indicator } = useMagicHover({ mode: 'free', borderRadius: 8, ref });
  const { style, placement } = useSmartPopupStyle(codeLangPickerPos, ref, 0);

  return createPortal(
    <AnimatePresence>
      {codeLangPickerPos && (
      <motion.div
        ref={ref}
        className={clsx(popupCls(placement, popupPad(placement)), 'magic-hover')}
        style={{ ...style, ...getPopupStyle(placement) }}
        onMouseDown={(e) => e.preventDefault()}
        {...popupMotion(placement)}
      >
        {Indicator}
        <div className="flex flex-col px-1">
          <button
            onClick={() => { formatCode(); setCodeLangPickerPos(null); }}
            onMouseEnter={onItemEnter} onMouseLeave={onItemLeave}
            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors text-red-500 whitespace-nowrap"
          >
            <X className="w-4 h-4 shrink-0" /> Remove
          </button>
          {Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP).map(([lang, label]) => {
            const LangIcon = LANG_ICONS[lang];
            return (
              <button
                key={lang}
                onClick={() => { setCodeNodeLanguage(lang); setCodeLangPickerPos(null); }}
                onMouseEnter={onItemEnter} onMouseLeave={onItemLeave}
                className={clsx('flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap', isPickerActive(lang, codeLanguage, 'js') ? 'text-(--accent)' : 'text-(--ink)')}
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
      )}
    </AnimatePresence>,
    getModalPortalRoot()
  );
};

export const FontSizePicker = () => {
  const { fontSizePos, setFontSizePos, fontSize, applyFontSize } = useToolbarStateContext();
  const ref = useRef<HTMLDivElement>(null);
  const { onItemEnter, onItemLeave, Indicator } = useMagicHover({ mode: 'free', borderRadius: 8, ref });
  const { style, placement } = useSmartPopupStyle(fontSizePos, ref, -8);

  return createPortal(
    <AnimatePresence>
      {fontSizePos && (
      <motion.div
        ref={ref}
        className={clsx(popupCls(placement, popupPad(placement)), 'magic-hover')}
        style={{ ...style, ...getPopupStyle(placement) }}
        onMouseDown={(e) => e.preventDefault()}
        {...popupMotion(placement)}
      >
        {Indicator}
        <div className="flex flex-col px-1">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => { applyFontSize(size); setFontSizePos(null); }}
              onMouseEnter={onItemEnter} onMouseLeave={onItemLeave}
              className={clsx('w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap', isPickerActive(size, fontSize, '12') ? 'text-(--accent)' : 'text-(--ink)')}
            >
              {size}
            </button>
          ))}
        </div>
      </motion.div>
      )}
    </AnimatePresence>,
    getModalPortalRoot()
  );
};

export const LineHeightPicker = () => {
  const { lineHeightPickerPos, setLineHeightPickerPos, lineHeight, applyLineHeight } = useToolbarStateContext();
  const ref = useRef<HTMLDivElement>(null);
  const { onItemEnter, onItemLeave, Indicator } = useMagicHover({ mode: 'free', borderRadius: 8, ref });
  const { style, placement } = useSmartPopupStyle(lineHeightPickerPos, ref, -8);

  return createPortal(
    <AnimatePresence>
      {lineHeightPickerPos && (
      <motion.div
        ref={ref}
        className={clsx(popupCls(placement, popupPad(placement)), 'magic-hover')}
        style={{ ...style, ...getPopupStyle(placement) }}
        onMouseDown={(e) => e.preventDefault()}
        {...popupMotion(placement)}
      >
        {Indicator}
        <div className="flex flex-col px-1">
          {LINE_HEIGHTS.map((value) => (
            <button
              key={value}
              onClick={() => { applyLineHeight(value); setLineHeightPickerPos(null); }}
              onMouseEnter={onItemEnter} onMouseLeave={onItemLeave}
              className={clsx('w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap', isPickerActive(value, lineHeight, '1.5') ? 'text-(--accent)' : 'text-(--ink)')}
            >
              {value}×
            </button>
          ))}
        </div>
      </motion.div>
      )}
    </AnimatePresence>,
    getModalPortalRoot()
  );
};

export const ChecklistDropdown = () => {
  const {
    checklistDropdownPos, setChecklistDropdownPos,
    blockType, formatCheckList, openTimerModal,
  } = useToolbarStateContext();
  const { user } = useAuthStore();
  const ref = useRef<HTMLDivElement>(null);
  const { style, placement } = useSmartPopupStyle(checklistDropdownPos, ref, 0);

  return createPortal(
    <AnimatePresence>
      {checklistDropdownPos && (
      <motion.div
        ref={ref}
        className={popupCls(placement, popupPad(placement, '1', '4'))}
        style={{ ...style, ...getPopupStyle(placement) }}
        onMouseDown={(e) => e.preventDefault()}
        {...popupMotion(placement)}
      >
        <button
          onClick={() => { formatCheckList(); setChecklistDropdownPos(null); }}
          className={pickerItemCls(blockType === 'check', 'flex items-center gap-2 px-3 w-full')}
        >
          <ListChecks className="w-4 h-4 shrink-0" />
          Checkbox
        </button>
        {(() => {
          const canTimer = canAccess(user?.plan, 'timerChecklist');
          return (
            <button
              onClick={canTimer ? () => { setChecklistDropdownPos(null); openTimerModal(); } : undefined}
              className={pickerItemCls(blockType === 'timer-checkbox', clsx('flex items-center gap-2 px-3 w-full', !canTimer && 'cursor-not-allowed'))}
            >
              <Icons.timerCheckbox className={clsx('w-4 h-4 shrink-0', !canTimer && 'opacity-40')} />
              <span className={clsx('flex-1', !canTimer && 'opacity-40')}>Timer-Checkbox</span>
              {!canTimer && (
                <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.85, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', padding: '1px 4px', borderRadius: '3px', boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)' }}>
                  Writer
                </span>
              )}
            </button>
          );
        })()}
      </motion.div>
      )}
    </AnimatePresence>,
    getModalPortalRoot()
  );
};

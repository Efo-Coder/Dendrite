import React from 'react';
import clsx from 'clsx';
import {
  SiJavascript, SiTypescript, SiPython, SiRust, SiSwift,
  SiHtml5, SiCss, SiCplusplus, SiC,
  SiMarkdown, SiPhp, SiRuby, SiGo, SiKotlin, SiLua, SiScala,
  SiR, SiGnubash,
} from 'react-icons/si';
import type { IconType } from 'react-icons';

export const LANG_ICONS: Record<string, IconType> = {
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

export const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];
export const LINE_HEIGHTS = ['1', '1.25', '1.5', '1.75', '2', '2.5'];

export const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Black', value: '#111827' },
  { label: 'Gray', value: '#9ca3af' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Pink', value: '#ec4899' },
];

export const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fce7f3' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Purple', value: '#e9d5ff' },
];

export const isPickerActive = (value: string, current: string, defaultValue: string) =>
  current === value || (value === defaultValue && !current);

export const isToolbarActive = (pickerOpen: boolean, current = '', defaultValue = '') =>
  pickerOpen || (!!current && current !== defaultValue);

export const popupCls =(placement: 'above' | 'below' | 'left', extra = '') =>
  clsx(
    'fixed',
    // Side popups reuse the More panel's surface (.glass-popup) so they match it exactly, and
    // sit behind the panel (z-3) but above the editor. Bar popups keep the bordered glass look.
    placement === 'left' ? 'z-3 overflow-y-auto glass-popup' : 'z-3 overflow-hidden border border-(--line)',
    placement === 'above' ? 'border-b-0' : placement === 'below' ? 'border-t-0' : '',
    extra,
  );

export const getPopupStyle = (placement: 'above' | 'below' | 'left'): React.CSSProperties => {
  if (placement === 'left') {
    return {
      // Surface (bg/blur/border/shadow) comes from .glass-popup — identical to the panel.
      // Here only the seam: round the outer (left) corners, square + borderless on the right.
      borderRadius: '1rem 0 0 1rem',
      borderRightWidth: 0,
    };
  }
  return {
    background: 'transparent',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: placement === 'above' ? '1rem 1rem 0 0' : '0 0 1rem 1rem',
    clipPath: placement === 'above' ? 'inset(-1px round 1rem 1rem 0 0)' : 'inset(-1px round 0 0 1rem 1rem)',
  };
};

export const popupPad = (placement: 'above' | 'below' | 'left', near = '2', far = '6') =>
  placement === 'left' ? 'py-1.5'
    : placement === 'above' ? `pt-${near} pb-${far}` : `pb-${near} pt-${far}`;

export const popupMotion = (placement: 'above' | 'below' | 'left') => {
  if (placement === 'left') {
    // Fade + slide out of the panel's left edge. The popup sits behind the panel, so the
    // slide reads as it emerging from underneath. Matches the More panel's timing.
    return {
      initial: { opacity: 0, x: '100%', y: '-50%' },
      animate: { opacity: 1, x: 0, y: '-50%' },
      exit: { opacity: 0, x: '100%', y: '-50%', transition: { duration: 0.18 } },
      transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
    };
  }
  const dock  = placement === 'above' ?  16 : -16;
  const enter = dock + 8;
  return {
    initial: { opacity: 0, y: enter },
    animate: { opacity: 1, y: dock },
    exit: { opacity: 0, y: enter, transition: { duration: 0.12 } },
    transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  };
};

export const menuBtnCls = (active: boolean) =>
  clsx(
    'icon-btn-md rounded-lg transition-colors shrink-0 disabled:opacity-30',
    active ? 'text-(--ink) sidebar-item-active' : '',
  );

export const pickerItemCls = (active: boolean, extra = '') =>
  clsx(
    'py-1.5 text-sm transition-colors text-left whitespace-nowrap hover:bg-(--surface-hi)',
    active ? 'text-(--accent)' : 'text-(--ink)',
    extra,
  );

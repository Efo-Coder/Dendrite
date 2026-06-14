import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Lock, Unlock, Square, Scan, ChevronDown, ImageIcon } from 'lucide-react';
import { useSmartPopupStyle, type PopupAnchor } from '../../hooks/useSmartPopupStyle';

interface ResizableImageProps {
  src: string;
  altText: string;
  initialWidth?: number;
  initialHeight?: number;
  initialAlignment?: 'left' | 'center' | 'right';
  initialMaintainAspectRatio?: boolean;
  initialPositionLocked?: boolean;
  initialCollapsed?: boolean;
  onSizeChange?: (width: number, height: number) => void;
  onAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  onAspectRatioChange?: (locked: boolean) => void;
  onPositionLockChange?: (locked: boolean) => void;
  onCollapseChange?: (collapsed: boolean) => void;
  onDelete?: () => void;
}

type ResizeDirection = 'right' | 'bottom' | 'corner';


const ResizableImage = ({
  src,
  altText,
  initialWidth = 100,
  initialHeight = 300,
  initialAlignment = 'left',
  initialMaintainAspectRatio = false,
  initialPositionLocked = false,
  initialCollapsed = false,
  onSizeChange,
  onAlignmentChange,
  onAspectRatioChange,
  onPositionLockChange,
  onCollapseChange,
  onDelete,
}: ResizableImageProps) => {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [alignment, setAlignment] = useState(initialAlignment);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>('right');
  const [showControls, setShowControls] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(initialMaintainAspectRatio);
  const [positionLocked, setPositionLocked] = useState(initialPositionLocked);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [isAnimating, setIsAnimating] = useState(false);
  const [anchor, setAnchor] = useState<PopupAnchor | null>(null);

  const imageRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);
  const liveWidthRef = useRef(width);
  const liveHeightRef = useRef(height);
  const aspectRatioRef = useRef(1);
  const editorWidthRef = useRef(800);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  // Box geometry captured right before a user collapse/expand toggle; null means no animation
  const collapseAnimFromRef = useRef<{ w: number; h: number } | null>(null);
  const collapseAnimatingRef = useRef(false);

  const { style: popupStyle } = useSmartPopupStyle(anchor, controlsRef);

  // Sync local state from props when Lexical updates externally (e.g. undo/redo)
  useEffect(() => { if (!isResizing) setWidth(initialWidth ?? 100); }, [initialWidth]);
  useEffect(() => { if (!isResizing) setHeight(initialHeight ?? 300); }, [initialHeight]);
  useEffect(() => { setPositionLocked(initialPositionLocked ?? false); }, [initialPositionLocked]);
  useEffect(() => { setCollapsed(initialCollapsed ?? false); }, [initialCollapsed]);

  // Sync float/size/margin to the Lexical createDOM wrapper div (parent of this component).
  // This is needed because the float must be on a sibling of text paragraphs for text-wrap to work.
  useLayoutEffect(() => {
    const parent = imageRef.current?.parentElement as HTMLElement | null;
    if (!parent) return;
    // Collapsed: plain block (no float), so the surrounding text never wraps beside the
    // chip — it flows below it. The inner container handles horizontal alignment.
    if (collapsed) {
      parent.style.float = 'none';
      parent.style.width = '';
      parent.style.height = '';
      parent.style.marginTop = '4px';
      parent.style.marginBottom = '4px';
      parent.style.marginLeft = '';
      parent.style.marginRight = '';
      parent.style.position = 'relative';
      parent.style.zIndex = '1';
      parent.style.display = 'block';
    } else if (alignment === 'left' || alignment === 'right') {
      parent.style.float = alignment;
      parent.style.width = `${width}%`;
      parent.style.height = '';
      parent.style.marginTop = '4px';
      parent.style.marginBottom = '4px';
      parent.style.marginLeft = alignment === 'right' ? '16px' : '0';
      parent.style.marginRight = alignment === 'left' ? '16px' : '0';
      parent.style.position = 'relative';
      parent.style.zIndex = '1';
      parent.style.display = 'block';
    } else {
      parent.style.float = 'none';
      parent.style.width = '';
      parent.style.height = '';
      parent.style.marginLeft = '';
      parent.style.marginRight = '';
      parent.style.marginTop = '';
      parent.style.marginBottom = '';
      parent.style.position = '';
      parent.style.zIndex = '';
      parent.style.display = 'block';
    }
  }, [alignment, width, height, collapsed]);

  // Compute anchor for smart popup positioning, clamped to editor canvas bounds
  useLayoutEffect(() => {
    if (!showControls || !imageRef.current || !controlsRef.current) {
      setAnchor(null);
      return;
    }
    const imageRect = imageRef.current.getBoundingClientRect();
    const popupW = controlsRef.current.offsetWidth;
    const centerX = imageRect.left + imageRect.width / 2;

    let scrollEl: HTMLElement | null = imageRef.current.parentElement;
    while (scrollEl) {
      const ov = getComputedStyle(scrollEl).overflowY;
      if (ov === 'auto' || ov === 'scroll') break;
      scrollEl = scrollEl.parentElement;
    }
    const canvasRect = scrollEl?.getBoundingClientRect();
    let left = centerX - popupW / 2;
    if (canvasRect) left = Math.max(canvasRect.left + 8, Math.min(canvasRect.right - popupW - 8, left));

    setAnchor({ x: centerX, top: imageRect.top, bottom: imageRect.bottom, left });
    requestAnimationFrame(() => setIsVisible(true));
  }, [showControls, width, height]);

  const getEditorWidth = () => {
    if (!imageRef.current) return 800;
    const parent = imageRef.current.parentElement;
    if (alignment === 'left' || alignment === 'right') {
      return parent?.parentElement?.offsetWidth || 800;
    }
    return parent?.offsetWidth || 800;
  };

  const handleMouseDown = (e: React.MouseEvent, direction: ResizeDirection) => {
    if (positionLocked) return;
    e.preventDefault();
    setIsResizing(true);
    setResizeDirection(direction);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startWidthRef.current = width;
    startHeightRef.current = height;
    editorWidthRef.current = getEditorWidth();

    if (maintainAspectRatio) {
      const actualWidth = (width / 100) * editorWidthRef.current;
      aspectRatioRef.current = actualWidth / height;
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !imageRef.current) return;

      const containerWidth = editorWidthRef.current;
      const deltaX = e.clientX - startXRef.current;
      const deltaY = e.clientY - startYRef.current;

      const setW = (v: number) => { liveWidthRef.current = v; setWidth(v); };
      const setH = (v: number) => { liveHeightRef.current = v; setHeight(v); };

      if (resizeDirection === 'right') {
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.min(100, Math.max(10, startWidthRef.current + deltaPercent));
        setW(newWidth);
        if (maintainAspectRatio) {
          const actualWidth = (newWidth / 100) * containerWidth;
          setH(Math.max(50, actualWidth / aspectRatioRef.current));
        }
      } else if (resizeDirection === 'bottom') {
        const newHeight = Math.max(50, startHeightRef.current + deltaY);
        setH(newHeight);
        if (maintainAspectRatio) {
          const newWidth = (newHeight * aspectRatioRef.current / containerWidth) * 100;
          setW(Math.min(100, Math.max(10, newWidth)));
        }
      } else if (resizeDirection === 'corner') {
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.min(100, Math.max(10, startWidthRef.current + deltaPercent));
        const newHeight = Math.max(50, startHeightRef.current + deltaY);
        if (maintainAspectRatio) {
          const actualWidth = (newWidth / 100) * containerWidth;
          setW(newWidth);
          setH(Math.max(50, actualWidth / aspectRatioRef.current));
        } else {
          setW(newWidth);
          setH(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        const wChanged = liveWidthRef.current !== startWidthRef.current;
        const hChanged = liveHeightRef.current !== startHeightRef.current;
        if (onSizeChange && (wChanged || hChanged)) {
          onSizeChange(liveWidthRef.current, liveHeightRef.current);
        }
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.documentElement.removeAttribute('data-resizing');
    };
  }, [isResizing, width, height, onSizeChange, resizeDirection, maintainAspectRatio]);

  const handleAlignmentChange = (newAlignment: 'left' | 'center' | 'right') => {
    setAlignment(newAlignment);
    if (onAlignmentChange) onAlignmentChange(newAlignment);
  };

  const handleMouseEnter = () => {
    // No popup while the expand animation runs — its anchor would be measured mid-animation
    if (collapsed || collapseAnimatingRef.current) return;
    if (!showControls) setShowControls(true);
  };

  // Single document-level mousemove tracks both image and popup (handles portal gap)
  useEffect(() => {
    if (!showControls || isResizing) return;

    const handleMove = (e: MouseEvent) => {
      const imageRect = imageRef.current?.getBoundingClientRect();
      const popupRect = controlsRef.current?.getBoundingClientRect();
      const buf = 6;

      const overImage = imageRect &&
        e.clientX >= imageRect.left - buf && e.clientX <= imageRect.right + buf &&
        e.clientY >= imageRect.top - buf && e.clientY <= imageRect.bottom + buf;
      const overPopup = popupRect &&
        e.clientX >= popupRect.left - buf && e.clientX <= popupRect.right + buf &&
        e.clientY >= popupRect.top - buf && e.clientY <= popupRect.bottom + buf;

      if (overImage || overPopup) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
          setIsVisible(true);
        }
      } else {
        if (!hideTimeoutRef.current) {
          setIsVisible(false);
          hideTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
            setAnchor(null);
            hideTimeoutRef.current = null;
          }, 220);
        }
      }
    };

    document.addEventListener('mousemove', handleMove);
    return () => document.removeEventListener('mousemove', handleMove);
  }, [showControls, isResizing]);

  // Fade out popup when the editor canvas scrolls
  useEffect(() => {
    if (!showControls || isResizing) return;
    let scrollEl: HTMLElement | null = imageRef.current?.parentElement ?? null;
    while (scrollEl) {
      const ov = getComputedStyle(scrollEl).overflowY;
      if (ov === 'auto' || ov === 'scroll') break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) return;
    const onScroll = () => {
      setIsVisible(false);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setAnchor(null);
        hideTimeoutRef.current = null;
      }, 250);
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl!.removeEventListener('scroll', onScroll);
  }, [showControls, isResizing]);

  const getContainerStyle = (): React.CSSProperties => {
    // Collapsed: compact chip, horizontally placed by alignment (vertical margin lives on
    // the parent block to avoid doubling it).
    if (collapsed) {
      const align: React.CSSProperties =
        alignment === 'center' ? { marginLeft: 'auto', marginRight: 'auto' }
        : alignment === 'right' ? { marginLeft: 'auto', marginRight: 0 }
        : { marginLeft: 0, marginRight: 'auto' };
      return { width: 'fit-content', position: 'relative', ...align };
    }
    if (alignment === 'left' || alignment === 'right') {
      return { width: '100%', height: `${height}px`, position: 'relative' };
    }
    return {
      width: `${width}%`,
      height: `${height}px`,
      marginTop: '4px',
      marginBottom: '4px',
      position: 'relative',
      marginLeft: 'auto',
      marginRight: 'auto',
    };
  };

  // Capture current box geometry, flip state, then animate old → new in the layout effect.
  const startCollapseToggle = (next: boolean) => {
    const rect = imageRef.current?.getBoundingClientRect();
    collapseAnimFromRef.current = rect ? { w: rect.width, h: rect.height } : null;
    if (next) {
      setShowControls(false);
      setAnchor(null);
    }
    setIsAnimating(true);
    setCollapsed(next);
    onCollapseChange?.(next);
  };

  const handleCollapse = () => startCollapseToggle(true);
  const handleExpand = () => startCollapseToggle(false);

  // Minimize/maximize animation: the box shrinks/grows in both dimensions while the image
  // stays visible and cross-fades with the chip — so collapsing mirrors expanding. Real
  // width/height (not a transform) so the floated column narrows and surrounding text reflows.
  // Runs only after a user toggle (ref set in startCollapseToggle); undo/redo and the initial
  // mount sync collapsed via props and stay instant.
  useLayoutEffect(() => {
    const from = collapseAnimFromRef.current;
    collapseAnimFromRef.current = null;
    const el = imageRef.current;
    if (!from || !el) { setIsAnimating(false); return; }

    const to = el.getBoundingClientRect();
    if (Math.abs(from.w - to.width) < 1 && Math.abs(from.h - to.height) < 1) {
      setIsAnimating(false);
      return;
    }

    const duration = 260;
    const easing = 'cubic-bezier(0.33, 1, 0.68, 1)';
    const collapsing = collapsed;

    // Clip only while animating — expanded state needs visible overflow for resize handles
    collapseAnimatingRef.current = true;
    el.style.overflow = 'hidden';
    const boxAnim = el.animate(
      [
        { width: `${from.w}px`, height: `${from.h}px` },
        { width: `${to.width}px`, height: `${to.height}px` },
      ],
      { duration, easing }
    );
    const imgAnim = imgWrapRef.current?.animate(
      [{ opacity: collapsing ? 1 : 0 }, { opacity: collapsing ? 0 : 1 }],
      { duration, easing, fill: 'both' }
    );
    const chipAnim = chipRef.current?.animate(
      [{ opacity: collapsing ? 0 : 1 }, { opacity: collapsing ? 1 : 0 }],
      { duration, easing, fill: 'both' }
    );

    const reset = () => {
      el.style.overflow = '';
      collapseAnimatingRef.current = false;
    };
    // Don't cancel the fades on finish: fill:'both' holds their end opacity until the
    // hidden element unmounts. Cancelling would snap it back to opacity 1 for one frame.
    boxAnim.addEventListener('finish', () => { reset(); setIsAnimating(false); });
    return () => { boxAnim.cancel(); imgAnim?.cancel(); chipAnim?.cancel(); reset(); };
  }, [collapsed]);

  return (
    <div ref={imageRef} style={getContainerStyle()} className={collapsed ? '' : 'group'} onMouseEnter={handleMouseEnter} onMouseMove={handleMouseEnter}>

      {(collapsed || isAnimating) && (
        <div
          ref={chipRef}
          role="button"
          onClick={handleExpand}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-(--surface-hi)"
          style={{ width: 'fit-content', boxShadow: '0 0 0 1px var(--line-soft)' }}
          title="Bild aufklappen"
        >
          <ImageIcon className="w-3.5 h-3.5 shrink-0 text-(--ink-mid) group-hover:text-(--accent) transition-colors" />
          <span className="text-sm font-mono text-(--ink-mid) group-hover:text-(--accent) transition-colors">{altText}</span>
        </div>
      )}

      {!collapsed && showControls && createPortal(
        <div
          ref={controlsRef}
          className="glass-popup rounded-lg shadow-xl flex items-center gap-0.5 px-1.5 py-1"
          style={{
            ...popupStyle,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: isVisible
              ? 'opacity 180ms ease, transform 220ms cubic-bezier(0.34, 1.4, 0.64, 1)'
              : 'opacity 180ms ease-in, transform 200ms ease-in',
          }}
        >
          <button
            onClick={handleCollapse}
            className="p-1.5 rounded-md transition-all hover:bg-(--surface-hi)"
            title="Bild zuklappen"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <div className="h-6 w-px border-l border-(--line-soft) mx-1 shrink-0" />
          <button
            onClick={() => !positionLocked && handleAlignmentChange('left')}
            className={`p-1.5 rounded-md transition-all hover:bg-(--surface-hi) ${positionLocked ? 'opacity-30 pointer-events-none' : alignment === 'left' ? 'text-(--accent)' : ''}`}
            title="Align left (text wraps right)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => !positionLocked && handleAlignmentChange('center')}
            className={`p-1.5 rounded-md transition-all hover:bg-(--surface-hi) ${positionLocked ? 'opacity-30 pointer-events-none' : alignment === 'center' ? 'text-(--accent)' : ''}`}
            title="Center (block)"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => !positionLocked && handleAlignmentChange('right')}
            className={`p-1.5 rounded-md transition-all hover:bg-(--surface-hi) ${positionLocked ? 'opacity-30 pointer-events-none' : alignment === 'right' ? 'text-(--accent)' : ''}`}
            title="Align right (text wraps left)"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <div className="h-6 w-px border-l border-(--line-soft) mx-1 shrink-0" />
          <button
            onClick={() => { if (positionLocked) return; const next = !maintainAspectRatio; setMaintainAspectRatio(next); if (onAspectRatioChange) onAspectRatioChange(next); }}
            className={`p-1.5 rounded-md transition-all hover:bg-(--surface-hi) ${positionLocked ? 'opacity-30 pointer-events-none' : maintainAspectRatio ? 'text-(--accent)' : ''}`}
            title={maintainAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
          >
            {maintainAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <div className="h-6 w-px border-l border-(--line-soft) mx-1 shrink-0" />
          <button
            onClick={() => { const next = !positionLocked; setPositionLocked(next); if (onPositionLockChange) onPositionLockChange(next); }}
            className={`p-1.5 rounded-md transition-all hover:bg-(--surface-hi) ${positionLocked ? 'text-(--accent)' : ''}`}
            title={positionLocked ? 'Unlock position' : 'Lock position'}
          >
            {positionLocked ? <Square className="w-3.5 h-3.5" /> : <Scan className="w-3.5 h-3.5" />}
          </button>
          <div className="h-6 w-px border-l border-(--line-soft) mx-1 shrink-0" />
          {onDelete && (
            <button
              onClick={() => !positionLocked && onDelete?.()}
              className={`p-1.5 rounded-md transition-all hover:bg-(--surface-hi) ${positionLocked ? 'opacity-30 pointer-events-none' : 'hover:text-red-500'}`}
              title="Delete image"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>,
        document.body
      )}

      {(!collapsed || isAnimating) && <div ref={imgWrapRef} className={isAnimating ? 'absolute inset-0' : 'relative h-full'}>
        <img
          src={src}
          alt={altText}
          className="w-full h-full object-contain border border-white/30"
          draggable={false}
        />

        {!isAnimating && showControls && !positionLocked && (
          <>
            <div onMouseDown={(e) => handleMouseDown(e, 'right')} className="resize-handle-ew absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 z-1" style={{ touchAction: 'none', background: 'var(--bg)', borderColor: 'var(--accent)' }} />
            <div onMouseDown={(e) => handleMouseDown(e, 'bottom')} className="resize-handle-ns absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 z-1" style={{ touchAction: 'none', background: 'var(--bg)', borderColor: 'var(--accent)' }} />
            <div onMouseDown={(e) => handleMouseDown(e, 'corner')} className="resize-handle-nwse absolute -bottom-2 -right-2 w-4 h-4 rounded-full border-2 z-1" style={{ touchAction: 'none', background: 'var(--bg)', borderColor: 'var(--accent)' }} />
          </>
        )}

        {showControls && !isResizing && (
          <div className="absolute inset-0 pointer-events-none border-2" style={{ borderColor: 'var(--accent)' }} />
        )}
        {isResizing && (
          <div className="absolute inset-0 pointer-events-none border-2" style={{ borderColor: 'var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 5%, transparent)' }} />
        )}
      </div>}

      {!collapsed && isResizing && (
        <div className="image-size-indicator absolute -bottom-9 left-1/2 -translate-x-1/2 glass-popup rounded-lg px-3 py-1.5 text-xs text-(--ink) shadow-xl font-mono whitespace-nowrap flex items-center" style={{ zIndex: 50 }}>
          {(() => {
            const actualWidthPx = Math.round((width / 100) * editorWidthRef.current);
            return (
              <>
                {maintainAspectRatio && <span className="mr-2 text-(--ink-mid) relative -top-px"><Lock className="w-3 h-3" /></span>}
                <span className="text-(--accent) font-semibold">{actualWidthPx}</span>
                <span className="text-(--ink-mid) mx-1">×</span>
                <span className="text-(--accent) font-semibold">{Math.round(height)}</span>
                <span className="text-(--ink-mid) ml-0.5">px</span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ResizableImage;

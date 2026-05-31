import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Lock, Unlock, Square, Scan } from 'lucide-react';
import { useSmartPopupStyle, type PopupAnchor } from '../../hooks/useSmartPopupStyle';

interface ResizableImageProps {
  src: string;
  altText: string;
  initialWidth?: number;
  initialHeight?: number;
  initialAlignment?: 'left' | 'center' | 'right';
  initialMaintainAspectRatio?: boolean;
  initialPositionLocked?: boolean;
  onSizeChange?: (width: number, height: number) => void;
  onAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  onAspectRatioChange?: (locked: boolean) => void;
  onPositionLockChange?: (locked: boolean) => void;
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
  onSizeChange,
  onAlignmentChange,
  onAspectRatioChange,
  onPositionLockChange,
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

  const { style: popupStyle } = useSmartPopupStyle(anchor, controlsRef);

  // Sync local state from props when Lexical updates externally (e.g. undo/redo)
  useEffect(() => { if (!isResizing) setWidth(initialWidth ?? 100); }, [initialWidth]);
  useEffect(() => { if (!isResizing) setHeight(initialHeight ?? 300); }, [initialHeight]);
  useEffect(() => { setPositionLocked(initialPositionLocked ?? false); }, [initialPositionLocked]);

  // Sync float/size/margin to the Lexical createDOM wrapper div (parent of this component).
  // This is needed because the float must be on a sibling of text paragraphs for text-wrap to work.
  useLayoutEffect(() => {
    const parent = imageRef.current?.parentElement as HTMLElement | null;
    if (!parent) return;
    if (alignment === 'left' || alignment === 'right') {
      parent.style.float = alignment;
      parent.style.width = `${width}%`;
      parent.style.height = '';       // let content (imageRef) determine height
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
  }, [alignment, width, height]);

  // Compute anchor for smart popup positioning, clamped to editor canvas bounds
  useLayoutEffect(() => {
    if (!showControls || !imageRef.current || !controlsRef.current) {
      setAnchor(null);
      return;
    }
    const imageRect = imageRef.current.getBoundingClientRect();
    const popupW = controlsRef.current.offsetWidth;
    const centerX = imageRect.left + imageRect.width / 2;

    // Clamp horizontal position to the editor canvas (scroll container)
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

  // Returns the editor container width (not the image width when floating)
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
    if (alignment === 'left' || alignment === 'right') {
      // Parent handles float + width; this div owns the explicit height
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

  return (
    <div ref={imageRef} style={getContainerStyle()} className="group" onMouseEnter={handleMouseEnter} onMouseMove={handleMouseEnter}>

      {showControls && createPortal(
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

      {/* Image + Resize Handles */}
      <div className="relative h-full">
        <img
          src={src}
          alt={altText}
          className="w-full h-full object-contain border border-white/30"
          draggable={false}
        />

        {showControls && !positionLocked && (
          <>
            <div onMouseDown={(e) => handleMouseDown(e, 'right')} className="resize-handle-ew absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 z-10" style={{ touchAction: 'none', background: 'var(--bg)', borderColor: 'var(--accent)' }} />
            <div onMouseDown={(e) => handleMouseDown(e, 'bottom')} className="resize-handle-ns absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 z-10" style={{ touchAction: 'none', background: 'var(--bg)', borderColor: 'var(--accent)' }} />
            <div onMouseDown={(e) => handleMouseDown(e, 'corner')} className="resize-handle-nwse absolute -bottom-2 -right-2 w-4 h-4 rounded-full border-2 z-10" style={{ touchAction: 'none', background: 'var(--bg)', borderColor: 'var(--accent)' }} />
          </>
        )}

        {showControls && !isResizing && (
          <div className="absolute inset-0 pointer-events-none border-2" style={{ borderColor: 'var(--accent)' }} />
        )}
        {isResizing && (
          <div className="absolute inset-0 pointer-events-none border-2" style={{ borderColor: 'var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 5%, transparent)' }} />
        )}
      </div>

      {/* Size Indicator */}
      {isResizing && (
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

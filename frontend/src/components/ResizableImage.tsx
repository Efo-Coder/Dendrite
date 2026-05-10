import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Lock, Unlock } from 'lucide-react';
import { useGlassPill } from '../hooks/useGlassPill';

interface ResizableImageProps {
  src: string;
  altText: string;
  initialWidth?: number;
  initialHeight?: number;
  initialAlignment?: 'left' | 'center' | 'right';
  initialMaintainAspectRatio?: boolean;
  onWidthChange?: (width: number) => void;
  onHeightChange?: (height: number) => void;
  onAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  onAspectRatioChange?: (locked: boolean) => void;
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
  onWidthChange,
  onHeightChange,
  onAlignmentChange,
  onAspectRatioChange,
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
  const [controlsPos, setControlsPos] = useState<{ left: number; top: number } | null>(null);

  const imageRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const { pill, onEnter: onPillEnter, onLeave: onPillLeave } = useGlassPill(controlsRef);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);
  const aspectRatioRef = useRef(1);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measure popup, set exact position, then trigger enter animation
  useLayoutEffect(() => {
    if (!showControls || !imageRef.current || !controlsRef.current) return;
    const imageRect = imageRef.current.getBoundingClientRect();
    const popupRect = controlsRef.current.getBoundingClientRect();
    setControlsPos({
      left: Math.round(imageRect.left + imageRect.width / 2 - popupRect.width / 2),
      top: Math.round(imageRect.top - 4 - popupRect.height),
    });
    // Trigger animation after position is applied
    requestAnimationFrame(() => setIsVisible(true));
  }, [showControls]);

  const handleMouseDown = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeDirection(direction);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startWidthRef.current = width;
    startHeightRef.current = height;

    if (maintainAspectRatio && imageRef.current) {
      const containerWidth = imageRef.current.parentElement?.offsetWidth || 800;
      const actualWidth = (width / 100) * containerWidth;
      aspectRatioRef.current = actualWidth / height;
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !imageRef.current) return;

      const containerWidth = imageRef.current.parentElement?.offsetWidth || 800;
      const deltaX = e.clientX - startXRef.current;
      const deltaY = e.clientY - startYRef.current;

      if (resizeDirection === 'right') {
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.min(100, Math.max(20, startWidthRef.current + deltaPercent));
        setWidth(newWidth);
        if (maintainAspectRatio) {
          const actualWidth = (newWidth / 100) * containerWidth;
          setHeight(Math.max(50, actualWidth / aspectRatioRef.current));
        }
      } else if (resizeDirection === 'bottom') {
        const newHeight = Math.max(50, startHeightRef.current + deltaY);
        setHeight(newHeight);
        if (maintainAspectRatio) {
          const newWidth = (newHeight * aspectRatioRef.current / containerWidth) * 100;
          setWidth(Math.min(100, Math.max(20, newWidth)));
        }
      } else if (resizeDirection === 'corner') {
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.min(100, Math.max(20, startWidthRef.current + deltaPercent));
        const newHeight = Math.max(50, startHeightRef.current + deltaY);
        if (maintainAspectRatio) {
          const actualWidth = (newWidth / 100) * containerWidth;
          setWidth(newWidth);
          setHeight(Math.max(50, actualWidth / aspectRatioRef.current));
        } else {
          setWidth(newWidth);
          setHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        if (onWidthChange && width !== startWidthRef.current) onWidthChange(width);
        if (onHeightChange && height !== startHeightRef.current) onHeightChange(height);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, width, height, onWidthChange, onHeightChange, resizeDirection, maintainAspectRatio]);

  const handleAlignmentChange = (newAlignment: 'left' | 'center' | 'right') => {
    setAlignment(newAlignment);
    if (onAlignmentChange) onAlignmentChange(newAlignment);
  };

  const handleMouseEnter = () => setShowControls(true);

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
            setControlsPos(null);
            hideTimeoutRef.current = null;
          }, 220);
        }
      }
    };

    document.addEventListener('mousemove', handleMove);
    return () => document.removeEventListener('mousemove', handleMove);
  }, [showControls, isResizing]);

  const getContainerStyle = (): React.CSSProperties => ({
    width: `${width}%`,
    height: `${height}px`,
    marginTop: '12px',
    marginBottom: '12px',
    position: 'relative',
    marginLeft: alignment === 'right' ? 'auto' : alignment === 'center' ? 'auto' : '0',
    marginRight: alignment === 'left' ? '0' : alignment === 'center' ? 'auto' : '0',
  });

  return (
    <div ref={imageRef} style={getContainerStyle()} className="group">

      {/* Controls – portal to document.body, positioned with exact integer pixels (no transform) */}
      {showControls && createPortal(
        <div
          ref={controlsRef}
          className="fixed z-[9999] glass-popup rounded-lg shadow-xl flex items-center gap-0.5 px-1.5 py-1"
          style={{
            left: controlsPos?.left ?? -9999,
            top: controlsPos?.top ?? -9999,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: isVisible
              ? 'opacity 180ms ease, transform 220ms cubic-bezier(0.34, 1.4, 0.64, 1)'
              : 'opacity 180ms ease-in, transform 200ms ease-in',
          }}
          onMouseLeave={onPillLeave}
        >
          {pill && <div className="glass-pill" style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }} />}
          <button
            onClick={() => handleAlignmentChange('left')}
            onMouseEnter={(e) => onPillEnter(e, alignment === 'left')}
            className={`p-1.5 rounded-md transition-all relative z-10 ${alignment === 'left' ? 'text-brand-primary' : 'text-text-secondary hover:text-text-primary'}`}
            title="Links ausrichten"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleAlignmentChange('center')}
            onMouseEnter={(e) => onPillEnter(e, alignment === 'center')}
            className={`p-1.5 rounded-md transition-all relative z-10 ${alignment === 'center' ? 'text-brand-primary' : 'text-text-secondary hover:text-text-primary'}`}
            title="Zentrieren"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleAlignmentChange('right')}
            onMouseEnter={(e) => onPillEnter(e, alignment === 'right')}
            className={`p-1.5 rounded-md transition-all relative z-10 ${alignment === 'right' ? 'text-brand-primary' : 'text-text-secondary hover:text-text-primary'}`}
            title="Rechts ausrichten"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <div className="h-6 w-px glass-divider mx-1 flex-shrink-0" />
          <button
            onClick={() => { const next = !maintainAspectRatio; setMaintainAspectRatio(next); if (onAspectRatioChange) onAspectRatioChange(next); }}
            onMouseEnter={(e) => onPillEnter(e, maintainAspectRatio)}
            className={`p-1.5 rounded-md transition-all relative z-10 ${maintainAspectRatio ? 'text-brand-primary' : 'text-text-secondary hover:text-text-primary'}`}
            title={maintainAspectRatio ? 'Seitenverhältnis gesperrt' : 'Seitenverhältnis entsperrt'}
          >
            {maintainAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <div className="h-6 w-px glass-divider mx-1 flex-shrink-0" />
          {onDelete && (
            <button
              onClick={onDelete}
              onMouseEnter={(e) => onPillEnter(e, false)}
              className="p-1.5 rounded-md relative z-10 text-text-secondary hover:text-red-500 transition-all"
              title="Bild löschen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>,
        document.body
      )}

      {/* Image + Resize Handles */}
      <div className="relative h-full" onMouseEnter={handleMouseEnter}>
        <img
          src={src}
          alt={altText}
          className="w-full h-full object-contain border border-white/30"
          draggable={false}
        />

        {showControls && (
          <>
            <div onMouseDown={(e) => handleMouseDown(e, 'right')} className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-ew-resize border-2 z-10" style={{ touchAction: 'none', background: 'var(--color-bg-primary)', borderColor: 'var(--color-brand-primary)' }} />
            <div onMouseDown={(e) => handleMouseDown(e, 'bottom')} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full cursor-ns-resize border-2 z-10" style={{ touchAction: 'none', background: 'var(--color-bg-primary)', borderColor: 'var(--color-brand-primary)' }} />
            <div onMouseDown={(e) => handleMouseDown(e, 'corner')} className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full cursor-nwse-resize border-2 z-10" style={{ touchAction: 'none', background: 'var(--color-bg-primary)', borderColor: 'var(--color-brand-primary)' }} />
          </>
        )}

        {showControls && !isResizing && (
          <div className="absolute inset-0 pointer-events-none border-2" style={{ borderColor: 'var(--color-brand-primary)' }} />
        )}
        {isResizing && (
          <div className="absolute inset-0 pointer-events-none border-2" style={{ borderColor: 'var(--color-brand-primary)', backgroundColor: 'color-mix(in srgb, var(--color-brand-primary) 5%, transparent)' }} />
        )}
      </div>

      {/* Size Indicator */}
      {isResizing && (
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 glass-popup rounded-lg px-3 py-1.5 text-xs text-text-primary shadow-xl font-mono whitespace-nowrap flex items-center">
          {(() => {
            const containerWidth = imageRef.current?.parentElement?.offsetWidth || 800;
            const actualWidthPx = Math.round((width / 100) * containerWidth);
            return (
              <>
                {maintainAspectRatio && <span className="mr-2 text-text-secondary"><Lock className="w-3 h-3" /></span>}
                <span className="text-brand-primary font-semibold">{actualWidthPx}</span>
                <span className="text-text-secondary mx-1">×</span>
                <span className="text-brand-primary font-semibold">{Math.round(height)}</span>
                <span className="text-text-secondary ml-0.5">px</span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ResizableImage;

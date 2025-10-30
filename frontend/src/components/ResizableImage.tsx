import { useState, useRef, useEffect } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Lock, Unlock } from 'lucide-react';

interface ResizableImageProps {
  src: string;
  altText: string;
  initialWidth?: number;
  initialHeight?: number;
  initialAlignment?: 'left' | 'center' | 'right';
  onWidthChange?: (width: number) => void;
  onHeightChange?: (height: number) => void;
  onAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  onDelete?: () => void;
}

type ResizeDirection = 'right' | 'bottom' | 'corner';

const ResizableImage = ({
  src,
  altText,
  initialWidth = 100,
  initialHeight = 300,
  initialAlignment = 'left',
  onWidthChange,
  onHeightChange,
  onAlignmentChange,
  onDelete,
}: ResizableImageProps) => {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [alignment, setAlignment] = useState(initialAlignment);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>('right');
  const [showControls, setShowControls] = useState(false);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);
  const aspectRatioRef = useRef(1);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeDirection(direction);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startWidthRef.current = width;
    startHeightRef.current = height;

    // Calculate aspect ratio for locked resizing
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
          const newHeight = actualWidth / aspectRatioRef.current;
          setHeight(Math.max(50, newHeight));
        }
      } else if (resizeDirection === 'bottom') {
        const newHeight = Math.max(50, startHeightRef.current + deltaY);
        setHeight(newHeight);

        if (maintainAspectRatio) {
          const newActualWidth = newHeight * aspectRatioRef.current;
          const newWidth = (newActualWidth / containerWidth) * 100;
          setWidth(Math.min(100, Math.max(20, newWidth)));
        }
      } else if (resizeDirection === 'corner') {
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.min(100, Math.max(20, startWidthRef.current + deltaPercent));
        const newHeight = Math.max(50, startHeightRef.current + deltaY);

        if (maintainAspectRatio) {
          // Use width as primary dimension
          const actualWidth = (newWidth / 100) * containerWidth;
          const lockedHeight = actualWidth / aspectRatioRef.current;
          setWidth(newWidth);
          setHeight(Math.max(50, lockedHeight));
        } else {
          setWidth(newWidth);
          setHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        if (onWidthChange && width !== startWidthRef.current) {
          onWidthChange(width);
        }
        if (onHeightChange && height !== startHeightRef.current) {
          onHeightChange(height);
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
    };
  }, [isResizing, width, height, onWidthChange, onHeightChange, resizeDirection, maintainAspectRatio]);

  const handleAlignmentChange = (newAlignment: 'left' | 'center' | 'right') => {
    setAlignment(newAlignment);
    if (onAlignmentChange) {
      onAlignmentChange(newAlignment);
    }
  };

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    if (isResizing) return;

    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 300);
  };

  const getContainerStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: `${width}%`,
      height: `${height}px`,
      marginTop: '12px',
      marginBottom: '12px',
      position: 'relative',
    };

    if (alignment === 'center') {
      baseStyle.marginLeft = 'auto';
      baseStyle.marginRight = 'auto';
    } else if (alignment === 'right') {
      baseStyle.marginLeft = 'auto';
      baseStyle.marginRight = '0';
    } else {
      baseStyle.marginLeft = '0';
      baseStyle.marginRight = '0';
    }

    return baseStyle;
  };

  return (
    <div
      ref={imageRef}
      style={getContainerStyle()}
      className="group"
    >
      {/* Image Controls */}
      {showControls && (
        <div
          className="absolute -top-11 left-0 right-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="bg-dark-surface/95 backdrop-blur-sm border border-dark-border rounded-lg shadow-xl flex items-center gap-0.5 px-1.5 py-1"
            onMouseEnter={handleMouseEnter}
          >
            <button
              onClick={() => handleAlignmentChange('left')}
              className={`p-1.5 rounded-md transition-all ${
                alignment === 'left'
                  ? 'bg-accent-green-500/20 text-accent-green-500'
                  : 'text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary'
              }`}
              title="Links ausrichten"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlignmentChange('center')}
              className={`p-1.5 rounded-md transition-all ${
                alignment === 'center'
                  ? 'bg-accent-green-500/20 text-accent-green-500'
                  : 'text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary'
              }`}
              title="Zentrieren"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlignmentChange('right')}
              className={`p-1.5 rounded-md transition-all ${
                alignment === 'right'
                  ? 'bg-accent-green-500/20 text-accent-green-500'
                  : 'text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary'
              }`}
              title="Rechts ausrichten"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-dark-border/50 mx-1" />
            <button
              onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
              className={`p-1.5 rounded-md transition-all ${
                maintainAspectRatio
                  ? 'bg-accent-green-500/20 text-accent-green-500'
                  : 'text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary'
              }`}
              title={maintainAspectRatio ? 'Seitenverhältnis gesperrt' : 'Seitenverhältnis entsperrt'}
            >
              {maintainAspectRatio ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>
            <div className="w-px h-4 bg-dark-border/50 mx-1" />
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-md text-dark-text-muted hover:bg-red-500/10 hover:text-red-500 transition-all"
                title="Bild löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image Container */}
      <div
        className="relative h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={src}
          alt={altText}
          className="w-full h-full object-contain rounded-lg border border-dark-border"
          draggable={false}
        />

        {/* Resize Handles */}
        {showControls && (
          <>
            {/* Right Handle - Width */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'right')}
              className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all"
              style={{
                touchAction: 'none',
                background: 'var(--color-accent-500)',
              }}
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'right')}
              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all border-2"
              style={{
                touchAction: 'none',
                background: 'var(--color-dark-bg)',
                borderColor: 'var(--color-accent-500)',
              }}
            />

            {/* Bottom Handle - Height */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'bottom')}
              className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-all"
              style={{
                touchAction: 'none',
                background: 'var(--color-accent-500)',
              }}
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'bottom')}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full cursor-ns-resize opacity-0 group-hover:opacity-100 transition-all border-2"
              style={{
                touchAction: 'none',
                background: 'var(--color-dark-bg)',
                borderColor: 'var(--color-accent-500)',
              }}
            />

            {/* Corner Handle - Both */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'corner')}
              className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-all border-2"
              style={{
                touchAction: 'none',
                background: 'var(--color-dark-bg)',
                borderColor: 'var(--color-accent-500)',
              }}
            />
          </>
        )}

        {/* Resizing Overlay */}
        {isResizing && (
          <div
            className="absolute inset-0 rounded-lg pointer-events-none border-2"
            style={{
              borderColor: 'var(--color-accent-500)',
              backgroundColor: 'color-mix(in srgb, var(--color-accent-500) 5%, transparent)',
            }}
          />
        )}
      </div>

      {/* Size Indicator */}
      {isResizing && (
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-dark-surface/95 backdrop-blur-sm border border-dark-border rounded-lg px-3 py-1.5 text-xs text-dark-text-primary shadow-xl font-mono">
          <span className="text-accent-green-500 font-semibold">{Math.round(width)}%</span>
          <span className="text-dark-text-muted mx-1">×</span>
          <span className="text-accent-green-500 font-semibold">{Math.round(height)}px</span>
          {maintainAspectRatio && (
            <span className="ml-2 text-dark-text-muted">
              <Lock className="w-3 h-3 inline" />
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ResizableImage;

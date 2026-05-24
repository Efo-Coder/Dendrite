import { RefObject, useState, useCallback, useRef, useEffect } from 'react';

export interface PillState {
  left: number;
  top: number;
  width: number;
  height: number;
  visible: boolean;
}

export function useGlassPill(containerRef: RefObject<HTMLElement | null>) {
  const [pill, setPill] = useState<PillState | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasHidden = useRef(true);
  const activeButton = useRef<HTMLButtonElement | null>(null);
  const activeLeaveHandler = useRef<(() => void) | null>(null);

  const startLeaveTimer = useCallback(() => {
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      setPill(null);
      wasHidden.current = true;
      leaveTimer.current = null;
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
      if (activeButton.current && activeLeaveHandler.current) {
        activeButton.current.removeEventListener('mouseleave', activeLeaveHandler.current);
      }
    };
  }, []);

  const onEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, _isActive = false) => {
      if (leaveTimer.current !== null) {
        clearTimeout(leaveTimer.current);
        leaveTimer.current = null;
      }

      // Remove listener from previous button (already auto-removed by once if it fired)
      if (activeButton.current && activeLeaveHandler.current) {
        activeButton.current.removeEventListener('mouseleave', activeLeaveHandler.current);
        activeLeaveHandler.current = null;
      }

      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const bRect = e.currentTarget.getBoundingClientRect();
      const style = getComputedStyle(container);
      const borderLeft = parseFloat(style.borderLeftWidth) || 0;
      const borderTop = parseFloat(style.borderTopWidth) || 0;
      const pos = {
        left: bRect.left - cRect.left - borderLeft,
        top: bRect.top - cRect.top - borderTop + container.scrollTop,
        width: bRect.width,
        height: bRect.height,
      };

      // Track button leave natively so the timer starts the moment a button is left,
      // regardless of whether the cursor stays within the container.
      const button = e.currentTarget;
      const handleLeave = () => {
        startLeaveTimer();
        activeLeaveHandler.current = null;
        activeButton.current = null;
      };
      activeButton.current = button;
      activeLeaveHandler.current = handleLeave;
      button.addEventListener('mouseleave', handleLeave, { once: true });

      if (wasHidden.current) {
        wasHidden.current = false;
        setPill({ ...pos, visible: false });
        requestAnimationFrame(() => {
          setPill(p => (p ? { ...p, visible: true } : null));
        });
      } else {
        setPill({ ...pos, visible: true });
      }
    },
    [containerRef, startLeaveTimer]
  );

  // Container-level fallback for when no button was entered but cursor leaves
  const onLeave = useCallback(() => {
    startLeaveTimer();
  }, [startLeaveTimer]);

  return { pill, onEnter, onLeave };
}

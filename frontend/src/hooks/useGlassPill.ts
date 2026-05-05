import { RefObject, useState, useCallback } from 'react';

export interface PillState {
  left: number;
  top: number;
  width: number;
  height: number;
  isActive: boolean;
}

export function useGlassPill(containerRef: RefObject<HTMLElement | null>) {
  const [pill, setPill] = useState<PillState | null>(null);

  const onEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, isActive = false) => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const bRect = e.currentTarget.getBoundingClientRect();
      setPill({
        left: bRect.left - cRect.left,
        top: bRect.top - cRect.top,
        width: bRect.width,
        height: bRect.height,
        isActive,
      });
    },
    [containerRef]
  );

  const onLeave = useCallback(() => setPill(null), []);

  return { pill, onEnter, onLeave };
}

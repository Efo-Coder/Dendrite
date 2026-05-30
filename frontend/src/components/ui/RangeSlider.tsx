import { useState, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  width?: number;
}

export default function RangeSlider({
  min, max, step = 1, value, onChange, width = 160,
}: RangeSliderProps) {
  const [dragging, setDragging] = useState(false);

  const springPct = useSpring((value - min) / (max - min), { stiffness: 380, damping: 30 });

  useEffect(() => {
    springPct.set((value - min) / (max - min));
  }, [value, min, max, springPct]);

  const fillWidth = useTransform(springPct, v => `${v * 100}%`);
  const thumbLeft  = useTransform(springPct, v => `${v * 100}%`);

  return (
    <div style={{ position: 'relative', width, height: 20, display: 'flex', alignItems: 'center', flexShrink: 0 }}>

      {/* Accessible input — invisible, sits on top for pointer/keyboard events */}
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onKeyDown={() => setDragging(true)}
        onKeyUp={() => setDragging(false)}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', zIndex: 2, margin: 0,
        }}
      />

      {/* Track */}
      <div style={{
        width: '100%', height: 2, borderRadius: 2,
        background: 'color-mix(in oklch, var(--ink-dim) 40%, transparent)',
        position: 'relative', overflow: 'hidden',
      }}>
        <motion.div style={{
          height: '100%', background: 'var(--accent)', borderRadius: 2, width: fillWidth,
        }} />
      </div>

      {/* Thumb */}
      <motion.div
        style={{ position: 'absolute', left: thumbLeft, translateX: '-50%', zIndex: 1, pointerEvents: 'none' }}
      >
        <motion.div
          animate={{
            scale: dragging ? 1.18 : 1,
            boxShadow: dragging
              ? '0 0 0 5px color-mix(in oklch, var(--accent) 22%, transparent)'
              : '0 0 0 0px color-mix(in oklch, var(--accent) 0%, transparent)',
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          style={{
            width: 13, height: 13, borderRadius: '50%',
            background: 'var(--accent)',
            border: '2px solid var(--bg)',
            boxSizing: 'border-box',
          }}
        />

      </motion.div>
    </div>
  );
}

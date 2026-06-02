import React, { useState } from "react";
import { useMotionTemplate, useMotionValue, motion } from "motion/react";

interface MagicInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

export const MagicInput = React.forwardRef<HTMLInputElement, MagicInputProps>(
  ({ className, wrapperClassName, wrapperStyle, type, style, onFocus, onBlur, ...props }, ref) => {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    const background = useMotionTemplate`radial-gradient(
      120px circle at ${mouseX}px ${mouseY}px,
      var(--accent),
      transparent 80%
    )`;

    const glowActive = hovered && !focused;

    return (
      <div
        style={{ position: 'relative', borderRadius: "calc(0.75rem + 1px)", ...wrapperStyle }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={"w-full p-px" + (wrapperClassName ? " " + wrapperClassName : "")}
      >
        <motion.div
          animate={{ opacity: glowActive ? 1 : 0 }}
          transition={{ duration: glowActive ? 0.25 : 0.55, ease: "easeOut" }}
          style={{
            position: 'absolute', inset: 0, background, borderRadius: 'inherit', pointerEvents: 'none',
            padding: '1px',
            WebkitMaskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
            WebkitMaskOrigin: 'content-box, border-box',
            WebkitMaskClip: 'content-box, border-box',
            WebkitMaskComposite: 'destination-out',
            maskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
            maskOrigin: 'content-box, border-box',
            maskClip: 'content-box, border-box',
            maskComposite: 'subtract',
          }}
        />
        <input
          type={type}
          className={className}
          ref={ref}
          style={{ position: 'relative', zIndex: 1, ...style }}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...props}
        />
      </div>
    );
  }
);
MagicInput.displayName = "MagicInput";

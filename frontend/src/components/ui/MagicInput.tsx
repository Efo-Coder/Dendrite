import React, { useState, useEffect } from "react";
import { useMotionTemplate, useMotionValue, motion, animate } from "motion/react";

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

    const glowActive = hovered && !focused;
    const opacity = useMotionValue(0);
    const gradientBackground = useMotionTemplate`radial-gradient(100px circle at ${mouseX}px ${mouseY}px, var(--accent), transparent 80%)`;

    useEffect(() => {
      animate(opacity, glowActive ? 1 : 0, {
        duration: glowActive ? 0.3 : 0.5,
        ease: "easeOut",
      });
    }, [glowActive]);

    return (
      <div
        style={{ position: "relative", isolation: "isolate", borderRadius: "calc(0.75rem + 1px)", padding: "1px", ...wrapperStyle }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={"w-full" + (wrapperClassName ? " " + wrapperClassName : "")}
      >
        <motion.div style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: gradientBackground, opacity, pointerEvents: "none" }} />
        <input
          type={type}
          className={className}
          ref={ref}
          style={{ position: "relative", zIndex: 1, ...style }}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...props}
        />
      </div>
    );
  }
);
MagicInput.displayName = "MagicInput";

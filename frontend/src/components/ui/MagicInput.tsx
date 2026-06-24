import React, { useState, useEffect } from "react";
import { useMotionTemplate, useMotionValue, motion, animate } from "motion/react";

interface MagicInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  // Render a <textarea> instead of <input>, keeping the same glow wrapper.
  multiline?: boolean;
  rows?: number;
}

// Two stacked fills, the inner one painted in the content-box; `exclude` keeps only
// the difference — i.e. the 1px padding ring around the field.
const RING_MASK = "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)";

export const MagicInput = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, MagicInputProps>(
  ({ className, wrapperClassName, wrapperStyle, type, style, onFocus, onBlur, multiline, rows, ...props }, ref) => {
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
    }, [glowActive, opacity]);

    // display:block avoids the inline-block descender gap below the field, which
    // otherwise lets the wrapper glow bleed through under the input/textarea.
    const fieldStyle: React.CSSProperties = { display: "block", position: "relative", zIndex: 1, ...style };

    return (
      <div
        style={{ position: "relative", isolation: "isolate", borderRadius: "calc(0.75rem + 1px)", padding: "1px", ...wrapperStyle }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={"w-full" + (wrapperClassName ? " " + wrapperClassName : "")}
      >
        <motion.div
          style={{
            position: "absolute", inset: 0, borderRadius: "inherit", background: gradientBackground, opacity, pointerEvents: "none",
            // Clip the glow to the 1px wrapper padding so it reads as a luminous border
            // ring, not a filled circle bleeding through translucent (dark-mode) fields.
            padding: "1px", boxSizing: "border-box",
            WebkitMask: RING_MASK, WebkitMaskComposite: "xor",
            mask: RING_MASK, maskComposite: "exclude",
          }}
        />
        {multiline ? (
          <textarea
            className={className}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            style={fieldStyle}
            rows={rows}
            onFocus={(e) => { setFocused(true); onFocus?.(e as unknown as React.FocusEvent<HTMLInputElement>); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e as unknown as React.FocusEvent<HTMLInputElement>); }}
            {...(props as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            type={type}
            className={className}
            ref={ref as React.Ref<HTMLInputElement>}
            style={fieldStyle}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            {...props}
          />
        )}
      </div>
    );
  }
);
MagicInput.displayName = "MagicInput";

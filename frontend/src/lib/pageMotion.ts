import type { MotionProps } from 'motion/react';

// One shared transition for every page/view switch, so navigation feels consistent.
export const PAGE_FADE: Pick<MotionProps, 'initial' | 'animate' | 'exit' | 'transition'> = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.22, ease: 'easeInOut' },
};

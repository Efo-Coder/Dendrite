"use client";

import { motion } from "motion/react";
import DarkVeil from "./DarkVeil";

export interface HeroProps {
  isDark: boolean;
}

export function HeroSection({ isDark }: HeroProps) {
  return (
    <section id="hero" className="hero relative h-screen w-full bg-background overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={isDark ? undefined : { filter: 'invert(1)' }}
      >
        <DarkVeil
          speed={isDark ? 0.7 : 0.5}
          warpAmount={isDark ? 0.5 : 0.3}
          noiseIntensity={0.025}
          hueShift={isDark ? 80 : 260}
        />
      </div>

      <div
        className="relative z-10 mx-auto flex h-full max-w-360 flex-col px-6 text-left sm:px-12 lg:px-24"
        style={{ perspective: "1200px" }}
      >
        <div className="flex flex-1 flex-col justify-center pt-44 sm:pt-48 md:pt-0">
          <h1 className="text-[clamp(3rem,8vw,12rem)] leading-[1.05] tracking-tight text-foreground">
            <span className="block overflow-hidden pb-[0.1em]">
              <motion.span
                className="block"
                initial={{ y: "120%", rotateX: -90, opacity: 0 }}
                animate={{ y: 0, rotateX: 0, opacity: 1 }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                style={{ transformOrigin: "center bottom", transformStyle: "preserve-3d" }}
              >
                Capture every
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.1em]">
              <motion.span
                className="block"
                initial={{ y: "120%", rotateX: -90, opacity: 0 }}
                animate={{ y: 0, rotateX: 0, opacity: 1 }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                style={{ transformOrigin: "center bottom", transformStyle: "preserve-3d" }}
              >
                thought with
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.1em]">
              <motion.span
                className="block"
                initial={{ y: "120%", rotateX: -90, opacity: 0 }}
                animate={{ y: 0, rotateX: 0, opacity: 1 }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.7 }}
                style={{ transformOrigin: "center bottom", transformStyle: "preserve-3d" }}
              >
                <em className="font-serif">precision & clarity.</em>
              </motion.span>
            </span>
          </h1>

          <motion.p
            className="mt-8 max-w-md text-[clamp(1.125rem,1.5vw,1.75rem)] leading-relaxed text-foreground/80 lg:max-w-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: [0.25, 1, 0.5, 1], delay: 1.2 }}
          >
            A powerful note-taking app for people who think deeply. Rich text editing, smart organization, and a design that stays out of your way.
          </motion.p>
        </div>

        <motion.div
          className="pb-24 flex gap-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.25, 1, 0.5, 1], delay: 1.5 }}
        >
          <a
            href="/register"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-foreground text-background text-base font-medium transition-opacity hover:opacity-80"
          >
            Start for Free
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-foreground/20 text-foreground text-base font-medium transition-colors hover:bg-foreground/5"
          >
            Explore Features
          </a>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 w-full max-w-360 px-6 sm:px-12 lg:px-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 2 }}
      >
        <span className="text-lg tracking-tight font-medium text-foreground/80">
          Scroll
        </span>
      </motion.div>
    </section>
  );
}

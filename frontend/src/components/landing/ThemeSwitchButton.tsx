"use client";

import { useSyncExternalStore } from "react";

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </svg>
);

function useIsMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

interface ThemeSwitchButtonProps {
  dark: boolean;
  onToggleDark: () => void;
}

export function ThemeSwitchButton({ dark, onToggleDark }: ThemeSwitchButtonProps) {
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <div className="fixed bottom-6 right-6 z-4">
        <div className="w-10 h-10 rounded-full bg-foreground/10 opacity-30" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-4">
      <button
        onClick={onToggleDark}
        className="w-10 h-10 cursor-pointer rounded-full bg-muted text-foreground flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity duration-300 shadow-lg hover:shadow-xl"
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        aria-pressed={dark}
        type="button"
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  );
}

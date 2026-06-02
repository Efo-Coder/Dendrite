"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { LOGO_SRC } from "../../config/brand";
import { BetaBadge } from "../ui/BetaBadge";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

interface HeaderProps {
  dark?: boolean;
  onToggleDark?: () => void;
}

export function HeaderSection({ dark = false, onToggleDark }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? 'color-mix(in oklch, var(--bg-deep) 85%, transparent)' : 'transparent',
        borderBottom: `0.5px solid ${scrolled ? 'var(--line)' : 'transparent'}`,
        backdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div
        className="w-full flex items-center justify-between flex-nowrap"
        style={{ padding: '0 clamp(16px, 4vw, 80px)', height: '64px' }}
      >
        {/* Left: Logo + Nav */}
        <div className="flex items-center shrink-0">
          <a
            href="#hero"
            className="flex items-center gap-2 shrink-0"
            style={{ textDecoration: 'none' }}
          >
            <img
              src={LOGO_SRC}
              alt=""
              style={{ width: '22px', height: '22px', opacity: 0.85, flexShrink: 0 }}
            />
            <span style={{
              fontFamily: 'var(--serif-display)',
              fontSize: 'clamp(16px, 2.5vw, 19px)',
              fontWeight: 500,
              fontStyle: 'italic',
              color: 'var(--ink)',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}>
              Dendrite
            </span>
            <BetaBadge />
          </a>

          {/* Separator */}
          <div style={{ width: '0.5px', height: '18px', background: 'var(--line)', margin: '0 16px', flexShrink: 0 }} className="hidden sm:block" />

          {/* Nav links — desktop */}
          <nav className="hidden sm:flex items-center" style={{ gap: 'clamp(14px, 2vw, 30px)' }}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative group transition-colors duration-150 text-(--ink-mid) hover:text-(--ink) shrink-0"
                style={{ fontFamily: 'var(--serif-body)', fontSize: '14px', letterSpacing: '-0.005em', padding: '6px 0', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                {link.label}
                <span
                  className="absolute bottom-0 left-0 w-0 group-hover:w-full"
                  style={{ height: '0.5px', background: 'currentColor', transition: 'width 0.4s cubic-bezier(.2,.7,.2,1)' }}
                />
              </a>
            ))}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleDark && (
            <button
              onClick={onToggleDark}
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full icon-btn-auth fill-slide"
              style={{ cursor: 'pointer' }}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          )}

          <Link
            to="/login"
            className="btn-ghost fill-slide hidden sm:inline-flex text-(--ink-mid) hover:text-(--ink)"
            style={{ padding: '7px 16px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '8px',
              fontFamily: 'var(--serif-body)',
              textTransform: 'none',
              letterSpacing: 'normal',
              border: '0.5px solid var(--line)',
              }}
          >
            Sign in
          </Link>

          <Link
            to="/register"
            className="btn primary"
            style={{ padding: '8px 18px', fontSize: '14px', borderRadius: '9px' }}
          >
            Get Started
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="sm:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg gap-1.25 transition-colors hover:bg-(--surface)"
            style={{ background: 'transparent', border: '0.5px solid var(--line)', cursor: 'pointer', color: 'var(--ink-mid)' }}
            aria-label="Toggle menu"
          >
            <span
              className="block w-4 h-px bg-current rounded transition-all duration-200"
              style={{ transform: menuOpen ? 'translateY(5px) rotate(45deg)' : '' }}
            />
            <span
              className="block w-4 h-px bg-current rounded transition-all duration-200"
              style={{ opacity: menuOpen ? 0 : 1 }}
            />
            <span
              className="block w-4 h-px bg-current rounded transition-all duration-200"
              style={{ transform: menuOpen ? 'translateY(-5px) rotate(-45deg)' : '' }}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden sm:hidden"
            style={{ background: 'var(--bg-deep)', borderBottom: '0.5px solid var(--line)' }}
          >
            <div style={{ padding: '12px clamp(24px, 5vw, 80px) 20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg transition-colors text-(--ink-mid) hover:text-(--ink) hover:bg-(--surface)"
                  style={{ fontFamily: 'var(--serif-body)', fontSize: '16px', textDecoration: 'none' }}
                >
                  {link.label}
                </a>
              ))}
              <div style={{ height: '0.5px', background: 'var(--line-soft)', margin: '10px 0' }} />
              {onToggleDark && (
                <button
                  onClick={onToggleDark}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-(--ink-mid) hover:text-(--ink) hover:bg-(--surface)"
                  style={{ fontFamily: 'var(--serif-body)', fontSize: '16px', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                >
                  {dark ? <Sun size={15} /> : <Moon size={15} />}
                  {dark ? 'Switch to light mode' : 'Switch to dark mode'}
                </button>
              )}
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg transition-colors text-(--ink-mid) hover:text-(--ink) hover:bg-(--surface)"
                style={{ fontFamily: 'var(--serif-body)', fontSize: '16px', textDecoration: 'none' }}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="block text-center mt-1"
                style={{
                  padding: '11px',
                  borderRadius: '9px',
                  background: 'linear-gradient(180deg, color-mix(in oklch, var(--accent) 92%, white 5%), var(--accent-deep))',
                  color: 'oklch(0.15 0.020 60)',
                  fontFamily: 'var(--serif-display)',
                  fontWeight: 600,
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

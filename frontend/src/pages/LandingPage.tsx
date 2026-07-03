import { useEffect, useLayoutEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeaderSection } from '../components/landing/HeaderSection';
import { BetaBanner } from '../components/landing/BetaBanner';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { ServicesSection } from '../components/landing/ServicesSection';
import { AboutSection } from '../components/landing/AboutSection';
import { SocialProofSection } from '../components/landing/SocialProofSection';
import { PricingSection } from '../components/landing/PricingSection';
import { FaqSection } from '../components/landing/FaqSection';
import { FooterSection } from '../components/landing/FooterSection';
import { SmoothScroll } from '../components/landing/SmoothScroll';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const { themeMode, setThemeMode } = useSettingsStore();
  const dark = themeMode === 'dark';

  // useLayoutEffect so the legacy tokens are written synchronously during the View
  // Transition's flushSync — otherwise FaqSection & co. would snap after the cross-fade.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.removeAttribute('data-theme');
      root.style.setProperty('--background', 'oklch(0.16 0.008 60)');
      root.style.setProperty('--foreground', 'oklch(0.985 0 0)');
      root.style.setProperty('--muted', 'oklch(0.269 0 0)');
      root.style.setProperty('--muted-foreground', 'oklch(0.708 0 0)');
      root.style.setProperty('--border', 'oklch(1 0 0 / 10%)');
    } else {
      root.setAttribute('data-theme', 'light');
      root.style.setProperty('--background', 'oklch(0.97 0.006 80)');
      root.style.setProperty('--foreground', 'oklch(0.145 0 0)');
      root.style.setProperty('--muted', 'oklch(0.93 0.008 80)');
      root.style.setProperty('--muted-foreground', 'oklch(0.556 0 0)');
      root.style.setProperty('--border', 'oklch(0.922 0 0)');
    }
    return () => {
      root.setAttribute('data-theme', themeMode);
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--muted-foreground');
      root.style.removeProperty('--border');
    };
  }, [dark]);

  // Keep the full-page ScrollTrigger refresh out of the hero intro: the default
  // 'load' auto-refresh fires mid-choreography and blocks the main thread with a
  // full layout pass. Refresh once after the fonts settled and the intro ended;
  // until then triggers use their mount-time positions.
  useEffect(() => {
    ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,resize' });
    let cancelled = false;
    let timer = 0;
    const fontTimeout = new Promise<void>(resolve => setTimeout(resolve, 1500));
    Promise.race([document.fonts.ready, fontTimeout]).then(() => {
      if (!cancelled) timer = window.setTimeout(() => ScrollTrigger.refresh(), 2100);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18, ease: 'easeInOut' } }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
    <SmoothScroll>
      <div style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
        <BetaBanner />
        <HeaderSection dark={dark} onToggleDark={() => setThemeMode(dark ? 'light' : 'dark')} />
        <main id="main-content" style={{ position: 'relative', zIndex: 10, background: 'var(--bg)' }}>
          <HeroSection />
          <FeaturesSection />
          <ServicesSection />
          <AboutSection />
          <SocialProofSection />
          <PricingSection />
          <FaqSection />
        </main>
        <FooterSection />
      </div>
    </SmoothScroll>
    </motion.div>
  );
}

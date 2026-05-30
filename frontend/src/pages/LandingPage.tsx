import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeaderSection } from '../components/landing/HeaderSection';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(id);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  const landingVars = dark ? {
    '--background': 'oklch(0.16 0.008 60)',
    '--foreground': 'oklch(0.985 0 0)',
    '--muted': 'oklch(0.269 0 0)',
    '--muted-foreground': 'oklch(0.708 0 0)',
    '--border': 'oklch(1 0 0 / 10%)',
  } : {
    '--background': 'oklch(0.97 0.006 80)',
    '--foreground': 'oklch(0.145 0 0)',
    '--muted': 'oklch(0.93 0.008 80)',
    '--muted-foreground': 'oklch(0.556 0 0)',
    '--border': 'oklch(0.922 0 0)',
  };

  return (
    <SmoothScroll>
      <div ref={containerRef} style={{ ...landingVars, background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' } as React.CSSProperties}>
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
  );
}

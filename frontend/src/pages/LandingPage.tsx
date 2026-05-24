import { useState, useEffect } from 'react';
import { HeaderSection } from '../components/landing/HeaderSection';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { ServicesSection } from '../components/landing/ServicesSection';
import { AboutSection } from '../components/landing/AboutSection';
import { SocialProofSection } from '../components/landing/SocialProofSection';
import { FaqSection } from '../components/landing/FaqSection';
import { FooterSection } from '../components/landing/FooterSection';
import { ThemeSwitchButton } from '../components/landing/ThemeSwitchButton';
import { SmoothScroll } from '../components/landing/SmoothScroll';

export default function LandingPage() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    if (dark) {
      root.style.setProperty('--background', 'oklch(0.145 0 0)');
      root.style.setProperty('--foreground', 'oklch(0.985 0 0)');
      root.style.setProperty('--muted', 'oklch(0.269 0 0)');
      root.style.setProperty('--muted-foreground', 'oklch(0.708 0 0)');
      root.style.setProperty('--border', 'oklch(1 0 0 / 10%)');
    } else {
      root.style.setProperty('--background', 'oklch(1 0 0)');
      root.style.setProperty('--foreground', 'oklch(0.145 0 0)');
      root.style.setProperty('--muted', 'oklch(0.97 0 0)');
      root.style.setProperty('--muted-foreground', 'oklch(0.556 0 0)');
      root.style.setProperty('--border', 'oklch(0.922 0 0)');
    }

    return () => {
      root.classList.remove('dark');
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--muted-foreground');
      root.style.removeProperty('--border');
    };
  }, [dark]);

  return (
    <SmoothScroll>
      <div style={{ background: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh' }}>
        <HeaderSection />
        <main id="main-content" style={{ position: 'relative', zIndex: 10, background: 'var(--background)' }}>
          <HeroSection isDark={dark} />
          <FeaturesSection />
          <ServicesSection />
          <AboutSection />
          <SocialProofSection />
          <FaqSection />
        </main>
        <FooterSection />
        <ThemeSwitchButton dark={dark} onToggleDark={() => setDark((d) => !d)} />
      </div>
    </SmoothScroll>
  );
}

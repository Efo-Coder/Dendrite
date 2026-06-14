"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const IS_BETA = true;

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--accent)' }}>
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface PlanFeature {
  label: string;
  description?: string;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  inheritsFrom?: string;
  features: PlanFeature[];
  cta: string;
  highlighted: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    description: "Everything you need to get started.",
    cta: "Start writing",
    highlighted: false,
    features: [
      { label: "Unlimited notes", description: "No limits, ever" },
      { label: "Folders & tags", description: "Organise your way" },
      { label: "Rich-text editor", description: "Headings, lists, links" },
      { label: "Public sharing", description: "Share via link" },
      { label: "5 saved versions", description: "Undo recent edits" },
    ],
  },
  {
    name: "Writer",
    price: "€10",
    period: "per month",
    description: "For people who write seriously.",
    inheritsFrom: "Free",
    cta: "Become a Writer",
    highlighted: true,
    features: [
      { label: "Color picker", description: "Custom note colours" },
      { label: "Syntax highlighting", description: "Themed code blocks" },
      { label: "Checklist timer", description: "Time your tasks" },
      { label: "Markdown export", description: "Export as Markdown" },
      { label: "10 saved versions", description: "Keep more history" },
    ],
  },
  {
    name: "Author",
    price: "€120",
    period: "one-time",
    description: "Everything, forever. Pay once, own it.",
    inheritsFrom: "Writer",
    cta: "Write for life",
    highlighted: false,
    features: [
      { label: "PDF export", description: "Print-ready PDFs" },
      { label: "Priority support", description: "Front-of-queue help" },
      { label: "Early access", description: "New features first" },
      { label: "Unlimited version history", description: "Every edit, kept" },
    ],
  },
];

function PricingCard({ plan }: { plan: Plan }) {
  const navigate = useNavigate();
  const locked = IS_BETA && plan.name !== 'Free';
  const isFree = plan.name === 'Free';
  const isAuthor = plan.name === 'Author';

  const goToRegister = () => {
    sessionStorage.setItem('pending_plan', plan.name.toLowerCase());
    navigate('/register');
  };

  // Per-variant visuals; Author borrows the accent border to read as premium without being the highlighted hero card.
  const cardBg = plan.highlighted ? 'var(--bg-deep)' : 'var(--surface)';
  const cardBorder = plan.highlighted
    ? '1px solid var(--accent-deep)'
    : isAuthor
      ? '1px solid oklch(0.55 0.110 80 / 0.3)'
      : '1px solid var(--line)';
  const cardGlow = plan.highlighted
    ? '0 0 0 1px oklch(0.55 0.110 80 / 0.3), 0 8px 48px -8px oklch(0.78 0.110 85 / 0.18)'
    : undefined;
  const nameColor = isFree ? 'var(--ink-low)' : 'var(--accent)';

  // Progressive tiers prepend "Everything in <lower>, plus" as the first checked row.
  const featureRows: PlanFeature[] = plan.inheritsFrom
    ? [{ label: `Everything in ${plan.inheritsFrom}, plus` }, ...plan.features]
    : plan.features;

  const ctaBase = 'w-full text-center text-sm font-medium';
  const ctaStyle = { padding: '12px 24px', borderRadius: '9999px' };

  return (
    <div
      className="relative rounded-2xl p-5 md:p-6 lg:p-8 flex flex-col"
      data-locked={locked || undefined}
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardGlow,
        pointerEvents: locked ? 'none' : undefined,
        zIndex: plan.highlighted ? 0 : 1,
      }}
    >
      {locked && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 'inherit', zIndex: 1, pointerEvents: 'none' }} />}

      {plan.highlighted && !IS_BETA && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-serif italic whitespace-nowrap"
            style={{ background: 'var(--accent)', color: 'var(--bg-deep)' }}
          >
            Recommended
          </span>
        </div>
      )}

      <div className="mb-8">
        <p className="text-base italic mb-2" style={{ color: nameColor, fontFamily: 'var(--serif-display)' }}>
          {plan.name}
        </p>
        <div className="flex items-end gap-1 mb-2">
          <span className="font-serif text-5xl tracking-tight" style={{ color: 'var(--ink)' }}>{plan.price}</span>
          <span className="text-sm mb-2" style={{ color: 'var(--ink-low)' }}>/{plan.period}</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--ink-mid)' }}>{plan.description}</p>
      </div>

      <ul className="flex-1 mb-8" style={{ borderTop: '1px solid var(--line-soft)' }}>
        {featureRows.map((feature) => (
          <li key={feature.label} className="flex items-start gap-3 py-3">
            <span className="flex h-6 items-center shrink-0">
              <CheckIcon />
            </span>
            <span className="min-w-0">
              <span className="block text-sm" style={{ color: 'var(--ink)' }}>{feature.label}</span>
              {feature.description && (
                <span className="block text-xs mt-0.5" style={{ color: 'var(--ink-low)' }}>
                  {feature.description}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {isFree ? (
        <Link
          to="/register"
          className={`fill-slide ${ctaBase}`}
          style={{ ...ctaStyle, fontFamily: 'inherit', border: '1px solid var(--line)', textDecoration: 'none', display: 'block' }}
        >
          {plan.cta}
        </Link>
      ) : plan.highlighted ? (
        <button
          onClick={goToRegister}
          className={`btn primary ${ctaBase}`}
          style={ctaStyle}
        >
          {plan.cta}
        </button>
      ) : (
        <button
          onClick={goToRegister}
          className={`fill-slide ${ctaBase} cursor-pointer`}
          style={{ ...ctaStyle, fontFamily: 'inherit', background: 'transparent', border: '1px solid var(--line)' }}
        >
          {plan.cta}
        </button>
      )}
    </div>
  );
}

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            end: "top 50%",
            scrub: 1,
          },
        }
      );

      const cards = gridRef.current?.children;
      if (cards) {
        gsap.fromTo(
          cards,
          { y: 80, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.15,
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 80%",
              end: "top 40%",
              scrub: 1,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="pricing" className="py-24 lg:py-32" style={{ background: 'var(--bg)' }}>
      <div className="px-6 sm:px-12 lg:px-24 max-w-360 mx-auto">
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          <p
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              margin: '0 0 12px',
            }}
          >
            Pricing
          </p>
          <h2
            style={{
              fontFamily: 'var(--serif-display)',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 4.5vw, 3.6rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              margin: '0 0 8px',
            }}
          >
            Simple, <em>honest</em> pricing
          </h2>
          <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--ink-mid)' }}>
            Start for free. Upgrade when you're ready.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

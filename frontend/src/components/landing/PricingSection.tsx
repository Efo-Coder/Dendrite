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

function DashIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.25 }}>
      <path d="M4 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface PlanFeature {
  label: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  highlighted: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to get started.",
    cta: "Start for Free",
    highlighted: false,
    features: [
      { label: "Unlimited notes", included: true },
      { label: "Folders & Tags", included: true },
      { label: "Rich-Text editor", included: true },
      { label: "Public note sharing", included: true },
      { label: "Color Picker", included: false },
      { label: "Syntax Highlighting", included: false },
      { label: "Checklist Timer", included: false },
      { label: "Markdown export", included: false },
      { label: "Version history (5 versions)", included: true },
      { label: "PDF export", included: false },
      { label: "Priority support", included: false },
      { label: "Early access to new features", included: false },
    ],
  },
  {
    name: "Writer",
    price: "$5",
    period: "per month",
    description: "For people who write seriously.",
    cta: "Become a Writer",
    highlighted: true,
    features: [
      { label: "Unlimited notes", included: true },
      { label: "Folders & Tags", included: true },
      { label: "Rich-Text editor", included: true },
      { label: "Public note sharing", included: true },
      { label: "Color Picker", included: true },
      { label: "Syntax Highlighting", included: true },
      { label: "Checklist Timer", included: true },
      { label: "Markdown export", included: true },
      { label: "Version history (50 versions)", included: true },
      { label: "PDF export", included: false },
      { label: "Priority support", included: false },
      { label: "Early access to new features", included: false },
    ],
  },
  {
    name: "Author",
    price: "$129",
    period: "one-time",
    description: "Everything, forever. Pay once, own it.",
    cta: "Get Lifetime Access",
    highlighted: false,
    features: [
      { label: "Unlimited notes", included: true },
      { label: "Folders & Tags", included: true },
      { label: "Rich-Text editor", included: true },
      { label: "Public note sharing", included: true },
      { label: "Color Picker", included: true },
      { label: "Syntax Highlighting", included: true },
      { label: "Checklist Timer", included: true },
      { label: "Markdown export", included: true },
      { label: "Version history (unlimited)", included: true },
      { label: "PDF export", included: true },
      { label: "Priority support", included: true },
      { label: "Early access to new features", included: true },
    ],
  },
];

function PricingCard({ plan }: { plan: Plan }) {
  const navigate = useNavigate();
  const locked = IS_BETA && plan.name !== 'Free';

  if (plan.highlighted) {
    return (
      <div
        className="relative rounded-2xl p-5 md:p-6 lg:p-8 flex flex-col"
        data-locked={locked || undefined}
        style={{
          background: 'var(--bg-deep)',
          border: '1px solid var(--accent-deep)',
          boxShadow: '0 0 0 1px oklch(0.55 0.110 80 / 0.3), 0 8px 48px -8px oklch(0.78 0.110 85 / 0.18)',
          pointerEvents: locked ? 'none' : undefined,
        }}
      >
        {locked && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 'inherit', zIndex: 1, pointerEvents: 'none' }} />}
        {!IS_BETA && (
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
          <p className="text-sm font-serif italic mb-2" style={{ color: 'var(--accent)' }}>
            {plan.name}
          </p>
          <div className="flex items-end gap-1 mb-2">
            <span className="font-serif text-5xl tracking-tight" style={{ color: 'var(--ink)' }}>{plan.price}</span>
            <span className="text-sm mb-2" style={{ color: 'var(--ink-low)' }}>/{plan.period}</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--ink-mid)' }}>{plan.description}</p>
        </div>

        <ul className="flex-1 mb-8" style={{ borderTop: '1px solid var(--line-soft)' }}>
          {plan.features.map((feature) => (
            <li
              key={feature.label}
              className="flex items-center gap-3 text-sm py-2.5"
              style={{
                color: feature.included ? 'var(--ink)' : 'var(--ink-dim)',
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              {feature.included ? <CheckIcon /> : <DashIcon />}
              {feature.label}
            </li>
          ))}
        </ul>

        <button
          onClick={() => {
            sessionStorage.setItem('pending_plan', plan.name.toLowerCase());
            navigate('/register');
          }}
          className="w-full text-center text-sm font-medium cursor-pointer transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            background: 'var(--accent)',
            color: 'var(--bg-deep)',
            padding: '12px 24px',
            borderRadius: '9999px',
            fontFamily: 'inherit',
            border: 'none',
          }}
        >
          {plan.cta}
        </button>
      </div>
    );
  }

  const isAuthor = plan.name === 'Author';

  return (
    <div
      className="rounded-2xl p-5 md:p-6 lg:p-8 flex flex-col"
      data-locked={locked || undefined}
      style={{
        background: 'var(--surface)',
        border: isAuthor ? '1px solid oklch(0.55 0.110 80 / 0.3)' : '1px solid var(--line)',
        pointerEvents: locked ? 'none' : undefined,
        position: 'relative',
      }}
    >
      {locked && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 'inherit', zIndex: 1, pointerEvents: 'none' }} />}
      <div className="mb-8">
        <p
          className="text-sm font-serif italic mb-2"
          style={{ color: isAuthor ? 'var(--accent)' : 'var(--ink-low)' }}
        >
          {plan.name}
        </p>
        <div className="flex items-end gap-1 mb-2">
          <span className="font-serif text-5xl tracking-tight" style={{ color: 'var(--ink)' }}>
            {plan.price}
          </span>
          <span className="text-sm mb-2" style={{ color: 'var(--ink-low)' }}>/{plan.period}</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--ink-mid)' }}>{plan.description}</p>
      </div>

      <ul className="flex-1 mb-8" style={{ borderTop: '1px solid var(--line-soft)' }}>
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className="flex items-center gap-3 text-sm py-2.5"
            style={{
              color: feature.included ? 'var(--ink)' : 'var(--ink-dim)',
              borderBottom: '1px solid var(--line-soft)',
            }}
          >
            {feature.included ? <CheckIcon /> : <DashIcon />}
            {feature.label}
          </li>
        ))}
      </ul>

      {plan.name === 'Free' ? (
        <Link
          to="/register"
          className="fill-slide w-full text-center text-sm font-medium text-(--ink-mid) hover:text-(--ink) transition-colors duration-300"
          style={{ border: '1px solid var(--line)', padding: '12px 24px', borderRadius: '9999px', fontFamily: 'inherit', textDecoration: 'none', display: 'block' }}
        >
          {plan.cta}
        </Link>
      ) : (
        <button
          onClick={() => {
            sessionStorage.setItem('pending_plan', plan.name.toLowerCase());
            navigate('/register');
          }}
          className="fill-slide w-full text-center text-sm font-medium text-(--ink-mid) hover:text-(--ink) transition-colors duration-300 cursor-pointer"
          style={{ border: '1px solid var(--line)', padding: '12px 24px', borderRadius: '9999px', fontFamily: 'inherit', background: 'transparent' }}
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
          <h2
            className="text-4xl lg:text-5xl font-medium tracking-tight mb-4"
            style={{ color: 'var(--ink)' }}
          >
            Simple,{" "}
            <span className="font-serif italic">honest</span>{" "}
            pricing
          </h2>
          <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--ink-mid)' }}>
            Start for free. Upgrade when you're ready.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-4">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

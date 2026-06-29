"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ReactNode, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { plans, Plan } from "../../config/plans";
import PricingCard from "./PricingCard";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const IS_BETA = true;

const CTA_BASE = 'w-full text-center text-sm font-medium';
const CTA_STYLE = { padding: '12px 24px', borderRadius: '9999px' } as const;

export function PricingSection() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const renderFooter = (plan: Plan): ReactNode => {
    const goToRegister = () => {
      sessionStorage.setItem('pending_plan', plan.id);
      navigate('/register');
    };

    if (plan.id === 'free') {
      return (
        <Link
          to="/register"
          className={`btn-ghost-cta ${CTA_BASE}`}
          style={{ ...CTA_STYLE, fontFamily: 'inherit', border: '1px solid var(--line)', textDecoration: 'none', display: 'block' }}
        >
          {plan.cta}
        </Link>
      );
    }
    if (plan.highlighted) {
      return (
        <button onClick={goToRegister} className={`btn primary ${CTA_BASE}`} style={CTA_STYLE}>
          {plan.cta}
        </button>
      );
    }
    return (
      <button
        onClick={goToRegister}
        className={`btn-ghost-cta ${CTA_BASE} cursor-pointer`}
        style={{ ...CTA_STYLE, fontFamily: 'inherit', background: 'transparent', border: '1px solid var(--line)' }}
      >
        {plan.cta}
      </button>
    );
  };

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
            <PricingCard
              key={plan.id}
              plan={plan}
              locked={IS_BETA && plan.id !== 'free'}
              footer={renderFooter(plan)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

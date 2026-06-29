import { ReactNode } from 'react';
import { Plan } from '../../config/plans';

interface PricingCardProps {
  plan: Plan;
  // CTA area is owned by the caller: landing renders register links, the upgrade
  // modal renders current/available-soon states.
  footer: ReactNode;
  // Landing beta-gate: dims the card and shows an "Available soon" overlay.
  locked?: boolean;
  // Tighter spacing/price so all three cards (incl. CTA) fit inside the modal.
  compact?: boolean;
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--accent)' }}>
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PricingCard({ plan, footer, locked = false, compact = false }: PricingCardProps) {
  const isFree = plan.id === 'free';
  const isAuthor = plan.id === 'author';

  const padCls = compact ? 'p-6' : 'p-5 md:p-6 lg:p-8';
  const headMb = compact ? 'mb-5' : 'mb-8';
  const priceCls = compact ? 'text-4xl' : 'text-5xl';
  const listMb = compact ? 'mb-6' : 'mb-8';
  const featPy = compact ? 'py-2' : 'py-3';

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

  return (
    <div
      className={`relative rounded-2xl ${padCls} flex flex-col`}
      data-locked={locked || undefined}
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardGlow,
        pointerEvents: locked ? 'none' : undefined,
        zIndex: plan.highlighted ? 0 : 1,
      }}
    >
      {/* Beta lock layering: warm scrim (z2) dims the card content; the Recommended badge and
          the "Available soon" status (z3) stay legible above the scrim. */}
      {locked && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'oklch(0.09 0.015 70 / 0.55)',
            borderRadius: 'inherit',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      )}

      {locked && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center" style={{ zIndex: 3 }}>
          <span
            className="inline-flex items-center whitespace-nowrap rounded-full px-4 py-1.5"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              border: '1px solid color-mix(in oklch, var(--accent) 35%, transparent)',
              background: 'linear-gradient(180deg, var(--surface-hi), var(--surface))',
              boxShadow: '0 4px 16px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.07)',
            }}
          >
            Available soon
          </span>
        </div>
      )}

      {plan.highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2" style={{ zIndex: 3 }}>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-serif italic whitespace-nowrap"
            style={{ background: 'var(--accent)', color: 'var(--bg-deep)' }}
          >
            Recommended
          </span>
        </div>
      )}

      <div className={headMb}>
        <p className="text-base italic mb-2" style={{ color: nameColor, fontFamily: 'var(--serif-display)' }}>
          {plan.name}
        </p>
        <div className="flex items-end gap-1 mb-2">
          <span className={`font-serif ${priceCls} tracking-tight`} style={{ color: 'var(--ink)' }}>{plan.price}</span>
          <span className="text-sm mb-2" style={{ color: 'var(--ink-low)' }}>/{plan.period}</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--ink-mid)' }}>{plan.description}</p>
      </div>

      <ul className={`flex-1 ${listMb}`} style={{ borderTop: '1px solid var(--line-soft)' }}>
        {plan.inheritsFrom && (
          <li className="pt-4 pb-1 text-sm italic" style={{ color: 'var(--ink-mid)', fontFamily: 'var(--serif-display)' }}>
            Everything in {plan.inheritsFrom}, plus
          </li>
        )}
        {plan.features.map((feature) => (
          <li key={feature.label} className={`flex items-start gap-3 ${featPy}`}>
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

      {footer}
    </div>
  );
}

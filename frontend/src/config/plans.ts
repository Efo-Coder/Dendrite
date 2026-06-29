// Shared plan catalogue used by the landing PricingSection and the in-app
// UpgradePlansModal so both render from a single source of truth.

export type PlanId = 'free' | 'writer' | 'author';

export interface PlanFeatureItem {
  label: string;
  description?: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  inheritsFrom?: string;
  features: PlanFeatureItem[];
  cta: string;
  highlighted: boolean;
}

// Low → high; drives upgrade/downgrade comparisons.
export const PLAN_ORDER: PlanId[] = ['free', 'writer', 'author'];

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: 'forever',
    description: 'Everything you need to get started.',
    cta: 'Start writing',
    highlighted: false,
    features: [
      { label: 'Unlimited notes', description: 'No limits, ever' },
      { label: 'Folders & tags', description: 'Organise your way' },
      { label: 'Rich-text editor', description: 'Headings, lists, links' },
      { label: 'Public sharing', description: 'Share via link' },
      { label: '5 saved versions', description: 'Undo recent edits' },
    ],
  },
  {
    id: 'writer',
    name: 'Writer',
    price: '€10',
    period: 'per month',
    description: 'For people who write seriously.',
    inheritsFrom: 'Free',
    cta: 'Become a Writer',
    highlighted: true,
    features: [
      { label: 'Color picker', description: 'Custom note colours' },
      { label: 'Syntax highlighting', description: 'Themed code blocks' },
      { label: 'Checklist timer', description: 'Time your tasks' },
      { label: 'Markdown export', description: 'Export as Markdown' },
      { label: '10 saved versions', description: 'Keep more history' },
    ],
  },
  {
    id: 'author',
    name: 'Author',
    price: '€120',
    period: 'one-time',
    description: 'Everything, forever. Pay once, own it.',
    inheritsFrom: 'Writer',
    cta: 'Write for life',
    highlighted: false,
    features: [
      { label: 'PDF export', description: 'Print-ready PDFs' },
      { label: 'Priority support', description: 'Front-of-queue help' },
      { label: 'Early access', description: 'New features first' },
      { label: 'Unlimited version history', description: 'Every edit, kept' },
    ],
  },
];

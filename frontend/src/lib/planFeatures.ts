export type PlanFeature =
  | 'timerChecklist'
  | 'syntaxHighlighting'
  | 'markdownExport'
  | 'htmlExport'
  | 'copyMarkdown'
  | 'pdfExport'
  | 'colorFavorites'
  | 'customColor';

const WRITER_FEATURES = new Set<PlanFeature>([
  'timerChecklist',
  'syntaxHighlighting',
  'markdownExport',
  'htmlExport',
  'copyMarkdown',
  'colorFavorites',
  'customColor',
]);

const AUTHOR_FEATURES = new Set<PlanFeature>([
  ...WRITER_FEATURES,
  'pdfExport',
]);

export function canAccess(plan: string | undefined | null, feature: PlanFeature): boolean {
  const p = (plan || 'free').toLowerCase();
  if (p === 'author') return AUTHOR_FEATURES.has(feature);
  if (p === 'writer') return WRITER_FEATURES.has(feature);
  return false;
}

export function requiredPlan(feature: PlanFeature): 'Writer' | 'Author' {
  return feature === 'pdfExport' ? 'Author' : 'Writer';
}

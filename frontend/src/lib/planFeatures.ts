export type PlanFeature =
  | 'timerChecklist'
  | 'syntaxHighlighting'
  | 'markdownExport'
  | 'htmlExport'
  | 'copyMarkdown'
  | 'pdfExport'
  | 'colorFavorites'
  | 'customColor'
  | 'versionHistory'
  | 'aiSummarize';

const WRITER_FEATURES = new Set<PlanFeature>([
  'timerChecklist',
  'syntaxHighlighting',
  'markdownExport',
  'htmlExport',
  'copyMarkdown',
  'pdfExport',
  'colorFavorites',
  'customColor',
  'versionHistory',
  'aiSummarize',
]);

const AUTHOR_FEATURES = new Set<PlanFeature>([
  ...WRITER_FEATURES,
]);

export function canAccess(plan: string | undefined | null, feature: PlanFeature): boolean {
  const p = (plan || 'free').toLowerCase();
  if (p === 'author') return AUTHOR_FEATURES.has(feature);
  if (p === 'writer') return WRITER_FEATURES.has(feature);
  return false;
}

export function requiredPlan(_feature: PlanFeature): 'Writer' {
  return 'Writer';
}

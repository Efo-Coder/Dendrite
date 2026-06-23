export type CardViewMode = 'tile' | 'small' | 'list';

// Grid container class for a view mode (tile = the default, unmodified grid).
export const gridClassFor = (view: CardViewMode) =>
  `home-card-grid${view === 'small' ? ' small' : view === 'list' ? ' list' : ''}`;

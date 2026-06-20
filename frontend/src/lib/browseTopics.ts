// Curated discovery categories offered in the publish dialog and Browse filters.
// Stored free-form on PublishedNote.topics[], so this list can grow without a
// migration — the backend never enforces a fixed set.
export const BROWSE_TOPICS = [
  'Learning',
  'Technology',
  'Programming',
  'Philosophy',
  'Design',
  'Business',
  'Productivity',
  'Science',
] as const;

export type BrowseTopic = (typeof BROWSE_TOPICS)[number];

// Curated discovery categories offered in the publish dialog and Explore filters.
// Stored free-form on PublishedNote.topics[], so this list can grow without a
// migration — the backend never enforces a fixed set.
export const EXPLORE_TOPICS = [
  'Learning',
  'Technology',
  'Programming',
  'Philosophy',
  'Design',
  'Business',
  'Productivity',
  'Science',
] as const;

export type ExploreTopic = (typeof EXPLORE_TOPICS)[number];

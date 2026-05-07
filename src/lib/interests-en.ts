/**
 * StoryMagic English — Interests
 *
 * 23 interests that describe WHAT a child loves.
 * Selected by the parent during the wizard (max 5).
 * Used by the curation engine to filter and rank stories.
 *
 * Animals are split into specific sub-interests because granularity
 * dramatically improves story matching. A horse-loving child should see
 * horse stories before generic animal stories.
 */

export interface Interest {
  id: string;
  label: string;
  emoji: string;
  group: 'animals' | 'world' | 'creative' | 'imagination' | 'activity';
}

export const INTERESTS: Interest[] = [
  // Animals (split for better matching)
  { id: 'dogs',                   label: 'Dogs',                   emoji: '🐕', group: 'animals' },
  { id: 'cats',                   label: 'Cats',                   emoji: '🐈', group: 'animals' },
  { id: 'horses',                 label: 'Horses',                 emoji: '🐴', group: 'animals' },
  { id: 'wild_and_sea_animals',   label: 'Wild & Sea Animals',     emoji: '🦁', group: 'animals' },

  // World & exploration
  { id: 'space_and_stars',        label: 'Space & Stars',          emoji: '🚀', group: 'world' },
  { id: 'nature_and_gardens',     label: 'Nature & Gardens',       emoji: '🌿', group: 'world' },
  { id: 'travel_and_cultures',    label: 'Travel & Cultures',      emoji: '🌍', group: 'world' },
  { id: 'science_and_how_things_work', label: 'Science & How Things Work', emoji: '🔬', group: 'world' },
  { id: 'mystery_and_puzzles',    label: 'Mystery & Puzzles',      emoji: '🔍', group: 'world' },

  // Creative
  { id: 'art_and_creativity',     label: 'Art & Creativity',       emoji: '🎨', group: 'creative' },
  { id: 'music',                  label: 'Music',                  emoji: '🎵', group: 'creative' },
  { id: 'dance_and_performance',  label: 'Dance & Performance',    emoji: '💃', group: 'creative' },
  { id: 'cooking_and_food',       label: 'Cooking & Food',         emoji: '🍳', group: 'creative' },
  { id: 'building_and_inventing', label: 'Building & Inventing',   emoji: '🛠️', group: 'creative' },

  // Imagination
  { id: 'fairy_tales_and_magic',  label: 'Fairy Tales & Magic',    emoji: '🧚', group: 'imagination' },
  { id: 'pirates_and_adventure',  label: 'Pirates & Adventure',    emoji: '🏴‍☠️', group: 'imagination' },
  { id: 'princesses_and_royalty', label: 'Princesses & Royalty',   emoji: '👑', group: 'imagination' },
  { id: 'superheroes',            label: 'Superheroes',            emoji: '🦸', group: 'imagination' },
  { id: 'dinosaurs',              label: 'Dinosaurs',              emoji: '🦖', group: 'imagination' },

  // Activity
  { id: 'sports',                 label: 'Sports',                 emoji: '⚽', group: 'activity' },
  { id: 'vehicles',               label: 'Trains, Cars & Trucks',  emoji: '🚂', group: 'activity' },
  { id: 'friendship',             label: 'Friendship',             emoji: '🫂', group: 'activity' },
  { id: 'family',                 label: 'Family',                 emoji: '👨‍👩‍👧', group: 'activity' },
  { id: 'bedtime_stories',        label: 'Bedtime Stories',        emoji: '🌙', group: 'activity' },
];

export function getInterestById(id: string): Interest | undefined {
  return INTERESTS.find((i) => i.id === id);
}

export function getInterestsByGroup(group: Interest['group']): Interest[] {
  return INTERESTS.filter((i) => i.group === group);
}

export function getInterestsByIds(ids: string[]): Interest[] {
  return ids.map((id) => getInterestById(id)).filter((i): i is Interest => i !== undefined);
}

// All interest IDs that exist in the catalog (used for validation in tests)
export const ALL_INTEREST_IDS = INTERESTS.map((i) => i.id);

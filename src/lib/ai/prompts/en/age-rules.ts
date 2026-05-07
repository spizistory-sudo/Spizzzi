/**
 * StoryMagic English — Age Rules
 *
 * Per-age-bucket rules for story length, vocabulary, and complexity.
 * These are passed into the generation prompt so Claude calibrates correctly.
 *
 * The buckets are 3-5 / 5-7 / 7-9 / 9-12. Boundary ages (5, 7, 9) get the
 * younger bucket's rules — this is intentional. A 5-year-old should get a
 * "younger 5" story rather than be pushed into older territory.
 */

export interface AgeRules {
  bucket: '3-5' | '6-7' | '8-9' | '10-12';
  spread_count: { min: number; max: number };
  words_per_spread: { min: number; max: number };
  sentence_complexity: string;
  vocabulary_level: string;
  conflict_complexity: string;
  pov_options: ('first_person' | 'third_person' | 'second_person')[];
  dialogue_allowed: boolean;
  internal_thoughts: boolean;
  subplots: boolean;
  endings: string;
}

export function getAgeRules(age: number): AgeRules {
  if (age >= 3 && age <= 5) {
    return {
      bucket: '3-5',
      spread_count: { min: 6, max: 8 },
      words_per_spread: { min: 25, max: 45 },
      sentence_complexity: 'Simple sentences. One idea per sentence. Repetition and rhythm where natural — not forced rhyme.',
      vocabulary_level: 'Words a 4-year-old uses. Concrete, sensory. Avoid abstract words like "perspective", "consider", "achievement".',
      conflict_complexity: 'A single concrete problem (something lost, something broken, something new and scary). No moral dilemmas.',
      pov_options: ['third_person'],
      dialogue_allowed: true,
      internal_thoughts: false,
      subplots: false,
      endings: 'Direct emotional resolution. The feeling lands. The child is held. No moral tacked on.',
    };
  }

  if (age >= 6 && age <= 7) {
    return {
      bucket: '6-7',
      spread_count: { min: 8, max: 10 },
      words_per_spread: { min: 45, max: 80 },
      sentence_complexity: 'Mostly simple, some compound. Dialogue introduced. Show actions in sequence.',
      vocabulary_level: 'Vocabulary of a kindergarten/first-grader. Can include slightly less common words if context makes them clear.',
      conflict_complexity: 'Layered or cumulative conflicts (several small things, or one thing that grows). Resolution involves the child\'s own action.',
      pov_options: ['third_person'],
      dialogue_allowed: true,
      internal_thoughts: true,
      subplots: false,
      endings: 'Resolution earned by the child. Not a lecture, not an apology — a feeling, a choice, a moment of connection.',
    };
  }

  if (age >= 8 && age <= 9) {
    return {
      bucket: '8-9',
      spread_count: { min: 10, max: 12 },
      words_per_spread: { min: 80, max: 130 },
      sentence_complexity: 'Mix of simple and complex sentences. Real dialogue with rhythm. Internal thoughts woven in.',
      vocabulary_level: 'Rich vocabulary. Can stretch the reader slightly with a few unfamiliar words in clear context.',
      conflict_complexity: 'Real complexity: conflicting feelings, moral weight, situations where both sides have a point.',
      pov_options: ['first_person', 'third_person'],
      dialogue_allowed: true,
      internal_thoughts: true,
      subplots: true,
      endings: 'Resolution can be ambiguous. The child changes in a small but real way. Honor the complexity rather than tidy it.',
    };
  }

  // 10-12
  return {
    bucket: '10-12',
    spread_count: { min: 12, max: 16 },
    words_per_spread: { min: 130, max: 220 },
    sentence_complexity: 'Sophisticated, varied. Long and short sentences. Mature voice without losing warmth.',
    vocabulary_level: 'Rich, real. Treat the reader as someone who is becoming a reader of real books.',
    conflict_complexity: 'Genuine moral, emotional, or social complexity. The right answer is sometimes unclear. The child grows through choice.',
    pov_options: ['first_person', 'third_person'],
    dialogue_allowed: true,
    internal_thoughts: true,
    subplots: true,
    endings: 'Real, earned, sometimes quietly bittersweet. The child carries something forward. Not all questions answered.',
  };
}

/**
 * Convert age rules to a prompt fragment that's clear and concrete for Claude.
 */
export function ageRulesToPromptFragment(rules: AgeRules): string {
  return `# Age-appropriate writing rules (bucket: ages ${rules.bucket})

- Number of spreads: ${rules.spread_count.min}-${rules.spread_count.max}
- Words per spread: ${rules.words_per_spread.min}-${rules.words_per_spread.max}
- Sentence complexity: ${rules.sentence_complexity}
- Vocabulary: ${rules.vocabulary_level}
- Conflict: ${rules.conflict_complexity}
- Point of view: ${rules.pov_options.join(' or ')}
- Dialogue: ${rules.dialogue_allowed ? 'yes' : 'no'}
- Internal thoughts: ${rules.internal_thoughts ? 'yes, where it deepens the story' : 'avoid — show through action'}
- Subplots: ${rules.subplots ? 'allowed' : 'no — keep one storyline'}
- Endings: ${rules.endings}`;
}

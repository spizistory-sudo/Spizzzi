/**
 * Catalog verification — runs at build time to catch problems early.
 * - Every story references a valid category
 * - Every story's traits/interests reference real IDs
 * - Age ranges are sensible (min <= sweet_spot <= max)
 * - No duplicate story IDs
 */

import { STORIES, CATEGORIES, getCategoryById } from '../src/lib/ai/prompts/en/story-catalog';
import { PERSONALITY_TRAITS } from '../src/lib/personality-traits-en';
import { ALL_INTEREST_IDS } from '../src/lib/interests-en';

const errors: string[] = [];
const warnings: string[] = [];

const validTraitIds = new Set(PERSONALITY_TRAITS.map((t) => t.id));
const validInterestIds = new Set(ALL_INTEREST_IDS);
const validCategoryIds = new Set(CATEGORIES.map((c) => c.id));

// Duplicate IDs
const seenStoryIds = new Set<string>();
for (const story of STORIES) {
  if (seenStoryIds.has(story.id)) {
    errors.push(`Duplicate story ID: ${story.id}`);
  }
  seenStoryIds.add(story.id);
}

// Per-story validation
for (const story of STORIES) {
  // Category exists
  if (!validCategoryIds.has(story.category_id)) {
    errors.push(`Story "${story.id}" references unknown category: ${story.category_id}`);
  }

  // Age sanity
  if (story.age_min > story.age_max) {
    errors.push(`Story "${story.id}": age_min (${story.age_min}) > age_max (${story.age_max})`);
  }
  if (story.age_sweet_spot < story.age_min || story.age_sweet_spot > story.age_max) {
    errors.push(
      `Story "${story.id}": age_sweet_spot (${story.age_sweet_spot}) outside [${story.age_min}, ${story.age_max}]`
    );
  }

  // Traits exist
  for (const trait of story.best_traits) {
    if (!validTraitIds.has(trait)) {
      errors.push(`Story "${story.id}" references unknown trait: ${trait}`);
    }
  }

  // Interests exist
  for (const interest of story.interests) {
    if (!validInterestIds.has(interest)) {
      errors.push(`Story "${story.id}" references unknown interest: ${interest}`);
    }
  }

  // Required fields not empty
  if (!story.title.trim()) errors.push(`Story "${story.id}" has empty title`);
  if (!story.description.trim()) errors.push(`Story "${story.id}" has empty description`);
  if (!story.premise.trim()) errors.push(`Story "${story.id}" has empty premise`);
  if (story.required_beats.length === 0) {
    warnings.push(`Story "${story.id}" has no required_beats`);
  }
}

// Summary stats
const categoryCounts = new Map<string, number>();
for (const story of STORIES) {
  categoryCounts.set(story.category_id, (categoryCounts.get(story.category_id) ?? 0) + 1);
}

const ageBucketCounts = { '3-5': 0, '5-7': 0, '7-9': 0, '9-12': 0 };
for (const story of STORIES) {
  if (story.age_sweet_spot <= 5) ageBucketCounts['3-5']++;
  else if (story.age_sweet_spot <= 7) ageBucketCounts['5-7']++;
  else if (story.age_sweet_spot <= 9) ageBucketCounts['7-9']++;
  else ageBucketCounts['9-12']++;
}

// Report
console.log('=== Catalog Verification ===');
console.log(`Total stories: ${STORIES.length}`);
console.log(`Total categories: ${CATEGORIES.length}`);
console.log(`Total traits: ${PERSONALITY_TRAITS.length}`);
console.log(`Total interests: ${ALL_INTEREST_IDS.length}`);
console.log('');
console.log('Stories per category:');
for (const cat of CATEGORIES) {
  const count = categoryCounts.get(cat.id) ?? 0;
  console.log(`  ${cat.emoji} ${cat.name}: ${count}`);
}
console.log('');
console.log('Stories per age bucket (by sweet spot):');
for (const [bucket, count] of Object.entries(ageBucketCounts)) {
  console.log(`  ages ${bucket}: ${count}`);
}
console.log('');

if (warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} warnings:`);
  warnings.forEach((w) => console.log(`  - ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log(`❌ ${errors.length} errors:`);
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
} else {
  console.log('✅ Catalog is internally consistent.');
}

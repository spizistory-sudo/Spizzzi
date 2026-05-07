/**
 * StoryMagic English — Story Curation
 *
 * Given a child's profile (age, gender, traits, interests), this module asks
 * Claude to rank the catalog and return the top-fit stories grouped by category.
 *
 * Why AI curation instead of rule-based scoring:
 *   - Claude can reason about WHY a story fits, not just match tags
 *   - As the catalog grows, no manual scoring weight tuning needed
 *   - Better handling of edge cases (e.g. a "shy + brave" child — those can
 *     coexist; a rule-based system would struggle to weigh them)
 *
 * Cost: ~$0.005-0.01 per call using Haiku 4.5. Acceptable for an action that
 * happens once per book creation.
 */

import Anthropic from '@anthropic-ai/sdk';
import { STORIES, CATEGORIES, StoryTemplate, CategoryDefinition } from '@/lib/ai/prompts/en/story-catalog';
import { getTraitsByIds } from '@/lib/personality-traits-en';
import { getInterestsByIds } from '@/lib/interests-en';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ChildProfile {
  name: string;
  age: number;                // 3-12
  gender: 'boy' | 'girl' | 'nonbinary';
  traits: string[];           // trait IDs (max 4)
  interests: string[];        // interest IDs (max 5)
}

export interface StoryRecommendation {
  story_id: string;
  score: number;              // 0-100
  reason: string;             // One sentence: why this fits THIS child
}

export interface CategoryRecommendation {
  category_id: string;
  category_name: string;
  category_emoji: string;
  fit_label: 'perfect_match' | 'great_fit' | 'good_fit' | 'fits';
  stories: StoryRecommendation[];
}

export interface CurationResult {
  top_picks: StoryRecommendation[];     // Top 8 across all categories
  by_category: CategoryRecommendation[]; // Full breakdown
  all_stories_ranked: StoryRecommendation[]; // For "see all" view
}

// -----------------------------------------------------------------------------
// THE CURATION PROMPT
// -----------------------------------------------------------------------------

/**
 * Builds the system prompt for the curator.
 * This is sent once per request and tells Claude how to think about fit.
 */
const CURATION_SYSTEM_PROMPT = `You are a children's librarian for StoryMagic, a personalized children's book platform. A parent has shared details about their child. Your job is to recommend stories from our catalog that will feel as if they were written specifically for this child.

You are not a generic recommender. You think like a librarian who has met the child:
- A 4-year-old who loves horses needs different stories than a 4-year-old who loves dinosaurs.
- A sensitive child needs stories that honor depth, not slapstick.
- A child between two age buckets (e.g. age 5) needs stories that work for them now, not stories aimed at much younger or older kids.
- A shy child can still want a brave-protagonist story — sometimes especially.

# How to score (0-100)

For each story, score it on FIT for this specific child. Think about:

**Age fit (heaviest factor)**
- Sweet spot match: age within 1 year of sweet_spot = strong fit
- Within range: ages within [age_min, age_max] = acceptable
- Outside range: do not recommend (score 0-20)

**Trait resonance**
- Does this story shine because of who this child is?
- A persistent child + a "try again after failing" story = chef's kiss
- A gentle child + a quiet animal story = perfect
- A loud playful child + a meditative bedtime walk = mismatch (still okay, lower score)

**Interest alignment**
- Direct interest hit (story.interests includes one of child's interests) = significant boost
- A child who chose "horses" should see horse stories before generic animal stories
- Multiple interest hits = even better

**Gender fit**
- Most stories are gender-neutral ("any")
- A "girl_lean" or "boy_lean" story for the opposite gender is fine but slightly lower
- Never exclude a story purely on gender

**Emotional appropriateness**
- A sensitive child should not be steered toward harsh stories
- A brave child can handle quieter stories — variety is good
- Match energy to what feels right for who this child is

# How to decide fit_label per category

For each category, look at the highest-scoring story in that category:
- Highest story scores 90+ = "perfect_match"
- Highest story scores 75-89 = "great_fit"
- Highest story scores 60-74 = "good_fit"
- Highest story scores 40-59 = "fits"
- Below 40 = don't include category in recommendations

# Output format

Return ONLY valid JSON. No prose before or after. Structure:

{
  "all_stories_ranked": [
    { "story_id": "...", "score": 92, "reason": "Specific 1-sentence reason this fits the child by name" },
    ...
  ]
}

Score every story in the catalog. Reasons should be concrete and reference the child by name. Avoid generic praise. Bad: "This is a great story for kids." Good: "Emma's love of horses + gentle nature makes this a perfect fit."

Important rules:
- Score every single story in the catalog. Do not skip any.
- Reasons must be 1 sentence, max 20 words.
- Reasons should reference the child by name and at least one trait or interest.
- Be honest. If a story is a poor fit, say so quietly with a low score.`;

// -----------------------------------------------------------------------------
// THE USER MESSAGE BUILDER
// -----------------------------------------------------------------------------

function buildUserMessage(child: ChildProfile): string {
  const traits = getTraitsByIds(child.traits);
  const interests = getInterestsByIds(child.interests);

  // Compact catalog representation for the prompt
  const catalogSummary = STORIES.map((s) => ({
    id: s.id,
    category: s.category_id,
    title: s.title,
    description: s.description,
    age_min: s.age_min,
    age_max: s.age_max,
    age_sweet_spot: s.age_sweet_spot,
    gender_fit: s.gender_fit,
    best_traits: s.best_traits,
    interests: s.interests,
    energy: s.energy,
    why_it_works: s.why_it_works,
  }));

  return `# This child

Name: ${child.name}
Age: ${child.age}
Gender: ${child.gender}

Personality traits selected by the parent:
${traits.map((t) => `- ${t.label}: ${t.description}`).join('\n')}

Interests selected by the parent:
${interests.map((i) => `- ${i.label}`).join('\n')}

# The catalog

${JSON.stringify(catalogSummary, null, 2)}

# Your task

Score every story 0-100 for fit with ${child.name}. Return JSON as specified. No prose outside the JSON.`;
}

// -----------------------------------------------------------------------------
// THE CURATION CALL
// -----------------------------------------------------------------------------

/**
 * Get curated story recommendations for a child.
 *
 * Uses Claude Haiku 4.5 for cost efficiency. Curation is a low-stakes ranking
 * task — Haiku is plenty smart for it.
 */
export async function curateStoriesForChild(
  child: ChildProfile,
  apiKey: string
): Promise<CurationResult> {
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8000,
    system: CURATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(child) }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();

  let parsed: { all_stories_ranked: StoryRecommendation[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse curation response. Raw text:', text.slice(0, 500));
    throw new Error('Curation response was not valid JSON');
  }

  if (!parsed.all_stories_ranked || !Array.isArray(parsed.all_stories_ranked)) {
    throw new Error('Curation response missing all_stories_ranked array');
  }

  return assembleCurationResult(parsed.all_stories_ranked);
}

// -----------------------------------------------------------------------------
// RESULT ASSEMBLY
// -----------------------------------------------------------------------------

/**
 * Takes Claude's flat ranked list and structures it for the UI:
 *   - top_picks: top 8 across all categories
 *   - by_category: grouped, with fit_label per category
 *   - all_stories_ranked: full list for "see all"
 */
function assembleCurationResult(ranked: StoryRecommendation[]): CurationResult {
  // Sort all stories by score descending
  const sortedAll = [...ranked].sort((a, b) => b.score - a.score);

  // Top 8 for the curated view
  const top_picks = sortedAll.slice(0, 8);

  // Group by category, keep only stories scoring 40+ for the "by_category" view
  const byCategory = new Map<string, StoryRecommendation[]>();
  for (const rec of sortedAll) {
    if (rec.score < 40) continue;

    const story = STORIES.find((s) => s.id === rec.story_id);
    if (!story) continue;

    if (!byCategory.has(story.category_id)) byCategory.set(story.category_id, []);
    byCategory.get(story.category_id)!.push(rec);
  }

  // Build CategoryRecommendation list, ordered by best-story-in-category
  const by_category: CategoryRecommendation[] = [];
  for (const cat of CATEGORIES) {
    const stories = byCategory.get(cat.id);
    if (!stories || stories.length === 0) continue;

    const topScore = stories[0].score;
    let fit_label: CategoryRecommendation['fit_label'];
    if (topScore >= 90) fit_label = 'perfect_match';
    else if (topScore >= 75) fit_label = 'great_fit';
    else if (topScore >= 60) fit_label = 'good_fit';
    else fit_label = 'fits';

    by_category.push({
      category_id: cat.id,
      category_name: cat.name,
      category_emoji: cat.emoji,
      fit_label,
      stories: stories.slice(0, 5), // Show top 5 per category
    });
  }

  // Sort categories by their top story's score
  by_category.sort((a, b) => b.stories[0].score - a.stories[0].score);

  return {
    top_picks,
    by_category,
    all_stories_ranked: sortedAll,
  };
}

// -----------------------------------------------------------------------------
// FALLBACK: deterministic curation if Claude is unavailable
// -----------------------------------------------------------------------------

/**
 * If the AI curation call fails (rate limit, timeout, etc.), fall back to
 * a simple rule-based scorer so the user still gets recommendations.
 *
 * This is intentionally less sophisticated than the AI version — it's a safety net.
 */
export function curateStoriesFallback(child: ChildProfile): CurationResult {
  const ranked: StoryRecommendation[] = STORIES.map((story) => {
    let score = 50;

    // Age fit
    if (child.age < story.age_min || child.age > story.age_max) {
      score = 10;
    } else {
      const distance = Math.abs(child.age - story.age_sweet_spot);
      score += distance === 0 ? 25 : distance === 1 ? 15 : 5;
    }

    // Trait overlap
    const traitMatches = story.best_traits.filter((t) => child.traits.includes(t)).length;
    score += traitMatches * 8;

    // Interest overlap
    const interestMatches = story.interests.filter((i) => child.interests.includes(i)).length;
    score += interestMatches * 10;

    // Gender fit
    if (story.gender_fit !== 'any') {
      const childGender = child.gender === 'boy' ? 'boy_lean' : child.gender === 'girl' ? 'girl_lean' : null;
      if (childGender && story.gender_fit !== childGender) {
        score -= 5;
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      story_id: story.id,
      score,
      reason: `${child.name} (age ${child.age}) — fit based on age and interests`,
    };
  });

  return assembleCurationResult(ranked);
}

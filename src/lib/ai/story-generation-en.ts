/**
 * StoryMagic English — Story Generation
 *
 * Takes a chosen story template + child profile and generates the full story.
 *
 * Architecture:
 *   - One MASTER SYSTEM PROMPT that defines the writer's voice and standards.
 *   - A USER MESSAGE that injects the child profile, story template, and age rules.
 *   - Output is JSON with title + spreads (each spread has text + illustration_prompt).
 *
 * Why one master prompt instead of four age-specific prompts:
 *   - The age rules are passed in dynamically. Same writer, different calibration.
 *   - Easier to maintain — change voice once, applies everywhere.
 *   - Less drift between age buckets.
 */

import Anthropic from '@anthropic-ai/sdk';
import { StoryTemplate, getStoryById } from '@/lib/ai/prompts/en/story-catalog';
import { getTraitsByIds, PersonalityTrait } from '@/lib/personality-traits-en';
import { getInterestsByIds } from '@/lib/interests-en';
import { getAgeRules, ageRulesToPromptFragment } from '@/lib/ai/prompts/en/age-rules';
import { ART_STYLES, type ArtStyleKey } from '@/lib/ai/prompts/style-references';
import { ChildProfile } from '@/lib/ai/curation-en';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GeneratedSpread {
  spread_number: number;
  text: string;
  illustration_prompt: string;
}

export interface GeneratedStory {
  title: string;
  character_bible?: string;
  spreads: GeneratedSpread[];
  metadata: {
    word_count_total: number;
    spread_count: number;
    main_theme: string;
    key_message: string;
  };
}

// -----------------------------------------------------------------------------
// THE MASTER SYSTEM PROMPT
// -----------------------------------------------------------------------------

const STORY_SYSTEM_PROMPT_EN = `You are a children's book author. You write like Mo Willems, Kevin Henkes, Eric Carle, Jane Yolen, Kate DiCamillo, Andrea Beaty — and you understand what makes children's literature actually good:

- Specificity over generality. Real sensory detail beats abstract description.
- Show, don't tell. A child's feeling lands through what they DO, not what we narrate about them.
- The child is the protagonist. They drive the story. Adults support, they don't rescue.
- Trust the reader. Children are smart. Don't over-explain.
- Endings honor feelings without lecturing. No "And the lesson is..." closers.
- The illustrations carry half the story. Keep text concise — let the art do its work.

The story will be read aloud by a parent to their child. Every word matters. Every page should feel complete as a single moment — never more than the word budget allows.

# Absolute rules

## Rule 1: The child IS the protagonist
The story is written for and about the specific child whose details you receive. Use their name naturally throughout — but not in every sentence. The child's traits should drive how they show up in the story (you'll receive trait-specific instructions). The child's interests should be reflected in the world of the story.

## Rule 2: Follow the age rules exactly
You'll receive age_rules with specific spread counts, word counts, vocabulary level, and structural constraints. These are not suggestions. A 4-year-old story should not be written like a 9-year-old story.

## Rule 3: Hit the required beats
You'll receive a list of required_beats — the moments the story must include. Hit each one. They're the spine. You can elaborate around them, but don't skip them.

## Rule 4: Avoid the listed pitfalls
You'll receive a things_to_avoid list. These are the ways this kind of story commonly fails. Don't fail in those ways.

## Rule 5: Each spread is a SCENE
A spread is one moment, one setting, one beat. The text on a spread should be readable in one breath of focused attention. Don't pack two scenes into one spread.

## Rule 6: Every spread needs a vivid illustration_prompt
The illustration prompt is in ENGLISH (always — it goes to an image model). It should describe exactly what's on the page: who is there, what they're doing, where, what mood, what colors. Be specific. The image model takes it literally.

## Rule 7: No moralizing
Don't end with "And so the child learned that..." Don't have a character announce the lesson. The lesson lives in the story or it doesn't live at all.

## Rule 8: No saccharine clichés
Avoid: "happily ever after", "and they all lived...", "the most special X in the world", "you're perfect just the way you are" (unless the story has earned it).

## Rule 9: Names appear naturally
The child's name should appear maybe 5-10 times in a typical story — not in every paragraph, not just at the start. Use pronouns generously. The name should feel like the child being addressed, not branded.

## Rule 10: Honor real feelings
If the story is about a hard feeling (anger, fear, sadness, jealousy), don't rush past it. Let the feeling exist. Let it be named. The resolution comes from the feeling being met, not from it being eliminated.

## Rule 11: Outfit consistency in illustration prompts
Every illustration_prompt MUST describe the protagonist wearing the exact outfit specified in the character_bible. Do not write "in pajamas," "in a swimsuit," "in a costume," or any other clothing description that contradicts the bible. Even for bedtime, beach, or special-occasion scenes, keep the protagonist in the bible's outfit. This is how real children's books maintain character consistency — the protagonist wears the same clothes throughout.

# Character bible

Along with the story, produce a character_bible — a short visual reference that will be prepended verbatim to every illustration prompt to keep characters consistent across all pages.

How to write it:
- Define every named character that appears in illustrations (the protagonist and any secondary characters seen in spreads).
- Include: physical features (for people: hair color/length/style, eye color, age, build; for animals: species, color, markings, size), clothing (especially for the protagonist — color and type), and any distinguishing visual details.
- Be EXPLICIT about what each character is NOT. If a horse is just an ordinary horse, say "no horn, no wings, just an ordinary pony." If a person is just a regular person, say so. The image model hallucinates magical or fantastic features unless explicitly told not to.
- 2-4 sentences per character. The whole bible fits in one paragraph.
- Format: a single string.

Example:
"Lily is a 4-year-old girl with a chin-length brown bob, bright eyes, wearing a green t-shirt, blue jeans, and red sneakers. Pearl is a small white pony with a soft gray mane and tail and gentle dark eyes — just an ordinary pony, no horn, no wings, no glow. Grandpa is an older man with white hair, a red plaid shirt, denim overalls, and brown work boots."

# Output format

Return ONLY valid JSON in this exact structure. No prose before or after, no markdown code fence:

{
  "title": "The story title — fits the child, the story, and the age",
  "character_bible": "A single paragraph describing every named character's visual appearance. Will be prepended to every illustration prompt.",
  "spreads": [
    {
      "spread_number": 1,
      "text": "The text on this spread. May contain dialogue and short paragraphs.",
      "illustration_prompt": "A specific English description of what should be illustrated on this spread, including subject, setting, mood, and color palette."
    }
  ],
  "metadata": {
    "word_count_total": 250,
    "spread_count": 8,
    "main_theme": "One sentence — what is the story about, really?",
    "key_message": "One sentence — what does the child take away?"
  }
}

Be a real children's book author. Now you'll receive the child's details and the story to write.`;

// -----------------------------------------------------------------------------
// STORY LENGTH BUDGET
// -----------------------------------------------------------------------------

function getStoryLengthBudget(age: number, pageCount: number): { totalTarget: number; perPageMax: number } {
  let totalTarget: number;
  if (age <= 5) totalTarget = 150;
  else if (age <= 8) totalTarget = 330;
  else totalTarget = 490;

  const raw = Math.ceil((totalTarget / Math.max(1, pageCount)) * 1.1);
  const perPageMax = Math.min(190, Math.max(40, raw));
  return { totalTarget, perPageMax };
}

// -----------------------------------------------------------------------------
// USER MESSAGE BUILDER
// -----------------------------------------------------------------------------

function buildGenerationMessage(
  child: ChildProfile,
  story: StoryTemplate,
  photoDescription?: string,
  styleKey?: string,
): string {
  const traits = getTraitsByIds(child.traits);
  const interests = getInterestsByIds(child.interests);
  const ageRules = getAgeRules(child.age);

  const traitsBlock = traits
    .map((t) => `- ${t.label}: ${t.prompt_instruction}`)
    .join('\n');

  const interestsBlock = interests.map((i) => `- ${i.label}`).join('\n') || '- (none specified)';

  const beatsBlock = story.required_beats.map((b) => `- ${b}`).join('\n');
  const avoidBlock = story.things_to_avoid.map((b) => `- ${b}`).join('\n');

  const testPageCount = process.env.TEST_PAGE_COUNT ? parseInt(process.env.TEST_PAGE_COUNT, 10) : null;
  const effectivePageCount = testPageCount || ageRules.spread_count.max;
  const { totalTarget, perPageMax } = getStoryLengthBudget(child.age, effectivePageCount);

  const lengthConstraint = `
=================================================================
HARD CONSTRAINT — STORY LENGTH (overrides every other instruction)
=================================================================
This story has EXACTLY ${effectivePageCount} pages.
Write a complete, satisfying story of about ${totalTarget} words TOTAL,
appropriate for a ${child.age}-year-old, split into ${effectivePageCount} pages of
roughly equal length.
Each page must be ${perPageMax} words or fewer — this is the ceiling.
${effectivePageCount} pages at ${perPageMax} words is enough room for a full story;
do not exceed ${perPageMax} on any page.
Before returning, count the words on each page; if any page is over,
shorten it or move a sentence to another page.
Word counting: "don't" = 1 word, "Mr. Pim" = 2, "wide-eyed" = 1.
=================================================================
`;

  const photoBlock = photoDescription
    ? `
# Real child photo description

IMPORTANT — The protagonist is based on a real child. Use the following visual description verbatim in your character_bible. Do NOT invent different hair color, eye color, or skin tone:

${photoDescription}

Your character_bible should incorporate these exact visual details for the protagonist. Only add the outfit and side-character details — keep all facial features, hair, eyes, and skin from the description above.
`
    : '';

  const styleTone = styleKey ? ART_STYLES[styleKey as ArtStyleKey]?.storyTonePrompt : null;
  const toneSection = styleTone
    ? `\n# Story tone — IMPORTANT\n\nThe parent has chosen the "${ART_STYLES[styleKey as ArtStyleKey]?.name}" art style for this book. Match the story's narrative tone to this style:\n\n${styleTone}\n\nApply this tone throughout the entire story — in word choices, sentence length, pacing, and emotional rhythm.\n`
    : '';

  return `# This child

Name: ${child.name}
Age: ${child.age}
Gender: ${child.gender}
${photoBlock}
# Personality traits

${traitsBlock}

# Interests

${interestsBlock}

${ageRulesToPromptFragment(ageRules)}
${lengthConstraint}
# The story to write

Title hint: "${story.title}" (you can keep, adapt, or replace this — but the new title should serve the child)
Description: ${story.description}

Premise:
${story.premise}

Required beats — the story must include each of these moments:
${beatsBlock}

Things to avoid — these are the common ways this kind of story fails:
${avoidBlock}

${toneSection}# Now write the story

Write a complete, beautiful, age-appropriate children's book for ${child.name}. Follow every rule. Return only the JSON object.`;
}

// -----------------------------------------------------------------------------
// THE GENERATION CALL
// -----------------------------------------------------------------------------

/**
 * Generate a personalized story for this child from this template.
 *
 * Uses Claude Opus 4.7 by default — story quality is worth the cost.
 * Sonnet 4.6 is a reasonable fallback if cost becomes a concern.
 */
export async function generateStory(
  child: ChildProfile,
  storyId: string,
  apiKey: string,
  model: string = 'claude-opus-4-7',
  photoDescription?: string,
  styleKey?: string,
): Promise<GeneratedStory> {
  const story = getStoryById(storyId);
  if (!story) {
    throw new Error(`Unknown story ID: ${storyId}`);
  }

  // Sanity check: child age within story's age range (with a bit of slack)
  if (child.age < story.age_min - 1 || child.age > story.age_max + 1) {
    console.warn(
      `Child age ${child.age} outside story range [${story.age_min}, ${story.age_max}] for "${story.id}"`
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model,
    max_tokens: 8000,
    system: STORY_SYSTEM_PROMPT_EN,
    messages: [{ role: 'user', content: buildGenerationMessage(child, story, photoDescription, styleKey) }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();

  let parsed: GeneratedStory;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse generation response. Raw text:', text.slice(0, 500));
    throw new Error('Story generation returned invalid JSON');
  }

  validateGeneratedStory(parsed, child, story);

  // Post-generation word count enforcement (derived from age + actual page count)
  const actualPages = parsed.spreads.length;
  const { perPageMax: wordCap } = getStoryLengthBudget(child.age, actualPages);
  const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

  const pageCounts = parsed.spreads.map((s, i) => ({
    idx: i,
    spreadNum: s.spread_number,
    count: countWords(s.text),
  }));
  console.log('[story-generation] Word counts per page:', pageCounts.map(p => `p${p.spreadNum}:${p.count}`).join(', '), `(cap: ${wordCap})`);

  const overflowing = pageCounts.filter(p => p.count > wordCap);
  if (overflowing.length > 0) {
    console.warn('[story-generation] Overflowing pages:', overflowing.map(p => `p${p.spreadNum}:${p.count}`));

    try {
      const fixPrompt = `The following pages from a children's story exceed the ${wordCap}-word maximum for a ${child.age}-year-old. Rewrite ONLY these pages to fit within ${wordCap} words each. Keep the same scene and emotional beats, just shorter.\n\n${overflowing.map(p => `PAGE ${p.spreadNum} (currently ${p.count} words, must be ≤${wordCap}):\n${parsed.spreads[p.idx].text}`).join('\n\n')}\n\nReturn ONLY valid JSON:\n{"pages":[{"spreadNumber":<number>,"text":"<rewritten text>"}]}`;

      const fixResponse = await anthropic.messages.create({
        model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: fixPrompt }],
      });

      const fixText = fixResponse.content[0].type === 'text' ? fixResponse.content[0].text : '';
      const fixCleaned = fixText.replace(/```json\n?|```\n?/g, '').trim();
      const fixed = JSON.parse(fixCleaned) as { pages: Array<{ spreadNumber: number; text: string }> };

      for (const fix of fixed.pages) {
        const targetIdx = parsed.spreads.findIndex(s => s.spread_number === fix.spreadNumber);
        if (targetIdx >= 0) {
          const newCount = countWords(fix.text);
          if (newCount <= wordCap) {
            parsed.spreads[targetIdx].text = fix.text;
            console.log(`[story-generation] Page ${fix.spreadNumber} fixed: ${newCount} words`);
          } else {
            console.warn(`[story-generation] Page ${fix.spreadNumber} retry still over: ${newCount} words`);
          }
        }
      }
    } catch (retryErr) {
      console.error('[story-generation] Word count retry failed:', retryErr);
    }

    const finalCounts = parsed.spreads.map(s => `p${s.spread_number}:${countWords(s.text)}`);
    console.log('[story-generation] Final word counts after retry:', finalCounts.join(', '));
  }

  return parsed;
}

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

/**
 * Lightweight validation — catches structural problems without being so strict
 * that we throw away usable stories.
 */
function validateGeneratedStory(
  generated: GeneratedStory,
  child: ChildProfile,
  story: StoryTemplate
): void {
  const ageRules = getAgeRules(child.age);

  if (!generated.title || generated.title.trim().length === 0) {
    throw new Error('Generated story has no title');
  }

  if (!Array.isArray(generated.spreads) || generated.spreads.length === 0) {
    throw new Error('Generated story has no spreads');
  }

  // Character bible check (warn only — backward compat)
  if (!generated.character_bible || generated.character_bible.trim().length === 0) {
    console.warn('[story-generation-en] character_bible is missing or empty — illustration consistency may suffer');
  }

  // Spread count tolerance: check against configured page count or age rules
  const spreadCount = generated.spreads.length;
  const configuredPageCount = process.env.TEST_PAGE_COUNT ? parseInt(process.env.TEST_PAGE_COUNT, 10) : null;
  if (configuredPageCount) {
    if (spreadCount !== configuredPageCount) {
      console.warn(`Spread count ${spreadCount} differs from configured TEST_PAGE_COUNT=${configuredPageCount}`);
    }
  } else {
    const tolerantMin = ageRules.spread_count.min - 2;
    const tolerantMax = ageRules.spread_count.max + 2;
    if (spreadCount < tolerantMin || spreadCount > tolerantMax) {
      console.warn(`Spread count ${spreadCount} outside expected range [${ageRules.spread_count.min}, ${ageRules.spread_count.max}] for age ${child.age}`);
    }
  }

  // Each spread must have text and illustration_prompt
  for (const spread of generated.spreads) {
    if (!spread.text || spread.text.trim().length === 0) {
      throw new Error(`Spread ${spread.spread_number} has empty text`);
    }
    if (!spread.illustration_prompt || spread.illustration_prompt.trim().length === 0) {
      throw new Error(`Spread ${spread.spread_number} has empty illustration_prompt`);
    }
  }

  // Child's name should appear at least once
  const fullText = generated.spreads.map((s) => s.text).join(' ');
  if (!fullText.toLowerCase().includes(child.name.toLowerCase())) {
    console.warn(`Child's name "${child.name}" does not appear in the generated story`);
  }

  // Forbidden phrases (the cliché check)
  const forbidden = [
    'happily ever after',
    'lived happily',
    'the most special',
    'just the way you are',
    'and the lesson is',
    'and so the child learned',
  ];
  const lowerText = fullText.toLowerCase();
  for (const phrase of forbidden) {
    if (lowerText.includes(phrase)) {
      console.warn(`Forbidden phrase detected: "${phrase}"`);
    }
  }
}

// -----------------------------------------------------------------------------
// TEST HELPER (not exported for production use)
// -----------------------------------------------------------------------------

/**
 * Returns the prompts that would be sent to Claude — useful for debugging
 * the prompt without spending API tokens.
 */
export function previewGenerationPrompts(
  child: ChildProfile,
  storyId: string,
): { system: string; user: string } | null {
  const story = getStoryById(storyId);
  if (!story) return null;

  return {
    system: STORY_SYSTEM_PROMPT_EN,
    user: buildGenerationMessage(child, story),
  };
}

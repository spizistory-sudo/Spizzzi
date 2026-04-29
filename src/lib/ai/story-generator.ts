import { getGeminiClient } from './gemini';
import { STORY_SYSTEM_PROMPT, STORY_SYSTEM_PROMPT_HE } from './prompts/story-system';
import { THEMES } from './prompts/story-themes';
import type { GeneratedStory } from '@/types/ai';
import { isDevMode, getTestPageCount } from '@/lib/dev/config';
import { getMockStory } from '@/lib/dev/mock-data';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic/client';
import { STORY_SYSTEM_PROMPT_HE_V2 } from './prompts/story-system-he-v2';
import { getCategoryById, getTopicById, getRandomTopic } from './prompts/categories';
import { selectDynamicKnobs, type DynamicKnobs } from './prompts/dynamic-knobs';
import { getAgeRules, type AgeRules } from './prompts/age-rules';
import { getTraitById } from '@/lib/personality-traits-he';
import { validateHebrewStory, type ValidationResult } from './hebrew-quality-checks';
import { stripNiqqud } from './strip-niqqud';

interface GenerateStoryParams {
  themeSlug: string;
  childName: string;
  childAge: number;
  childTraits: string[];
  language: 'en' | 'he';
  customPrompt?: string;
}

export async function generateStory(
  params: GenerateStoryParams
): Promise<GeneratedStory> {
  const { themeSlug, childName, childAge, childTraits, language, customPrompt } = params;
  const testPageCount = getTestPageCount();

  if (isDevMode()) {
    console.log('[DEV_MODE] Returning mock story, language:', language);
    const pageCount = testPageCount || 3;
    return getMockStory(childName, pageCount, language, themeSlug);
  }

  const languageInstruction = language === 'he'
    ? `LANGUAGE: Write the entire story in natural, warm, colloquial Israeli Hebrew (עברית מדוברת).
Write like a loving Israeli parent telling a bedtime story — not like a translation, not like a textbook.
Use everyday Israeli speech patterns: 'בא לו', 'יאללה', 'סבבה', 'כיף', 'ממש', 'בדיוק'.
The book title must be entirely in Hebrew — no English words at all. Not even a single English word in the title.
The "text" field on every page must be entirely in Hebrew. Illustration prompts MUST be in English.`
    : `LANGUAGE: Write the entire story in English. Use warm, playful language appropriate for a children's book.`;

  let userPrompt: string;

  if (themeSlug === '__custom__' && customPrompt) {
    // Custom mode: user-provided story concept
    const pageCount = testPageCount || 10;
    userPrompt = `
Write a ${pageCount}-page children's story for a ${childAge}-year-old child named ${childName}.

${languageInstruction}

STORY CONCEPT:
${customPrompt}

CHILD TRAITS TO WEAVE IN: ${childTraits.join(', ')}

Generate exactly ${pageCount} pages.`;
  } else {
    // Template mode
    const theme = THEMES[themeSlug];
    if (!theme) {
      throw new Error(`Unknown theme: ${themeSlug}`);
    }

    const traitPower = childTraits[0]?.toLowerCase() || 'kindness';
    const basePrompt = theme.promptTemplate
      .replace(/{pageCount}/g, (testPageCount || theme.pageCount).toString())
      .replace(/{age}/g, childAge.toString())
      .replace(/{childName}/g, childName)
      .replace(/{traits}/g, childTraits.join(', '))
      .replace(/{trait_power}/g, `the power of ${traitPower}`);

    userPrompt = `${languageInstruction}\n\n${basePrompt}`;
  }

  const systemPrompt =
    language === 'he' ? STORY_SYSTEM_PROMPT_HE : STORY_SYSTEM_PROMPT;

  console.log('[story-gen] language:', language, '| using Hebrew system prompt:', language === 'he');
  console.log('[story-gen] Final user prompt (first 500 chars):', userPrompt.substring(0, 500));

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.9,
      maxOutputTokens: 8192,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  const story: GeneratedStory = JSON.parse(text);

  if (!story.title || !Array.isArray(story.pages) || story.pages.length === 0) {
    throw new Error('Invalid story response format');
  }

  return story;
}

// ═══════════════════════════════════════════════════════════
// STRUCTURED HEBREW STORY GENERATION (Claude)
// ═══════════════════════════════════════════════════════════

export interface StructuredStoryRequest {
  childName: string;
  childAge: number;
  childGender: 'male' | 'female';
  traits: string[];
  traitDetails?: Record<string, string>;
  categoryId: string;
  topicId: string | 'surprise';
}

export interface StructuredStoryResult {
  story: {
    title: string;
    spreads: Array<{
      spread_number: number;
      text: string;
      text_for_tts: string;
      illustration_prompt: string;
    }>;
    metadata: Record<string, unknown>;
  };
  knobs: DynamicKnobs;
  ageRules: AgeRules;
  attempts: number;
  validationIssues: string[];
}

export async function generateStructuredHebrewStory(
  req: StructuredStoryRequest
): Promise<StructuredStoryResult> {
  const category = getCategoryById(req.categoryId);
  if (!category) throw new Error(`Category not found: ${req.categoryId}`);
  if (category.status !== 'active') throw new Error(`Category not active: ${req.categoryId}`);

  const topic = req.topicId === 'surprise'
    ? getRandomTopic(req.categoryId)
    : getTopicById(req.categoryId, req.topicId);
  if (!topic) throw new Error(`Topic not found: ${req.topicId}`);

  const ageRules = getAgeRules(req.childAge);
  const knobs = selectDynamicKnobs({ age: req.childAge, traits: req.traits });

  // Honor DEV_MODE: cap spreads to TEST_PAGE_COUNT to save Claude credits
  const devMode = process.env.DEV_MODE === 'true';
  const testPageCount = parseInt(process.env.TEST_PAGE_COUNT || '3', 10);
  if (devMode) {
    ageRules.spreadCount = { min: testPageCount, max: testPageCount };
    console.log(`[story-generator-he] DEV_MODE: capping spreads to ${testPageCount}`);
  }

  let userMessage = buildStructuredHebrewUserMessage(req, category, topic, ageRules, knobs);

  const MAX_ATTEMPTS = 3;
  const attempts: Array<{ story: Record<string, unknown>; validation: ValidationResult }> = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[story-generator-he] Attempt ${attempt}/${MAX_ATTEMPTS}`);

    let story: Record<string, unknown>;
    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8192,
        system: STORY_SYSTEM_PROMPT_HE_V2,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      story = parseHebrewStoryJSON(text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[story-generator-he] Attempt ${attempt} call/parse failed:`, msg);
      if (attempt === MAX_ATTEMPTS && attempts.length === 0) {
        throw new Error(`Story generation failed: ${msg}`);
      }
      userMessage += `\n\n⚠️ הניסיון הקודם נכשל. החזר רק JSON תקין במבנה המבוקש.`;
      continue;
    }

    const storyForValidation = {
      spreads: (story.spreads as Array<{ spread_number: number; text: string }>),
      metadata: story.metadata as Record<string, unknown> | undefined,
    };
    const validation = validateHebrewStory(storyForValidation, ageRules, req.childName);
    attempts.push({ story, validation });

    if (validation.valid) {
      console.log(`[story-generator-he] Valid on attempt ${attempt}, score ${validation.score}`);
      return finalizeStructuredHebrewResult(story, knobs, ageRules, attempt, []);
    }

    console.warn(`[story-generator-he] Attempt ${attempt} failed:`, validation.errors);
    userMessage += `\n\n⚠️ הניסיון הקודם נכשל בבדיקת איכות. שגיאות:\n${validation.errors.join('\n')}\nתקן ונסה שוב.`;
  }

  // Graceful degradation: pick best-of-3 by score
  const best = attempts.sort((a, b) => b.validation.score - a.validation.score)[0];
  console.warn(
    `[story-generator-he] All ${MAX_ATTEMPTS} attempts had validation issues. Returning best (score ${best.validation.score}).`
  );
  return finalizeStructuredHebrewResult(best.story, knobs, ageRules, MAX_ATTEMPTS, best.validation.errors);
}

function finalizeStructuredHebrewResult(
  story: Record<string, unknown>,
  knobs: DynamicKnobs,
  ageRules: AgeRules,
  attempts: number,
  validationIssues: string[]
): StructuredStoryResult {
  const spreads = story.spreads as Array<{ spread_number: number; text: string; illustration_prompt: string }>;
  return {
    story: {
      title: story.title as string,
      spreads: spreads.map((s) => ({
        ...s,
        text_for_tts: stripNiqqud(s.text),
      })),
      metadata: (story.metadata || {}) as Record<string, unknown>,
    },
    knobs,
    ageRules,
    attempts,
    validationIssues,
  };
}

function buildStructuredHebrewUserMessage(
  req: StructuredStoryRequest,
  category: NonNullable<ReturnType<typeof getCategoryById>>,
  topic: NonNullable<ReturnType<typeof getTopicById>>,
  ageRules: AgeRules,
  knobs: DynamicKnobs
): string {
  const enrichedTraits = req.traits
    .map(traitId => {
      const trait = getTraitById(traitId);
      if (!trait) return null;
      const detail = req.traitDetails?.[traitId];
      const label = detail ? `${trait.label_he} (${detail})` : trait.label_he;
      return `- ${label}: ${trait.prompt_instruction}`;
    })
    .filter(Boolean)
    .join('\n');

  const ageNote = topic.age_specific_notes[ageRules.ageRange];

  return `# פרטי הילד

שם: ${req.childName}
גיל: ${req.childAge}
מגדר: ${req.childGender === 'male' ? 'זכר' : 'נקבה'}

תכונות אופי ותחומי עניין:
${enrichedTraits}

# חוקי גיל

טווח גיל: ${ageRules.ageRange}
מספר ספרדים: ${ageRules.spreadCount.min}-${ageRules.spreadCount.max}
מילים בכל ספרד: ${ageRules.wordsPerSpread.min}-${ageRules.wordsPerSpread.max}
חריזה: ${ageRules.rhymeRequired ? 'חובה (סכמת ABCB)' : 'אין'}
ניקוד: ${ageRules.niqqudFull ? 'מלא — כל מילה' : ageRules.niqqudPartial ? 'חלקי' : 'ללא'}
אוצר מילים: ${ageRules.vocabularyLevel}
מורכבות הקונפליקט: ${ageRules.conflictComplexity}

# קטגוריית הסיפור

${category.label_he} ${category.emoji}

${category.document}

# נושא הסיפור

שם הנושא: ${topic.title_he}
תיאור: ${topic.short_description}
מסר ליבה (קודש — אסור לסטות ממנו): ${topic.core_message}

נקודות חובה (חייבות להופיע בסיפור):
${topic.required_points.map(p => `- ${p}`).join('\n')}

הוראה ספציפית לגיל ${ageRules.ageRange}:
${ageNote}

דברים שאסור לעשות בנושא הזה:
${topic.things_to_avoid.map(p => `- ${p}`).join('\n')}

# ידיות סגנון

נקודת מבט: ${knobs.point_of_view === 'first_person' ? 'גוף ראשון' : 'גוף שלישי'}
סגנון פרוזה: ${translateProse(knobs.prose_style)}
קצב: ${translatePacing(knobs.pacing)}
רמת ריאליזם: ${translateRealism(knobs.realism_level)}
סוג סיום: ${translateEnding(knobs.ending_type)}
דמות תומכת: ${translateSupport(knobs.supporting_character)}
מקום ההתרחשות: ${translateSetting(knobs.setting)}

# המשימה

צור סיפור מותאם אישית. החזר JSON תקין בלבד, ללא טקסט נוסף.`;
}

function translateProse(s: string): string {
  return ({ lyrical: 'לירי', everyday: 'יומיומי', humorous: 'הומוריסטי', mysterious: 'מסתורי' } as Record<string, string>)[s] || s;
}
function translatePacing(s: string): string {
  return ({ slow: 'איטי', moderate: 'בינוני', fast: 'מהיר' } as Record<string, string>)[s] || s;
}
function translateRealism(s: string): string {
  return ({ realistic: 'ריאליסטי', magical_realism: 'ריאליזם מאגי', fantasy: 'פנטזיה' } as Record<string, string>)[s] || s;
}
function translateEnding(s: string): string {
  return ({ closed: 'סגור', open: 'פתוח', circular: 'מעגלי' } as Record<string, string>)[s] || s;
}
function translateSupport(s: string): string {
  return ({ parent: 'הורה', sibling: 'אח/אחות', friend: 'חבר', grandparent: 'סבא או סבתא', teacher: 'מורה או גננת', magical_creature: 'יצור מאגי או חיה מדברת' } as Record<string, string>)[s] || s;
}
function translateSetting(s: string): string {
  return ({ home: 'בית', kindergarten: 'גן', nature: 'טבע', imaginary_place: 'מקום דמיוני', journey: 'מסע' } as Record<string, string>)[s] || s;
}

function parseHebrewStoryJSON(text: string): Record<string, unknown> {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) return JSON.parse(codeBlockMatch[1]);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error('No JSON found in response');
}

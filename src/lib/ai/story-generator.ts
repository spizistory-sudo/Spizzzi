import { getGeminiClient } from './gemini';
import { STORY_SYSTEM_PROMPT, STORY_SYSTEM_PROMPT_HE } from './prompts/story-system';
import { THEMES } from './prompts/story-themes';
import type { GeneratedStory } from '@/types/ai';
import { isDevMode, getTestPageCount } from '@/lib/dev/config';
import { getMockStory } from '@/lib/dev/mock-data';

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
    console.log('[DEV_MODE] Returning mock story');
    const pageCount = testPageCount || 3;
    return getMockStory(childName, pageCount);
  }

  const languageInstruction = language === 'he'
    ? `LANGUAGE: Write the entire story in natural, warm, colloquial Israeli Hebrew (עברית מדוברת).
Write like a loving Israeli parent telling a bedtime story — not like a translation, not like a textbook.
Use everyday Israeli speech patterns: 'בא לו', 'יאללה', 'סבבה', 'כיף', 'ממש', 'בדיוק'.
The title MUST also be in Hebrew. Illustration prompts MUST be in English.`
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

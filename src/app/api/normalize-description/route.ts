export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withGeminiRetry } from '@/lib/ai/gemini-retry';

const NORMALIZE_PROMPT = `You are a children's book character description expert. A parent has described their child in their own words. Your job is to expand this into a detailed, structured visual description that an AI image generator can use to consistently draw this character.

Rules:
- Output a SINGLE detailed paragraph (no bullets, no headers).
- Include: approximate age, hair (color, length, style, texture), eyes (color, shape), skin tone (be specific — e.g. "warm brown", "light olive", "fair with pink undertones"), face shape and features, body type/build.
- If the parent mentioned clothing, include it. If not, invent a simple, age-appropriate outfit.
- If the parent mentioned expression or energy, include it. If not, default to "friendly smile, bright-eyed."
- Do NOT add details that CONTRADICT what the parent wrote. If they said "short blonde hair", do not change it to brown.
- For attributes the parent did NOT mention, fill in reasonable, neutral defaults that match the described ethnicity/appearance.
- Do NOT include the child's name.
- The description must be detailed enough that an AI can draw the EXACT same child every time.

Example output format:
"A 6-year-old girl with warm brown skin, long curly black hair styled in two puffs, large dark brown eyes with thick eyelashes, a round face with full cheeks and a wide dimpled smile. She has a petite build for her age. She wears a bright yellow sundress with white sandals."

Parent's description:`;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rawDescription } = await req.json();
    if (!rawDescription || rawDescription.trim().length < 20) {
      return NextResponse.json({ error: 'Description too short (min 20 characters)' }, { status: 400 });
    }

    console.log(`[normalize-description] Normalizing description (${rawDescription.length} chars)`);

    const description = await withGeminiRetry(async () => {
      const { getGeminiClient } = await import('@/lib/ai/gemini');
      const ai = getGeminiClient();
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `${NORMALIZE_PROMPT}\n\n"${rawDescription.trim()}"` }] }],
      });
      const text = (res.text || '').trim();
      if (!text) throw new Error('Empty response from normalization');
      return text;
    }, { callName: 'normalize-description' });

    console.log(`[normalize-description] Normalized to ${description.length} chars`);
    return NextResponse.json({ description });
  } catch (err) {
    console.error('[normalize-description] ERROR:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Normalization failed' }, { status: 500 });
  }
}

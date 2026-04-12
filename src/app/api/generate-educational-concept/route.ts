import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeminiClient } from '@/lib/ai/gemini';

const TONE_DESCRIPTIONS: Record<string, string> = {
  peaceful: 'emphasizing harmony, understanding, and finding common ground.',
  hopeful: 'optimistic and forward-looking, showing that good things come from hard situations.',
  brave: 'showing that courage and asking for help makes scary things manageable.',
  kind: 'centered on empathy, compassion, and how helping others makes everyone stronger.',
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { topic, tone = 'hopeful', childAge = 6 } = await req.json();

    if (!topic || topic.trim().length < 3) {
      return NextResponse.json({ error: 'Topic too short' }, { status: 400 });
    }

    const ai = getGeminiClient();

    const prompt = `Write a short, age-appropriate story concept to explain the concept of "${topic}" to a ${childAge}-year-old.

Follow these strict guidelines:
1. Analogy: Core the explanation around a simple, relatable everyday analogy (e.g., a playground, a neighborhood, building blocks, teamwork). For children under 6, use anthropomorphic animals or simple magical creatures. For children 6+, use real-world structural analogies.
2. Tone: Keep the tone ${TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.hopeful} Calm, factual, and reassuring throughout.
3. Constraints: Strictly avoid scary, violent, graphic, overly technical, or anxiety-inducing details. No real place names, real political figures, or real conflict details.
4. Focus: Distill the topic down to its most basic mechanism. Strip away complicated politics, advanced science, or unnecessary variables. One simple idea only.
5. Resolution: End on a comforting note that emphasizes safety, the presence of helpers, or a natural positive resolution.

The child is ${childAge} years old — calibrate vocabulary and analogy complexity accordingly.

Respond in this exact JSON format with no other text:
{
  "title": "A short, warm story title",
  "concept": "The story concept in 3-5 sentences, written as a narrative pitch not a summary",
  "lesson": "One sentence: what the child will understand after hearing this story",
  "metaphorExplanation": "One sentence for the parent explaining how the real topic maps to the story analogy"
}`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const text = result.text?.trim();
    if (!text) throw new Error('Empty response');

    const parsed = JSON.parse(text);

    return NextResponse.json({
      success: true,
      title: parsed.title,
      concept: parsed.concept,
      lesson: parsed.lesson,
      metaphorExplanation: parsed.metaphorExplanation,
    });
  } catch (err) {
    console.error('[generate-educational-concept]', err);
    return NextResponse.json({ error: 'Failed to generate concept' }, { status: 500 });
  }
}

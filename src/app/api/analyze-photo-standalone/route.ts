import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeChildPhoto } from '@/lib/ai/photo-analyzer';
import { getImageBase64 } from '@/lib/supabase/storage';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { storagePath } = await req.json();
    if (!storagePath) return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 });

    const photoBase64 = await getImageBase64('photos', storagePath);

    // Validate that the photo shows a person
    const { getGeminiClient } = await import('@/lib/ai/gemini');
    const ai = getGeminiClient();
    const validationRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: photoBase64 } },
          { text: 'Does this photo clearly show a human person, especially a child? Answer with exactly one word: "YES" if a person is clearly visible, or "NO" if the photo shows something else (object, scenery, animal, blurred image, etc). One word only.' },
        ],
      }],
    });
    const validationText = (validationRes.text || '').trim().toUpperCase();
    console.log('[analyze-photo-standalone] Validation result:', validationText);

    if (!validationText.startsWith('YES')) {
      return NextResponse.json(
        { error: 'NO_PERSON_DETECTED', message: "We couldn't find a person in this photo. Please upload a clear photo of the child the story is about." },
        { status: 400 }
      );
    }

    console.log('[analyze-photo-standalone] Analyzing:', storagePath);
    const description = await analyzeChildPhoto(photoBase64);
    console.log('[analyze-photo-standalone] Got description, length:', description.length);

    return NextResponse.json({ description });
  } catch (err) {
    console.error('[analyze-photo-standalone] Error:', err);
    return NextResponse.json(
      { error: 'Analysis failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

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

    console.log('[analyze-photo-standalone] Loading photo:', storagePath);
    let photoBase64: string;
    try {
      photoBase64 = await getImageBase64('photos', storagePath);
      console.log('[analyze-photo-standalone] Photo loaded, base64 length:', photoBase64.length);
    } catch (loadErr) {
      console.error('[analyze-photo-standalone] Failed to load photo from storage:', loadErr);
      return NextResponse.json({ error: 'Failed to load photo', details: loadErr instanceof Error ? loadErr.message : 'unknown' }, { status: 500 });
    }

    // Validate that the photo shows a person
    console.log('[analyze-photo-standalone] Running person validation...');
    let validationText: string;
    try {
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
      validationText = (validationRes.text || '').trim().toUpperCase();
      console.log('[analyze-photo-standalone] Validation result:', validationText);
    } catch (valErr) {
      console.error('[analyze-photo-standalone] Validation call failed:', valErr);
      return NextResponse.json({ error: 'Photo validation failed', details: valErr instanceof Error ? valErr.message : 'unknown' }, { status: 500 });
    }

    if (!validationText.startsWith('YES')) {
      return NextResponse.json(
        { error: 'NO_PERSON_DETECTED', message: "We couldn't find a person in this photo. Please upload a clear photo of the child the story is about." },
        { status: 400 }
      );
    }

    // Run full character analysis
    console.log('[analyze-photo-standalone] Running character analysis...');
    let description: string;
    try {
      description = await analyzeChildPhoto(photoBase64);
      console.log('[analyze-photo-standalone] Got description, length:', description.length);
    } catch (analysisErr) {
      console.error('[analyze-photo-standalone] Character analysis failed:', analysisErr);
      return NextResponse.json(
        { error: 'Character analysis failed', details: analysisErr instanceof Error ? analysisErr.message : 'unknown' },
        { status: 500 }
      );
    }

    return NextResponse.json({ description });
  } catch (err) {
    console.error('[analyze-photo-standalone] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Analysis failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeChildPhoto } from '@/lib/ai/photo-analyzer';
import { getImageBase64 } from '@/lib/supabase/storage';
import { withGeminiRetry } from '@/lib/ai/gemini-retry';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { storagePath, validateOnly } = await req.json();
    if (!storagePath) return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 });

    console.log('[analyze-photo-standalone] Loading photo:', storagePath);
    let photoBase64: string;
    try {
      photoBase64 = await getImageBase64('photos', storagePath);
      console.log('[analyze-photo-standalone] Photo loaded, base64 length:', photoBase64.length);
    } catch (loadErr) {
      console.error('[analyze-photo-standalone] ERROR loading photo:', loadErr instanceof Error ? `${loadErr.message}\n${loadErr.stack}` : loadErr);
      return NextResponse.json({ error: 'Failed to load photo', details: loadErr instanceof Error ? loadErr.message : 'unknown' }, { status: 500 });
    }

    // Validate: single person, clear quality (with retry on transient Gemini errors)
    console.log('[analyze-photo-standalone] Running photo quality check...');
    let validationText: string;
    try {
      validationText = await withGeminiRetry(async () => {
        const { getGeminiClient } = await import('@/lib/ai/gemini');
        const ai = getGeminiClient();
        const validationRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: photoBase64 } },
              { text: `Evaluate this photo for use as a character reference in a children's book illustration. Answer with EXACTLY one of these words:
- "OK" if the photo clearly shows exactly ONE person (child or adult) with a visible face, and the image is reasonably clear and well-lit.
- "NO_PERSON" if no human person/face is visible (object, scenery, animal, etc).
- "MULTIPLE" if more than one person/face is visible (group photo, family photo).
- "BLURRY" if the photo is too blurry, dark, or low-quality to clearly see the person's face.
One word only.` },
            ],
          }],
        });
        return (validationRes.text || '').trim().toUpperCase();
      }, { callName: 'photo-validation' });

      console.log('[analyze-photo-standalone] Validation result:', validationText);
    } catch (valErr) {
      console.error('[analyze-photo-standalone] ERROR in validation after retries:', valErr instanceof Error ? `${valErr.message}\n${valErr.stack}` : valErr);
      return NextResponse.json({ error: 'Photo validation failed', details: valErr instanceof Error ? valErr.message : 'unknown' }, { status: 500 });
    }

    if (validationText.startsWith('NO_PERSON') || validationText === 'NO') {
      return NextResponse.json(
        { error: 'NO_PERSON_DETECTED', message: "We couldn't find a person in this photo. Please upload a clear photo of the child the story is about." },
        { status: 400 }
      );
    }
    if (validationText.startsWith('MULTIPLE')) {
      return NextResponse.json(
        { error: 'MULTIPLE_FACES', message: "This looks like a group photo. Please use a photo with just one person so the AI can match your child's face." },
        { status: 400 }
      );
    }
    if (validationText.startsWith('BLURRY')) {
      return NextResponse.json(
        { error: 'LOW_QUALITY', message: "This photo is too blurry or dark. Please use a clear, well-lit photo where the face is easy to see." },
        { status: 400 }
      );
    }

    if (validateOnly) {
      return NextResponse.json({ valid: true });
    }

    // Run full character analysis (analyzeChildPhoto has its own retry)
    console.log('[analyze-photo-standalone] Running character analysis...');
    let description: string;
    try {
      description = await analyzeChildPhoto(photoBase64);
      console.log('[analyze-photo-standalone] Got description, length:', description.length);
    } catch (analysisErr) {
      console.error('[analyze-photo-standalone] ERROR in character analysis:', analysisErr instanceof Error ? `${analysisErr.message}\n${analysisErr.stack}` : analysisErr);
      return NextResponse.json(
        { error: 'Character analysis failed', details: analysisErr instanceof Error ? analysisErr.message : 'unknown' },
        { status: 500 }
      );
    }

    return NextResponse.json({ description });
  } catch (err) {
    console.error('[analyze-photo-standalone] UNHANDLED ERROR:', err instanceof Error ? `${err.message}\n${err.stack}` : err);
    return NextResponse.json(
      { error: 'Analysis failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

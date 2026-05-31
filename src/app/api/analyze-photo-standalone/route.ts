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

    console.log('[analyze-photo-standalone] Analyzing:', storagePath);
    const photoBase64 = await getImageBase64('photos', storagePath);
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

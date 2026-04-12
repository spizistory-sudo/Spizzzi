import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getElevenLabsClient } from '@/lib/elevenlabs/client';
import { isDevMode, isDevNarration } from '@/lib/dev/config';
import { generateSilentMp3 } from '@/lib/dev/mock-data';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, voiceId } = await req.json();
    if (!text || !voiceId) {
      return NextResponse.json({ error: 'text and voiceId required' }, { status: 400 });
    }

    if (isDevMode() && !isDevNarration()) {
      console.log('[DEV_MODE] Returning silent voice preview');
      const silentMp3 = generateSilentMp3(2);
      return new NextResponse(new Uint8Array(silentMp3), {
        headers: { 'Content-Type': 'audio/mpeg' },
      });
    }

    const previewText = text.substring(0, 200);
    const elevenlabs = getElevenLabsClient();

    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: previewText,
      modelId: 'eleven_flash_v2_5',
      voiceSettings: {
        stability: 0.65,
        similarityBoost: 0.75,
      },
    });

    const reader = audioStream.getReader();
    const chunks: Buffer[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }

    return new NextResponse(new Uint8Array(Buffer.concat(chunks)), {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (err) {
    console.error('[preview-voice] Error:', err);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
}

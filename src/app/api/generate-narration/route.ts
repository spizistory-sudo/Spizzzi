import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getElevenLabsClient } from '@/lib/elevenlabs/client';
import { getVoiceById } from '@/lib/elevenlabs/voices';
import { uploadAudio } from '@/lib/supabase/storage';
import { isDevMode, isDevNarration } from '@/lib/dev/config';
import { generateSilentMp3 } from '@/lib/dev/mock-data';

export const maxDuration = 300;

function prepareHebrewText(text: string): string {
  // Remove emoji and non-Hebrew/Latin/punctuation characters that may cause TTS issues
  let processed = text.replace(/[^\u0000-\u024F\u0590-\u05FF\s.,!?'\"()-]/g, '');
  // Add a tiny pause marker after each sentence for more natural delivery
  processed = processed.replace(/\. /g, '.  ');
  return processed.trim();
}

export async function POST(req: Request) {
  const body = await req.json();
  console.log('[narration-debug] Full request body keys:', Object.keys(body));
  console.log('[narration-debug] bookId:', body.bookId);
  console.log('[narration-debug] language:', body.language);
  console.log('[narration-debug] voiceId:', body.voiceId);
  console.log('[narration-debug] pages count:', body.pages?.length);
  console.log('[narration-debug] first page text sample:', body.pages?.[0]?.text?.substring(0, 120));

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId, voiceId, pageIds } = body;
    if (!bookId || !voiceId) {
      return NextResponse.json(
        { error: 'bookId and voiceId are required' },
        { status: 400 }
      );
    }

    const isHebrewRequest = body.language === 'he';
    const voice = getVoiceById(voiceId);
    if (!voice && !isHebrewRequest) {
      return NextResponse.json({ error: 'Invalid voice' }, { status: 400 });
    }

    // Fetch book + pages
    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    let pagesQuery = supabase
      .from('pages')
      .select('*')
      .eq('book_id', bookId)
      .order('page_number', { ascending: true });

    // If pageIds provided, only generate narration for those specific pages
    if (Array.isArray(pageIds) && pageIds.length > 0) {
      pagesQuery = pagesQuery.in('id', pageIds);
    }

    const { data: pages } = await pagesQuery;

    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'No pages found' }, { status: 404 });
    }

    // Detect book language — from request body first, then book metadata
    const bookMetadata = (book.metadata as Record<string, unknown>) || {};
    const language = body.language || (bookMetadata.language as string) || 'en';
    const isHebrew = language === 'he';
    console.log('[narration] language from DB:', bookMetadata.language, '| from body:', body.language, '| resolved:', language, '| isHebrew:', isHebrew);

    // DEV_NARRATION=true overrides DEV_MODE for narration — uses real ElevenLabs TTS
    const useRealTts = !isDevMode() || isDevNarration();
    const devMode = !useRealTts;
    const elevenlabs = useRealTts ? getElevenLabsClient() : null;
    const results = [];

    // Hebrew: Liam voice + eleven_v3 model (proper Hebrew support)
    const effectiveVoiceId = isHebrew
      ? 'TX3LPaxmHKxFdv7VOQHJ' // Liam
      : voice?.voiceId || voiceId;

    const model = isHebrew ? 'eleven_v3' : 'eleven_multilingual_v2';

    const voiceSettings = isHebrew
      ? { stability: 0.80, similarityBoost: 0.75, style: 0.30, useSpeakerBoost: true }
      : { stability: 0.50, similarityBoost: 0.75, style: 0.50, useSpeakerBoost: true };

    const processText = (text: string): string => {
      if (!isHebrew) return text;
      return text
        .replace(/([.!?])\s+/g, '$1  ')
        .replace(/[^\u0000-\u024F\u0590-\u05FF\s.,!?'\"()\-]/g, '')
        .trim();
    };

    if (isHebrew) {
      console.log('[narration] Hebrew book detected — using Liam voice + eleven_v3 model');
    }

    for (const page of pages) {
      try {
        console.log(`[narration] ${devMode ? '[DEV_MODE] ' : ''}Generating audio for page ${page.page_number}...`);

        let audioBuffer: Buffer;
        let durationMs: number;

        if (devMode) {
          // Generate a 3-second silent MP3
          audioBuffer = generateSilentMp3(3);
          durationMs = 3000;
        } else {
          const textToNarrate = processText(page.text_content);

          if (isHebrew) {
            console.log('[narration] Hebrew text sample:', textToNarrate.substring(0, 150));
          }

          console.log('[narration] Calling ElevenLabs with model:', model, 'voiceId:', effectiveVoiceId);
          let audioStream;
          try {
            audioStream = await elevenlabs!.textToSpeech.convert(
              effectiveVoiceId,
              {
                text: textToNarrate,
                modelId: model,
                voiceSettings,
              }
            );
          } catch (err: any) {
            console.error('[narration] ElevenLabs FULL ERROR:', JSON.stringify(err), err?.message, err?.body);
            throw err;
          }

          const reader = audioStream.getReader();
          const chunks: Buffer[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
          }
          audioBuffer = Buffer.concat(chunks);
          durationMs = Math.round((audioBuffer.length / 16000) * 1000);
        }

        // Upload to Supabase Storage
        // Timestamped filename ensures unique URL after re-generation (no browser cache collision)
        const storagePath = `${bookId}/page-${page.page_number}-${Date.now()}.mp3`;
        const audioUrl = await uploadAudio('audio', storagePath, audioBuffer);

        // Update page record
        await supabase
          .from('pages')
          .update({
            narration_url: audioUrl,
            narration_duration_ms: durationMs,
          })
          .eq('id', page.id);

        console.log(`[narration] Page ${page.page_number} done: ${durationMs}ms`);

        results.push({
          pageNumber: page.page_number,
          narrationUrl: audioUrl,
          durationMs,
        });
      } catch (pageErr) {
        console.error(`[narration] Failed for page ${page.page_number}:`, pageErr);
        results.push({
          pageNumber: page.page_number,
          error: pageErr instanceof Error ? pageErr.message : String(pageErr),
        });
      }
    }

    // Save selected voice to book metadata
    const existingMetadata = (book.metadata as Record<string, unknown>) || {};
    await supabase
      .from('books')
      .update({
        metadata: {
          ...existingMetadata,
          narrator_voice_id: voiceId,
          narrator_voice_name: voice.name,
        },
      })
      .eq('id', bookId);

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[narration] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Failed to generate narration' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePageIllustration, PRIMARY_MODEL } from '@/lib/ai/illustration-generator';
import { uploadImage, getImageBase64 } from '@/lib/supabase/storage';
import type { ArtStyleKey } from '@/lib/ai/prompts/style-references';
import { logGeneration } from '@/lib/ai/generation-logger';
import * as fs from 'fs';
import * as path from 'path';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await req.json();
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const { data: pages } = await supabase
      .from('pages')
      .select('*')
      .eq('book_id', bookId)
      .order('page_number');

    if (!pages?.length) {
      return NextResponse.json({ error: 'No pages found' }, { status: 404 });
    }

    const { data: selectedCover } = await supabase
      .from('cover_options')
      .select('*')
      .eq('book_id', bookId)
      .eq('is_selected', true)
      .single();

    const bookMeta = (book.metadata || {}) as Record<string, unknown>;

    // Read styleKey from book metadata (set at story creation), with validation
    const validStyleKeys = ['watercolor', 'comic', 'anime', 'claymation', 'minimalist', 'storybook', 'pixar', 'vintage'];
    const rawStyleKey = (bookMeta.style_key as string) || (bookMeta.styleKey as string) || (selectedCover?.style_name as string);
    const styleKey = (rawStyleKey && validStyleKeys.includes(rawStyleKey) ? rawStyleKey : 'watercolor') as ArtStyleKey;
    if (rawStyleKey && !validStyleKeys.includes(rawStyleKey)) {
      console.warn('[generate-illustrations] Invalid styleKey, defaulting to watercolor:', rawStyleKey);
    }
    console.log('[generate-illustrations] Using styleKey:', styleKey);
    // Resolve gender from child_profile (English flow) or childGender (Hebrew flow)
    const childProfile = bookMeta.child_profile as Record<string, unknown> | undefined;
    const childGender = (childProfile?.gender as string) || (bookMeta.childGender as string) || 'male';
    // Normalize: 'boy'→'male', 'girl'→'female'
    const normalizedGender = childGender === 'girl' || childGender === 'female' ? 'female' : childGender === 'boy' || childGender === 'male' ? 'male' : 'other';

    const photoDescription = (bookMeta.character_description as string) || '';
    const storyBible = (bookMeta.character_bible as string) || '';

    const genderLock = normalizedGender === 'female'
      ? `THIS CHARACTER IS A GIRL — feminine face, feminine features. NOT a boy. The character is FEMALE. ${book.child_name} is a girl.`
      : normalizedGender === 'male'
      ? `THIS CHARACTER IS A BOY — masculine face, masculine features. NOT a girl. The character is MALE. ${book.child_name} is a boy.`
      : `${book.child_name} is a child.`;

    const fallbackDescription = normalizedGender === 'female'
      ? `A ${book.child_age}-year-old girl named ${book.child_name}. She is clearly female with feminine facial features, feminine hair, and feminine body proportions. Her face is rounded with soft feminine features. She does NOT look like a boy.`
      : normalizedGender === 'male'
      ? `A ${book.child_age}-year-old boy named ${book.child_name}. He is clearly male with masculine facial features, short masculine hair, and masculine body proportions. His face has clear masculine features. He does NOT look like a girl.`
      : `A ${book.child_age}-year-old child named ${book.child_name}.`;

    const characterDescription = [
      genderLock,
      photoDescription || fallbackDescription,
      storyBible,
    ].filter(Boolean).join('\n\n');

    const characterBible = '';

    // Load reference images
    let childPhotoBase64: string | undefined;
    const { data: photos } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('book_id', bookId)
      .eq('label', 'child')
      .limit(1);

    if (photos?.[0]) {
      try {
        childPhotoBase64 = await getImageBase64('photos', photos[0].storage_path);
      } catch { /* continue without */ }
    }

    console.log('[generate-illustrations] CHARACTER LOCK:', {
      bookId,
      gender: normalizedGender,
      photoDescLength: photoDescription.length,
      storyBibleLength: storyBible.length,
      combinedLength: characterDescription.length,
      preview: characterDescription.substring(0, 300),
    });

    console.log('[generate-illustrations] PHOTO LOADED:', {
      bookId,
      photosFound: photos?.length || 0,
      photoBase64Length: childPhotoBase64?.length || 0,
    });

    // Load cover image as reference (REQUIRED — cover must exist before pages generate)
    let coverImageBase64: string | undefined;
    console.log('[generate-illustrations] Loading cover reference:', {
      selectedCoverExists: !!selectedCover,
      coverImageUrl: selectedCover?.image_url?.substring(0, 80) || 'none',
      coverStyleName: selectedCover?.style_name || 'none',
    });

    if (selectedCover?.image_url) {
      try {
        const coverPath = `${bookId}/cover-${styleKey}.png`;
        coverImageBase64 = await getImageBase64('covers', coverPath);
        console.log('[generate-illustrations] Cover loaded:', {
          sizeKB: Math.round((coverImageBase64?.length || 0) * 3 / 4 / 1024),
        });
      } catch (err) {
        console.error('[generate-illustrations] Cover load FAILED:', {
          path: `${bookId}/cover-${styleKey}.png`,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (!coverImageBase64) {
      console.error('[generate-illustrations] CRITICAL: No cover reference available. Pages will generate without cover consistency.');
    }

    // Load style preview PNG
    let stylePreviewBase64: string | undefined;
    try {
      const previewPath = path.join(process.cwd(), 'public', 'images', 'styles', `${styleKey}.png`);
      if (fs.existsSync(previewPath)) {
        const buffer = fs.readFileSync(previewPath);
        stylePreviewBase64 = buffer.toString('base64');
        console.log('[generate-illustrations] Style preview loaded:', { styleKey, sizeKB: Math.round(buffer.length / 1024) });
      }
    } catch { /* continue without */ }

    // Mark all pages as generating
    await supabase
      .from('pages')
      .update({ illustration_status: 'generating' })
      .eq('book_id', bookId);

    await supabase
      .from('books')
      .update({ status: 'generating', cover_style: styleKey })
      .eq('id', bookId);

    // Await generation — must complete before response for Vercel compatibility
    const results = await generateAllIllustrations({
      bookId,
      pages,
      styleKey,
      characterDescription,
      characterBible,
      childPhotoBase64,
      coverImageBase64,
      stylePreviewBase64,
    });

    return NextResponse.json({ status: 'complete', total: pages.length, results });
  } catch (err) {
    console.error('Illustration generation error:', err);
    return NextResponse.json(
      { error: 'Failed to start illustration generation' },
      { status: 500 }
    );
  }
}

async function generateAllIllustrations(params: {
  bookId: string;
  pages: Array<{
    id: string;
    page_number: number;
    illustration_prompt: string | null;
    mood: string | null;
  }>;
  styleKey: ArtStyleKey;
  characterDescription: string;
  characterBible: string;
  childPhotoBase64?: string;
  coverImageBase64?: string;
  stylePreviewBase64?: string;
}): Promise<Array<{ pageNumber: number; status: string; url?: string; error?: string }>> {
  const { bookId, pages, styleKey, characterDescription, characterBible, childPhotoBase64, coverImageBase64, stylePreviewBase64 } = params;

  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: Array<{ pageNumber: number; status: string; url?: string; error?: string }> = [];
  let completedCount = 0;

  for (const page of pages) {
    const rawPrompt = page.illustration_prompt || `Scene for page ${page.page_number}`;
    const illustrationPrompt = characterBible
      ? `${characterBible}\n\n${rawPrompt}`
      : rawPrompt;
    const pageStart = Date.now();
    const pageRefsInfo = {
      photo: { present: !!childPhotoBase64, sizeKB: childPhotoBase64 ? Math.round(childPhotoBase64.length * 3 / 4 / 1024) : 0 },
      stylePreview: { present: !!stylePreviewBase64, sizeKB: stylePreviewBase64 ? Math.round(stylePreviewBase64.length * 3 / 4 / 1024) : 0 },
      cover: { present: !!coverImageBase64, sizeKB: coverImageBase64 ? Math.round(coverImageBase64.length * 3 / 4 / 1024) : 0 },
    };
    let retryCount = 0;

    try {
      const illustrationParams = {
        styleKey,
        characterDescription,
        illustrationPrompt,
        mood: page.mood || 'happy',
        pageNumber: page.page_number,
        childPhotoBase64,
        coverImageBase64,
        stylePreviewBase64,
      };

      // Generate with single retry on failure + logging
      let genResult;
      try {
        genResult = await generatePageIllustration(illustrationParams);
      } catch (firstErr) {
        console.warn(`[generate-illustrations] Page ${page.page_number} failed first attempt, retrying:`, (firstErr as Error).message);
        retryCount = 1;
        await new Promise((r) => setTimeout(r, 2000));
        genResult = await generatePageIllustration(illustrationParams);
      }

      await logGeneration({
        bookId,
        imageType: 'page',
        pageNumber: page.page_number,
        styleKey,
        modelAttempted: PRIMARY_MODEL,
        modelUsed: genResult.modelUsed,
        fallbackTriggered: genResult.modelUsed !== PRIMARY_MODEL,
        fallbackReason: genResult.modelUsed !== PRIMARY_MODEL ? 'primary model failed or returned no image' : undefined,
        referencesAttached: pageRefsInfo,
        promptLength: illustrationPrompt.length,
        durationMs: Date.now() - pageStart,
        retryCount,
        success: true,
      });

      const storagePath = `${bookId}/page-${page.page_number}.png`;
      const imageUrl = await uploadImage('illustrations', storagePath, genResult.buffer);

      await supabase
        .from('pages')
        .update({
          illustration_url: imageUrl,
          illustration_status: 'complete',
        })
        .eq('id', page.id);

      completedCount++;
      results.push({ pageNumber: page.page_number, status: 'complete', url: imageUrl });

      if (completedCount < pages.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error(`Failed to generate illustration for page ${page.page_number}:`, err);
      await logGeneration({
        bookId,
        imageType: 'page',
        pageNumber: page.page_number,
        styleKey,
        modelAttempted: PRIMARY_MODEL,
        modelUsed: 'none',
        fallbackTriggered: false,
        referencesAttached: pageRefsInfo,
        promptLength: illustrationPrompt.length,
        durationMs: Date.now() - pageStart,
        retryCount,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      await supabase
        .from('pages')
        .update({ illustration_status: 'error' })
        .eq('id', page.id);
      results.push({ pageNumber: page.page_number, status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  const allComplete = results.every((r) => r.status === 'complete');
  await supabase
    .from('books')
    .update({ status: allComplete ? 'complete' : 'review' })
    .eq('id', bookId);

  return results;
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePageIllustration, PRIMARY_MODEL } from '@/lib/ai/illustration-generator';
import { uploadImage, getImageBase64 } from '@/lib/supabase/storage';
import type { ArtStyleKey } from '@/lib/ai/prompts/style-references';
import { logGeneration } from '@/lib/ai/generation-logger';
import { visualBibleToPromptBlock, type VisualBible } from '@/lib/ai/visual-bible';
import { checkBookFullyComplete, triggerSuccessEmail, triggerFailureEmail } from '@/lib/email/book-completion-trigger';
import { verifyPageIdentity } from '@/lib/ai/identity-verifier';
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

    if (book.status === 'failed') {
      console.warn(`[generate-illustrations] Book ${bookId} already failed, aborting`);
      return NextResponse.json({ error: 'Book already marked failed' }, { status: 410 });
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

    // Load Visual Bible if available
    const rawVisualBible = bookMeta.visual_bible as VisualBible | undefined;
    const visualBibleBlock = rawVisualBible ? visualBibleToPromptBlock(rawVisualBible) : undefined;
    console.log('[generate-illustrations] Visual Bible:', {
      present: !!rawVisualBible,
      blockLength: visualBibleBlock?.length || 0,
    });

    // Load character crops if available
    const cropMeta = bookMeta.character_crops as Array<{ name: string; storagePath: string; publicUrl: string }> | undefined;
    const characterCrops: Array<{ name: string; base64: string }> = [];
    if (cropMeta && cropMeta.length > 0) {
      for (const crop of cropMeta) {
        try {
          const cropBase64 = await getImageBase64('covers', crop.storagePath);
          characterCrops.push({ name: crop.name, base64: cropBase64 });
        } catch { /* skip failed crops */ }
      }
      console.log('[generate-illustrations] Character crops loaded:', characterCrops.length);
    }

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
      visualBibleBlock,
      characterCrops,
      rawVisualBible,
      normalizedGender,
    });

    // Check if book is fully complete → trigger email
    try {
      const hasErrors = results.some(r => r.status === 'error');
      if (hasErrors) {
        await triggerFailureEmail(bookId);
      } else {
        const completion = await checkBookFullyComplete(bookId);
        if (completion.isComplete && !completion.notificationAlreadySent) {
          await triggerSuccessEmail(bookId);
        }
      }
    } catch (emailErr) {
      console.error('[generate-illustrations] Email trigger error (non-fatal):', emailErr);
    }

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
  visualBibleBlock?: string;
  characterCrops?: Array<{ name: string; base64: string }>;
  rawVisualBible?: VisualBible;
  normalizedGender?: string;
}): Promise<Array<{ pageNumber: number; status: string; url?: string; error?: string }>> {
  const { bookId, pages, styleKey, characterDescription, characterBible, childPhotoBase64, coverImageBase64, stylePreviewBase64, visualBibleBlock, characterCrops, rawVisualBible, normalizedGender } = params;

  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const refsInfo = {
    photo: { present: !!childPhotoBase64, sizeKB: childPhotoBase64 ? Math.round(childPhotoBase64.length * 3 / 4 / 1024) : 0 },
    stylePreview: { present: !!stylePreviewBase64, sizeKB: stylePreviewBase64 ? Math.round(stylePreviewBase64.length * 3 / 4 / 1024) : 0 },
    cover: { present: !!coverImageBase64, sizeKB: coverImageBase64 ? Math.round(coverImageBase64.length * 3 / 4 / 1024) : 0 },
    visualBible: { present: !!visualBibleBlock, charCount: visualBibleBlock?.length || 0 },
    characterCrops: { count: characterCrops?.length || 0, names: characterCrops?.map(c => c.name) || [] },
  };

  // Generate ALL pages in parallel
  const settled = await Promise.allSettled(
    pages.map(async (page) => {
      const rawPrompt = page.illustration_prompt || `Scene for page ${page.page_number}`;
      const illustrationPrompt = characterBible
        ? `${characterBible}\n\n${rawPrompt}`
        : rawPrompt;
      const pageStart = Date.now();
      let retryCount = 0;

      const illustrationParams = {
        styleKey,
        characterDescription,
        illustrationPrompt,
        mood: page.mood || 'happy',
        pageNumber: page.page_number,
        childPhotoBase64,
        coverImageBase64,
        stylePreviewBase64,
        visualBibleBlock,
        characterCrops,
      };

      // Generate with identity verification retry loop (up to 3 attempts)
      const MAX_IDENTITY_ATTEMPTS = 3;
      let identityAttempt = 0;
      let genResult;
      let lastVerification: { passes: boolean; reason?: string } | null = null;

      while (identityAttempt < MAX_IDENTITY_ATTEMPTS) {
        identityAttempt++;

        try {
          genResult = await generatePageIllustration(illustrationParams);
        } catch (genErr) {
          if (identityAttempt < MAX_IDENTITY_ATTEMPTS) {
            console.warn(`[generate-illustrations] Page ${page.page_number} gen failed attempt ${identityAttempt}, retrying:`, (genErr as Error).message);
            retryCount++;
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw genErr;
        }

        // Verify identity if Visual Bible is available
        if (!rawVisualBible) break;

        const verifyStart = Date.now();
        lastVerification = await verifyPageIdentity({
          pageImageBuffer: genResult.buffer,
          visualBible: rawVisualBible,
          childGender: normalizedGender || 'male',
        });

        await logGeneration({
          bookId,
          imageType: 'page' as const,
          pageNumber: page.page_number,
          styleKey,
          modelAttempted: 'gemini-2.5-flash',
          modelUsed: 'gemini-2.5-flash',
          fallbackTriggered: false,
          referencesAttached: {},
          durationMs: Date.now() - verifyStart,
          success: true,
          errorMessage: lastVerification.passes ? undefined : lastVerification.reason,
        });

        if (lastVerification.passes) break;

        if (identityAttempt < MAX_IDENTITY_ATTEMPTS) {
          console.warn(`[generate-illustrations] Identity check failed page ${page.page_number} attempt ${identityAttempt}: ${lastVerification.reason}`);
          retryCount++;
        }
      }

      if (lastVerification && !lastVerification.passes) {
        console.error(`[generate-illustrations] Identity check FAILED ALL ${MAX_IDENTITY_ATTEMPTS} attempts on page ${page.page_number}. Accepting last attempt.`);
      }

      const finalResult = genResult!;

      await logGeneration({
        bookId,
        imageType: 'page',
        pageNumber: page.page_number,
        styleKey,
        modelAttempted: PRIMARY_MODEL,
        modelUsed: finalResult.modelUsed,
        fallbackTriggered: finalResult.modelUsed !== PRIMARY_MODEL,
        fallbackReason: finalResult.modelUsed !== PRIMARY_MODEL ? 'primary model failed or returned no image' : undefined,
        referencesAttached: refsInfo,
        promptLength: illustrationPrompt.length,
        durationMs: Date.now() - pageStart,
        retryCount,
        success: true,
      });

      const storagePath = `${bookId}/page-${page.page_number}.png`;
      const imageUrl = await uploadImage('illustrations', storagePath, finalResult.buffer);

      await supabase
        .from('pages')
        .update({ illustration_url: imageUrl, illustration_status: 'complete' })
        .eq('id', page.id);

      return { pageNumber: page.page_number, status: 'complete' as const, url: imageUrl };
    })
  );

  const results: Array<{ pageNumber: number; status: string; url?: string; error?: string }> = [];
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    const page = pages[i];
    if (s.status === 'fulfilled') {
      results.push(s.value);
    } else {
      const errMsg = s.reason instanceof Error ? s.reason.message : String(s.reason);
      console.error(`Failed to generate illustration for page ${page.page_number}:`, errMsg);
      await logGeneration({
        bookId,
        imageType: 'page',
        pageNumber: page.page_number,
        styleKey,
        modelAttempted: PRIMARY_MODEL,
        modelUsed: 'none',
        fallbackTriggered: false,
        referencesAttached: refsInfo,
        promptLength: 0,
        durationMs: 0,
        retryCount: 0,
        success: false,
        errorMessage: errMsg,
      });
      await supabase
        .from('pages')
        .update({ illustration_status: 'error' })
        .eq('id', page.id);
      results.push({ pageNumber: page.page_number, status: 'error', error: errMsg });
    }
  }

  const allComplete = results.every((r) => r.status === 'complete');
  await supabase
    .from('books')
    .update({ status: allComplete ? 'complete' : 'review' })
    .eq('id', bookId);

  return results;
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePageIllustration } from '@/lib/ai/illustration-generator';
import { uploadImage, getImageBase64 } from '@/lib/supabase/storage';
import type { ArtStyleKey } from '@/lib/ai/prompts/style-references';

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

    const styleKey = (selectedCover?.style_name || 'storybook') as ArtStyleKey;
    const characterDescription =
      (book.metadata as Record<string, string>)?.character_description ||
      `A ${book.child_age}-year-old child named ${book.child_name}`;

    // Load reference images for Nano Banana Pro
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

    let coverImageBase64: string | undefined;
    if (selectedCover?.image_url) {
      try {
        const coverPath = `${bookId}/cover-${styleKey}.png`;
        coverImageBase64 = await getImageBase64('covers', coverPath);
      } catch { /* continue without */ }
    }

    // Mark all pages as generating
    await supabase
      .from('pages')
      .update({ illustration_status: 'generating' })
      .eq('book_id', bookId);

    await supabase
      .from('books')
      .update({ status: 'generating', cover_style: styleKey })
      .eq('id', bookId);

    // Background generation
    generateAllIllustrations({
      bookId,
      pages,
      styleKey,
      characterDescription,
      childPhotoBase64,
      coverImageBase64,
    });

    return NextResponse.json({ status: 'generating', total: pages.length });
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
  childPhotoBase64?: string;
  coverImageBase64?: string;
}) {
  const { bookId, pages, styleKey, characterDescription, childPhotoBase64, coverImageBase64 } = params;

  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let completedCount = 0;

  for (const page of pages) {
    try {
      const imageBuffer = await generatePageIllustration({
        styleKey,
        characterDescription,
        illustrationPrompt: page.illustration_prompt || `Scene for page ${page.page_number}`,
        mood: page.mood || 'happy',
        pageNumber: page.page_number,
        childPhotoBase64,
        coverImageBase64,
      });

      const storagePath = `${bookId}/page-${page.page_number}.png`;
      const imageUrl = await uploadImage('illustrations', storagePath, imageBuffer);

      await supabase
        .from('pages')
        .update({
          illustration_url: imageUrl,
          illustration_status: 'complete',
        })
        .eq('id', page.id);

      completedCount++;

      if (completedCount < pages.length) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    } catch (err) {
      console.error(`Failed to generate illustration for page ${page.page_number}:`, err);
      await supabase
        .from('pages')
        .update({ illustration_status: 'error' })
        .eq('id', page.id);
    }
  }

  const { data: finalPages } = await supabase
    .from('pages')
    .select('illustration_status')
    .eq('book_id', bookId);

  const allComplete = finalPages?.every((p) => p.illustration_status === 'complete');
  await supabase
    .from('books')
    .update({ status: allComplete ? 'complete' : 'review' })
    .eq('id', bookId);
}

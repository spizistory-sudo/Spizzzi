import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCoverImage } from '@/lib/ai/illustration-generator';
import { ART_STYLES, ART_STYLE_KEYS } from '@/lib/ai/prompts/style-references';
import { uploadImage, getImageBase64 } from '@/lib/supabase/storage';

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

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !book) {
      console.error('[generate-cover] Book fetch failed:', { bookId, bookError });
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookMeta = (book.metadata || {}) as Record<string, string>;
    const childGender = bookMeta.childGender || 'male';
    const genderDesc = childGender === 'female'
      ? `A ${book.child_age}-year-old girl (female child) named ${book.child_name}. She has typical feminine features.`
      : `A ${book.child_age}-year-old boy (male child) named ${book.child_name}. He has short hair and wears typical boy clothing like a t-shirt and pants.`;
    const characterDescription = bookMeta.character_description || genderDesc;

    const characterBible = bookMeta.character_bible || '';
    const rawThemeDescription =
      (book.metadata as Record<string, string>)?.themeSlug || 'adventure';
    const themeDescription = characterBible
      ? `${characterBible}\n\n${rawThemeDescription}`
      : rawThemeDescription;

    console.log('[generate-cover] Starting for book:', {
      bookId,
      title: book.title,
      characterDescription: characterDescription.substring(0, 80) + '...',
    });

    // Load child photo as reference image
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
        console.log('[generate-cover] Loaded child photo reference, length:', childPhotoBase64.length);
      } catch (err) {
        console.warn('[generate-cover] Could not load child photo, continuing without:', err);
      }
    }

    // Generate 3 covers in parallel (Promise.allSettled — partial success is OK)
    console.log(`[generate-cover] Starting ${ART_STYLE_KEYS.length} covers in parallel...`);

    const settled = await Promise.allSettled(
      ART_STYLE_KEYS.map(async (styleKey) => {
        console.log(`[generate-cover] Generating ${styleKey} cover...`);
        const imageBuffer = await generateCoverImage({
          styleKey,
          bookTitle: book.title,
          characterDescription,
          themeDescription,
          childPhotoBase64,
        });

        const storagePath = `${bookId}/cover-${styleKey}.png`;
        const imageUrl = await uploadImage('covers', storagePath, imageBuffer);

        const { data: cover, error: coverError } = await supabase
          .from('cover_options')
          .insert({
            book_id: bookId,
            style_name: styleKey,
            image_url: imageUrl,
            style_prompt: ART_STYLES[styleKey].stylePrompt,
          })
          .select()
          .single();

        if (coverError) throw coverError;
        console.log(`[generate-cover] ${styleKey} saved, id:`, cover.id);
        return cover;
      })
    );

    const coverResults = settled
      .filter((r): r is PromiseFulfilledResult<typeof settled extends Array<PromiseSettledResult<infer T>> ? T : never> => r.status === 'fulfilled')
      .map((r) => r.value);

    const errors = settled
      .map((r, i) => r.status === 'rejected' ? { style: ART_STYLE_KEYS[i], error: r.reason instanceof Error ? r.reason.message : String(r.reason) } : null)
      .filter(Boolean);

    if (errors.length > 0) {
      console.error('[generate-cover] Some styles failed:', errors);
    }
    console.log(`[generate-cover] ${coverResults.length}/${ART_STYLE_KEYS.length} covers succeeded`);

    if (coverResults.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any covers', details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ covers: coverResults });
  } catch (err) {
    console.error('[generate-cover] Unhandled error:', err);
    return NextResponse.json({ error: 'Failed to generate covers' }, { status: 500 });
  }
}

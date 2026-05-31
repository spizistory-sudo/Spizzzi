import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCoverImage } from '@/lib/ai/illustration-generator';
import { ART_STYLES, ART_STYLE_KEYS, type ArtStyleKey } from '@/lib/ai/prompts/style-references';
import { uploadImage, getImageBase64 } from '@/lib/supabase/storage';
import * as fs from 'fs';
import * as path from 'path';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookId } = await req.json();
    if (!bookId) return NextResponse.json({ error: 'bookId is required' }, { status: 400 });

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

    const bookMeta = (book.metadata || {}) as Record<string, unknown>;

    // Resolve chosen style from metadata
    const rawStyleKey = (bookMeta.style_key as string) || (bookMeta.styleKey as string);
    const validKeys = ART_STYLE_KEYS as string[];
    const styleKey = (rawStyleKey && validKeys.includes(rawStyleKey) ? rawStyleKey : 'watercolor') as ArtStyleKey;
    if (rawStyleKey && !validKeys.includes(rawStyleKey)) {
      console.warn('[generate-cover] Invalid styleKey, defaulting to watercolor:', rawStyleKey);
    }
    console.log('[generate-cover] Generating single cover in style:', styleKey);

    // Build character description with gender lock
    const childProfile = (bookMeta.child_profile as Record<string, unknown>) || {};
    const profileGender = (childProfile.gender as string) || (bookMeta.childGender as string) || 'male';
    const childGender = profileGender === 'boy' ? 'male' : profileGender === 'girl' ? 'female' : profileGender;

    const photoDescription = (bookMeta.character_description as string) || '';
    const storyBible = (bookMeta.character_bible as string) || '';

    const genderLock = childGender === 'female'
      ? `THIS CHARACTER IS A GIRL — feminine face, feminine features. NOT a boy. The character is FEMALE. ${book.child_name} is a girl.`
      : childGender === 'male'
      ? `THIS CHARACTER IS A BOY — masculine face, masculine features. NOT a girl. The character is MALE. ${book.child_name} is a boy.`
      : `${book.child_name} is a child.`;

    const fallbackDescription = childGender === 'female'
      ? `A ${book.child_age}-year-old girl named ${book.child_name}. She is clearly female with feminine facial features, feminine hair, and feminine body proportions.`
      : childGender === 'male'
      ? `A ${book.child_age}-year-old boy named ${book.child_name}. He is clearly male with masculine facial features, short masculine hair, and masculine body proportions.`
      : `A ${book.child_age}-year-old child named ${book.child_name}.`;

    const characterDescription = [genderLock, photoDescription || fallbackDescription, storyBible].filter(Boolean).join('\n\n');

    const rawThemeDescription = (bookMeta.themeSlug as string) || 'adventure';
    const themeDescription = storyBible ? `${storyBible}\n\n${rawThemeDescription}` : rawThemeDescription;

    console.log('[generate-cover] GENDER LOCK:', {
      bookId, gender: childGender,
      photoDescLength: photoDescription.length,
      storyBibleLength: storyBible.length,
    });

    // Load child photo
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
        console.log('[generate-cover] Child photo loaded, length:', childPhotoBase64.length);
      } catch (err) {
        console.warn('[generate-cover] Could not load child photo:', err);
      }
    }

    // Load style preview PNG
    let stylePreviewBase64: string | undefined;
    try {
      const previewPath = path.join(process.cwd(), 'public', 'images', 'styles', `${styleKey}.png`);
      if (fs.existsSync(previewPath)) {
        const buffer = fs.readFileSync(previewPath);
        stylePreviewBase64 = buffer.toString('base64');
        console.log('[generate-cover] Style preview loaded:', { styleKey, sizeKB: Math.round(buffer.length / 1024) });
      } else {
        console.warn('[generate-cover] Style preview not found:', previewPath);
      }
    } catch (err) {
      console.warn('[generate-cover] Failed to load style preview:', err);
    }

    // Generate ONE cover in chosen style
    const imageBuffer = await generateCoverImage({
      styleKey,
      bookTitle: book.title,
      characterDescription,
      themeDescription,
      childPhotoBase64,
      stylePreviewBase64,
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
        is_selected: true,
      })
      .select()
      .single();

    if (coverError) {
      console.error('[generate-cover] Failed to save cover:', coverError);
      return NextResponse.json({ error: 'Failed to save cover' }, { status: 500 });
    }

    console.log('[generate-cover] Single cover generated and auto-selected:', { coverId: cover.id, styleKey });
    return NextResponse.json({ covers: [cover] });
  } catch (err) {
    console.error('[generate-cover] Unhandled error:', err);
    return NextResponse.json({ error: 'Failed to generate cover' }, { status: 500 });
  }
}

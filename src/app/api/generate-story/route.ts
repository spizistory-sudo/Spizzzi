import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStory } from '@/lib/ai/story-generator';
import { generateStorySchema } from '@/lib/utils/validators';
import { THEMES } from '@/lib/ai/prompts/story-themes';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[generate-story] Received body:', JSON.stringify(body, null, 2));
    const parsed = generateStorySchema.safeParse(body);
    if (!parsed.success) {
      console.log('[generate-story] Validation failed:', JSON.stringify(parsed.error.flatten(), null, 2));
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { themeSlug, childName, childAge, childTraits, language, customPrompt } = parsed.data;
    const isCustom = themeSlug === '__custom__';

    // Validate theme exists (unless custom mode)
    if (!isCustom) {
      const theme = THEMES[themeSlug];
      if (!theme) {
        return NextResponse.json({ error: 'Unknown theme' }, { status: 400 });
      }
    }

    const story = await generateStory({
      themeSlug,
      childName,
      childAge,
      childTraits,
      language,
      customPrompt,
    });

    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        user_id: user.id,
        title: story.title,
        child_name: childName,
        child_age: childAge,
        child_traits: childTraits,
        creation_mode: isCustom ? 'custom' : 'template',
        custom_prompt: isCustom ? customPrompt : null,
        status: 'review',
        metadata: { language, themeSlug },
      })
      .select()
      .single();

    if (bookError) {
      console.error('Error saving book:', bookError);
      return NextResponse.json({ error: 'Failed to save book' }, { status: 500 });
    }

    const pageRecords = story.pages.map((page) => ({
      book_id: book.id,
      page_number: page.page_number,
      text_content: page.text,
      illustration_prompt: page.illustration_prompt,
      mood: page.mood,
    }));

    const { error: pagesError } = await supabase.from('pages').insert(pageRecords);
    if (pagesError) {
      console.error('Error saving pages:', pagesError);
      return NextResponse.json(
        { error: 'Failed to save pages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookId: book.id,
      story,
    });
  } catch (err) {
    console.error('Story generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate story. Please try again.' },
      { status: 500 }
    );
  }
}

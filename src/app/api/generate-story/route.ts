import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStory, generateStructuredHebrewStory } from '@/lib/ai/story-generator';
import { generateStory as generateEnglishStory } from '@/lib/ai/story-generation-en';
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

    // NEW: detect structured Hebrew request and route to Claude
    if (
      body.categoryId &&
      body.language === 'he' &&
      process.env.STRUCTURED_HEBREW_ENABLED !== 'false'
    ) {
      return await handleStructuredHebrewStory(supabase, user.id, body);
    }

    // NEW: detect English structured request (curated catalog) and route to Claude Opus
    if (
      body.storyId &&
      body.language === 'en'
    ) {
      return await handleStructuredEnglishStory(supabase, user.id, body);
    }

    // LEGACY LOGIC: theme-based English (Gemini) or Hebrew custom-prompt (Gemini)
    const parsed = generateStorySchema.safeParse(body);
    if (!parsed.success) {
      console.log('[generate-story] Validation failed:', JSON.stringify(parsed.error.flatten(), null, 2));
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { themeSlug, childName, childAge, childTraits, language, customPrompt } = parsed.data;
    console.log('[generate-story] LANGUAGE:', language, '| raw body.language:', body.language);
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

// ═══════════════════════════════════════════════════════════
// Structured Hebrew story handler (Claude)
// ═══════════════════════════════════════════════════════════

async function handleStructuredHebrewStory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: Record<string, unknown>
) {
  console.log('[generate-story] Routing to structured Hebrew (Claude)');

  try {
    const result = await generateStructuredHebrewStory({
      childName: body.childName as string,
      childAge: body.childAge as number,
      childGender: (body.childGender as 'male' | 'female') || 'male',
      traits: (body.traits as string[]) || [],
      traitDetails: (body.traitDetails as Record<string, string>) || {},
      categoryId: body.categoryId as string,
      topicId: (body.topicId as string) || 'surprise',
    });

    // Insert book — mirrors existing flow's insert pattern
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        user_id: userId,
        title: result.story.title,
        child_name: body.childName as string,
        child_age: body.childAge as number,
        child_traits: (body.traits as string[]) || [],
        creation_mode: 'custom' as const,
        custom_prompt: null,
        status: 'review',
        metadata: {
          language: 'he',
          categoryId: body.categoryId,
          topicId: body.topicId,
          dynamicKnobs: result.knobs,
          ageRules: {
            ageRange: result.ageRules.ageRange,
            rhymeRequired: result.ageRules.rhymeRequired,
            niqqudFull: result.ageRules.niqqudFull,
            niqqudPartial: result.ageRules.niqqudPartial,
          },
          validationIssues: result.validationIssues,
        },
      })
      .select()
      .single();

    if (bookError) {
      console.error('[generate-story] Error saving structured Hebrew book:', bookError);
      return NextResponse.json({ error: 'Failed to save book' }, { status: 500 });
    }

    // Insert pages — mirrors existing flow's page shape
    const pageRecords = result.story.spreads.map((spread) => ({
      book_id: book.id,
      page_number: spread.spread_number,
      text_content: spread.text,
      text_for_tts: spread.text_for_tts,
      illustration_prompt: spread.illustration_prompt,
    }));

    const { error: pagesError } = await supabase.from('pages').insert(pageRecords);
    if (pagesError) {
      console.error('[generate-story] Error saving structured Hebrew pages:', pagesError);
      return NextResponse.json({ error: 'Failed to save pages' }, { status: 500 });
    }

    return NextResponse.json({
      bookId: book.id,
      story: {
        title: result.story.title,
        pages: result.story.spreads.map((s) => ({
          page_number: s.spread_number,
          text: s.text,
          illustration_prompt: s.illustration_prompt,
          mood: 'magical',
        })),
      },
      attempts: result.attempts,
      validationIssues: result.validationIssues,
    });
  } catch (err) {
    console.error('[generate-story] Structured Hebrew error:', err);
    return NextResponse.json(
      { error: 'Failed to generate structured Hebrew story.' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// Structured English story handler (Claude Opus)
// ═══════════════════════════════════════════════════════════

async function handleStructuredEnglishStory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: Record<string, unknown>
) {
  console.log('[generate-story] Routing to structured English (Claude Opus)');

  try {
    const childProfile = {
      name: body.name as string || body.childName as string,
      age: body.age as number || body.childAge as number,
      gender: (body.gender as 'boy' | 'girl' | 'nonbinary') || 'boy',
      traits: (body.traits as string[]) || (body.childTraits as string[]) || [],
      interests: (body.interests as string[]) || [],
    };

    const result = await generateEnglishStory(
      childProfile,
      body.storyId as string,
      process.env.ANTHROPIC_API_KEY!,
      'claude-opus-4-7',
    );

    // Insert book — mirrors Hebrew structured pattern
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        user_id: userId,
        title: result.title,
        child_name: childProfile.name,
        child_age: childProfile.age,
        child_traits: childProfile.traits,
        creation_mode: 'curated_en',
        custom_prompt: null,
        status: 'review',
        metadata: {
          language: 'en',
          story_template_id: body.storyId,
          child_profile: childProfile,
          main_theme: result.metadata?.main_theme,
          key_message: result.metadata?.key_message,
        },
      })
      .select()
      .single();

    if (bookError) {
      console.error('[generate-story] Error saving English structured book:', bookError);
      return NextResponse.json({ error: 'Failed to save book' }, { status: 500 });
    }

    // Insert pages — mirrors Hebrew structured pattern
    const pageRecords = result.spreads.map((spread) => ({
      book_id: book.id,
      page_number: spread.spread_number,
      text_content: spread.text,
      text_for_tts: spread.text, // English: same as text (no niqqud stripping needed)
      illustration_prompt: spread.illustration_prompt,
    }));

    const { error: pagesError } = await supabase.from('pages').insert(pageRecords);
    if (pagesError) {
      console.error('[generate-story] Error saving English structured pages:', pagesError);
      return NextResponse.json({ error: 'Failed to save pages' }, { status: 500 });
    }

    // Return same shape as Hebrew structured flow for wizard compatibility
    return NextResponse.json({
      bookId: book.id,
      story: {
        title: result.title,
        pages: result.spreads.map((s) => ({
          page_number: s.spread_number,
          text: s.text,
          illustration_prompt: s.illustration_prompt,
          mood: 'magical',
        })),
      },
    });
  } catch (err) {
    console.error('[generate-story] Structured English error:', err);
    return NextResponse.json(
      { error: 'Failed to generate English story.' },
      { status: 500 }
    );
  }
}

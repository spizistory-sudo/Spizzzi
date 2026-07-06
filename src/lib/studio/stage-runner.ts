import { getAnthropicClient } from '@/lib/anthropic/client';
import { createClient } from '@supabase/supabase-js';
import { getBook, updateBookStatus, type LibraryBook, type LibraryBookStatus } from './db';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role credentials');
  return createClient(url, key);
}

export async function loadKnowledge(ageBand: string): Promise<string> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('library_knowledge')
    .select('title, content')
    .eq('active', true)
    .or(`age_band.eq.all,age_band.eq.${ageBand}`);

  if (error) throw new Error(`Failed to load knowledge: ${error.message}`);
  if (!data || data.length === 0) return '';

  return data.map(row => `--- ${row.title} ---\n${row.content}`).join('\n\n');
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

interface StageConfig {
  bookId: string;
  fromStatus: LibraryBookStatus;
  activeStatus: LibraryBookStatus;
  successStatus: LibraryBookStatus;
  model: string;
  maxTokens: number;
  buildSystemPrompt: (knowledge: string) => string;
  buildUserMessage: (book: LibraryBook) => string;
  resultField: 'brief' | 'story' | 'checker_report';
}

export async function runStage(config: StageConfig): Promise<LibraryBook> {
  const {
    bookId, fromStatus, activeStatus, successStatus,
    model, maxTokens,
    buildSystemPrompt, buildUserMessage, resultField,
  } = config;

  const book = await getBook(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);

  if (book.status !== fromStatus) {
    console.log(`[stage-runner] Book ${bookId} is '${book.status}', expected '${fromStatus}' — skipping duplicate`);
    return book;
  }

  await updateBookStatus(bookId, activeStatus);
  console.log(`[stage-runner] Book ${bookId} → ${activeStatus}`);

  try {
    const knowledge = await loadKnowledge(book.spark.age_band);
    const systemPrompt = buildSystemPrompt(knowledge);
    const userMessage = buildUserMessage(book);

    const anthropic = getAnthropicClient();

    let parsed: Record<string, unknown> | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const messages: Array<{ role: 'user'; content: string }> = [{
        role: 'user',
        content: attempt === 0
          ? userMessage
          : `${userMessage}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanatory prose before or after the JSON object.`,
      }];

      console.log(`[stage-runner] Calling ${model} (attempt ${attempt + 1})...`);
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      });

      const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const cleaned = stripCodeFences(raw);

      try {
        parsed = JSON.parse(cleaned);
        break;
      } catch (parseErr) {
        console.warn(`[stage-runner] JSON parse failed (attempt ${attempt + 1}):`, parseErr instanceof Error ? parseErr.message : parseErr);
        if (attempt === 1) {
          throw new Error(`JSON parse failed after 2 attempts. Raw output (first 500 chars): ${cleaned.slice(0, 500)}`);
        }
      }
    }

    if (!parsed) throw new Error('No parsed result');

    const result = await updateBookStatus(bookId, successStatus, { [resultField]: parsed });
    console.log(`[stage-runner] Book ${bookId} → ${successStatus}`);
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[stage-runner] Stage failed for ${bookId}:`, errorMsg);
    await updateBookStatus(bookId, 'failed', { last_error: errorMsg });
    throw err;
  }
}

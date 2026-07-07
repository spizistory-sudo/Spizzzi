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
  console.log(`[stage-runner] Loading knowledge for age_band=${ageBand}...`);
  const { data, error } = await db
    .from('library_knowledge')
    .select('title, content')
    .eq('active', true)
    .or(`age_band.eq.all,age_band.eq.${ageBand}`);

  if (error) throw new Error(`Failed to load knowledge: ${error.message}`);
  if (!data || data.length === 0) {
    console.warn('[stage-runner] No knowledge rows found — bible may not be seeded');
    return '';
  }

  console.log(`[stage-runner] Loaded ${data.length} knowledge row(s): ${data.map(r => r.title).join(', ')}`);
  return data.map(row => `--- ${row.title} ---\n${row.content}`).join('\n\n');
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

export interface StageConfig {
  bookId: string;
  fromStatus: LibraryBookStatus | LibraryBookStatus[];
  activeStatus: LibraryBookStatus;
  successStatus: LibraryBookStatus;
  model: string;
  maxTokens: number;
  useStreaming?: boolean;
  buildSystemPrompt: (knowledge: string) => string;
  buildUserMessage: (book: LibraryBook) => string;
  resultField: 'brief' | 'story' | 'checker_report';
}

async function callAnthropicStreaming(
  model: string,
  maxTokens: number,
  systemPrompt: string,
  userMessage: string,
): Promise<{ text: string; stopReason: string; inputTokens: number; outputTokens: number }> {
  const anthropic = getAnthropicClient();
  console.log(`[stage-runner] Starting streaming call to ${model} (max_tokens=${maxTokens})...`);
  const startTime = Date.now();

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const response = await stream.finalMessage();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const stopReason = response.stop_reason || 'unknown';
  const inputTokens = response.usage?.input_tokens || 0;
  const outputTokens = response.usage?.output_tokens || 0;

  console.log(`[stage-runner] Stream complete in ${elapsed}s. Output: ${text.length} chars. Stop: ${stopReason}. Tokens: ${inputTokens}in/${outputTokens}out`);
  return { text, stopReason, inputTokens, outputTokens };
}

async function callAnthropicDirect(
  model: string,
  maxTokens: number,
  systemPrompt: string,
  userMessage: string,
): Promise<{ text: string; stopReason: string; inputTokens: number; outputTokens: number }> {
  const anthropic = getAnthropicClient();
  console.log(`[stage-runner] Calling ${model} (max_tokens=${maxTokens})...`);
  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const stopReason = response.stop_reason || 'unknown';
  const inputTokens = response.usage?.input_tokens || 0;
  const outputTokens = response.usage?.output_tokens || 0;

  console.log(`[stage-runner] Response in ${elapsed}s. Output: ${text.length} chars. Stop: ${stopReason}. Tokens: ${inputTokens}in/${outputTokens}out`);
  return { text, stopReason, inputTokens, outputTokens };
}

export async function runStage(config: StageConfig): Promise<LibraryBook> {
  const {
    bookId, fromStatus, activeStatus, successStatus,
    model, maxTokens, useStreaming,
    buildSystemPrompt, buildUserMessage, resultField,
  } = config;

  console.log(`[stage-runner] === Starting stage: ${fromStatus} → ${activeStatus} → ${successStatus} for book ${bookId} ===`);

  const book = await getBook(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  console.log(`[stage-runner] Book loaded. Current status: '${book.status}', spark.age_band: '${book.spark.age_band}'`);

  const acceptedStatuses = Array.isArray(fromStatus) ? fromStatus : [fromStatus];
  if (!acceptedStatuses.includes(book.status)) {
    console.log(`[stage-runner] Book ${bookId} is '${book.status}', expected '${acceptedStatuses.join('|')}' — skipping duplicate`);
    return book;
  }

  if (book.status !== activeStatus) {
    await updateBookStatus(bookId, activeStatus);
    console.log(`[stage-runner] Status updated: ${bookId} → '${activeStatus}'`);
  }

  try {
    const knowledge = await loadKnowledge(book.spark.age_band);
    console.log(`[stage-runner] Knowledge loaded (${knowledge.length} chars)`);

    const systemPrompt = buildSystemPrompt(knowledge);
    const userMessage = buildUserMessage(book);
    console.log(`[stage-runner] Prompts built. System: ${systemPrompt.length} chars, User: ${userMessage.length} chars`);

    const callFn = useStreaming ? callAnthropicStreaming : callAnthropicDirect;

    let parsed: Record<string, unknown> | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const message = attempt === 0
        ? userMessage
        : `${userMessage}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanatory prose before or after the JSON object.`;

      console.log(`[stage-runner] Attempt ${attempt + 1}/2...`);
      const result = await callFn(model, maxTokens, systemPrompt, message);

      if (result.stopReason === 'max_tokens') {
        const errorMsg = `Output truncated (stop_reason=max_tokens). Got ${result.text.length} chars / ${result.outputTokens} tokens before cutoff. Raise max_tokens (currently ${maxTokens}).`;
        console.error(`[stage-runner] TRUNCATION: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const cleaned = stripCodeFences(result.text);

      try {
        parsed = JSON.parse(cleaned);
        console.log(`[stage-runner] JSON parsed successfully (${Object.keys(parsed!).length} top-level keys)`);
        break;
      } catch (parseErr) {
        console.warn(`[stage-runner] JSON parse failed (attempt ${attempt + 1}): ${parseErr instanceof Error ? parseErr.message : parseErr}`);
        console.warn(`[stage-runner] Raw output preview: ${cleaned.slice(0, 400)}...`);
        if (attempt === 1) {
          throw new Error(`JSON parse failed after 2 attempts (stop_reason=${result.stopReason}, ${result.text.length} chars). Preview: ${cleaned.slice(0, 500)}`);
        }
      }
    }

    if (!parsed) throw new Error('No parsed result');

    console.log(`[stage-runner] Saving ${resultField} and advancing to '${successStatus}'...`);
    const updated = await updateBookStatus(bookId, successStatus, { [resultField]: parsed });
    console.log(`[stage-runner] === Stage complete: ${bookId} → '${successStatus}' ===`);
    return updated;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[stage-runner] === Stage FAILED for ${bookId}: ${errorMsg} ===`);
    await updateBookStatus(bookId, 'failed', { last_error: errorMsg });
    throw err;
  }
}

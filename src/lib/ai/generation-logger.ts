import { createClient } from '@supabase/supabase-js';

export type CallType =
  | 'cover' | 'page' | 'identity_check'
  | 'character_sheet' | 'story' | 'curation'
  | 'narration' | 'photo_analysis' | 'description_normalization'
  | 'visual_bible' | 'character_crop';

export type Provider = 'google' | 'anthropic' | 'openai' | 'fal' | 'elevenlabs';

export type GenerationLogEntry = {
  bookId: string;
  imageType: CallType;
  pageNumber?: number;
  styleKey?: string;
  modelAttempted: string;
  modelUsed: string;
  fallbackTriggered: boolean;
  fallbackReason?: string;
  referencesAttached: Record<string, unknown>;
  promptLength?: number;
  durationMs?: number;
  retryCount?: number;
  success: boolean;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  characters?: number;
  units?: number;
  provider?: Provider;
};

function deriveProvider(model: string): Provider | undefined {
  if (model.startsWith('gemini')) return 'google';
  if (model.startsWith('gpt-image') || model.startsWith('dall-e')) return 'openai';
  if (model.startsWith('flux') || model.startsWith('fal')) return 'fal';
  if (model.startsWith('claude')) return 'anthropic';
  if (model.includes('eleven') || model.includes('v2') || model.includes('v3')) return 'elevenlabs';
  return undefined;
}

export async function logGeneration(entry: GenerationLogEntry): Promise<void> {
  const effectiveProvider = entry.provider || deriveProvider(entry.modelUsed) || deriveProvider(entry.modelAttempted);
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error } = await supabase.from('generation_log').insert({
      book_id: entry.bookId,
      image_type: entry.imageType,
      page_number: entry.pageNumber ?? null,
      style_key: entry.styleKey ?? null,
      model_attempted: entry.modelAttempted,
      model_used: entry.modelUsed,
      fallback_triggered: entry.fallbackTriggered,
      fallback_reason: entry.fallbackReason ?? null,
      references_attached: entry.referencesAttached,
      prompt_length: entry.promptLength ?? null,
      duration_ms: entry.durationMs ?? null,
      retry_count: entry.retryCount ?? 0,
      success: entry.success,
      error_message: entry.errorMessage ?? null,
      input_tokens: entry.inputTokens ?? null,
      output_tokens: entry.outputTokens ?? null,
      characters: entry.characters ?? null,
      units: entry.units ?? 1,
      provider: effectiveProvider ?? null,
    });
    if (error) {
      console.error(`[generation-logger] INSERT FAILED: ${error.message} (image_type=${entry.imageType}, model=${entry.modelUsed}, book=${entry.bookId})`);
    } else {
      console.log(
        `[generation-logger] ${entry.imageType}${entry.pageNumber != null ? ' p' + entry.pageNumber : ''} ` +
        `attempted=${entry.modelAttempted} used=${entry.modelUsed} ` +
        `fallback=${entry.fallbackTriggered} success=${entry.success} ` +
        `retries=${entry.retryCount ?? 0} duration=${entry.durationMs ?? 0}ms` +
        `${entry.provider ? ` provider=${entry.provider}` : ''}`
      );
    }
  } catch (err) {
    console.error('[generation-logger] INSERT FAILED (exception):', err instanceof Error ? err.message : err);
  }
}

import { createClient } from '@supabase/supabase-js';

export type GenerationLogEntry = {
  bookId: string;
  imageType: 'cover' | 'page';
  pageNumber?: number;
  styleKey?: string;
  modelAttempted: string;
  modelUsed: string;
  fallbackTriggered: boolean;
  fallbackReason?: string;
  referencesAttached: {
    photo?: { present: boolean; sizeKB?: number };
    stylePreview?: { present: boolean; sizeKB?: number };
    cover?: { present: boolean; sizeKB?: number };
  };
  promptLength?: number;
  durationMs?: number;
  retryCount?: number;
  success: boolean;
  errorMessage?: string;
};

export async function logGeneration(entry: GenerationLogEntry): Promise<void> {
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
    });
    if (error) {
      console.error('[generation-logger] Failed to insert log:', error.message);
    } else {
      console.log(
        `[generation-logger] ${entry.imageType}${entry.pageNumber != null ? ' p' + entry.pageNumber : ''} ` +
        `attempted=${entry.modelAttempted} used=${entry.modelUsed} ` +
        `fallback=${entry.fallbackTriggered} success=${entry.success} ` +
        `retries=${entry.retryCount ?? 0} duration=${entry.durationMs ?? 0}ms`
      );
    }
  } catch (err) {
    console.error('[generation-logger] Unexpected error:', err);
  }
}

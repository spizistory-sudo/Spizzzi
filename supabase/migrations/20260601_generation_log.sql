-- Generation log: one row per image generation attempt (cover + pages)
-- Run this in the Supabase Dashboard SQL editor

CREATE TABLE IF NOT EXISTS public.generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  image_type text NOT NULL CHECK (image_type IN ('cover', 'page')),
  page_number integer,
  style_key text,
  model_attempted text NOT NULL,
  model_used text NOT NULL,
  fallback_triggered boolean NOT NULL DEFAULT false,
  fallback_reason text,
  references_attached jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_length integer,
  duration_ms integer,
  retry_count integer NOT NULL DEFAULT 0,
  success boolean NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generation_log_book_id ON public.generation_log(book_id);
CREATE INDEX IF NOT EXISTS idx_generation_log_created_at ON public.generation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_log_fallback ON public.generation_log(fallback_triggered) WHERE fallback_triggered = true;

ALTER TABLE public.generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.generation_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

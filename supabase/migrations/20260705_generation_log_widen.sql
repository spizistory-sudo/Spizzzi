-- R81: Widen generation_log to support all call types + cost tracking columns
-- Run in Supabase Dashboard SQL editor

-- 1. Drop the old restrictive CHECK and add one that covers all call types
ALTER TABLE public.generation_log DROP CONSTRAINT IF EXISTS generation_log_image_type_check;
ALTER TABLE public.generation_log ADD CONSTRAINT generation_log_image_type_check
  CHECK (image_type IN (
    'cover', 'page', 'identity_check',
    'character_sheet', 'story', 'curation',
    'narration', 'photo_analysis', 'description_normalization',
    'visual_bible', 'character_crop'
  ));

-- 2. Add cost-tracking columns (all nullable — filled when available)
ALTER TABLE public.generation_log ADD COLUMN IF NOT EXISTS input_tokens integer;
ALTER TABLE public.generation_log ADD COLUMN IF NOT EXISTS output_tokens integer;
ALTER TABLE public.generation_log ADD COLUMN IF NOT EXISTS characters integer;
ALTER TABLE public.generation_log ADD COLUMN IF NOT EXISTS units integer DEFAULT 1;
ALTER TABLE public.generation_log ADD COLUMN IF NOT EXISTS provider text;

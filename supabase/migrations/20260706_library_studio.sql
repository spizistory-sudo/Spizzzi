-- Library Studio tables for the book production pipeline
-- Run in Supabase SQL Editor if not using migration CLI

-- ═══════════════════════════════════════
-- library_books — production pipeline books
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'spark'
    CHECK (status IN (
      'spark', 'developing_idea', 'idea_ready',
      'writing', 'checking', 'needs_revision',
      'illustrating', 'ready',
      'approved', 'rejected', 'failed'
    )),
  spark jsonb NOT NULL,
  brief jsonb,
  story jsonb,
  checker_report jsonb,
  revision_count int NOT NULL DEFAULT 0,
  images jsonb,
  review_verdict text CHECK (review_verdict IN ('approved', 'rejected')),
  review_notes text,
  last_error text,
  stage_history jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION library_books_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER library_books_updated_at
  BEFORE UPDATE ON library_books
  FOR EACH ROW
  EXECUTE FUNCTION library_books_update_timestamp();

-- ═══════════════════════════════════════
-- library_knowledge — bibles, lessons, mentor principles
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS library_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('bible', 'lesson', 'mentor_principles')),
  age_band text,
  title text NOT NULL,
  content text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

-- ═══════════════════════════════════════
-- RLS — deny all (server-side only via service role)
-- ═══════════════════════════════════════
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_knowledge ENABLE ROW LEVEL SECURITY;
-- No policies = deny all for anon/authenticated roles

-- Book notification tracking — prevents double-sends
-- Run this in the Supabase Dashboard SQL editor

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS notification_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_status text;

-- notification_status values: 'success_sent', 'failure_sent', or NULL (not yet sent)

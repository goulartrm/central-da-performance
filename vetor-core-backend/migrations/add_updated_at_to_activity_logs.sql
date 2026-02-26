-- Add updated_at column to activity_logs table
-- Migration: 20250226_add_updated_at_to_activity_logs

-- Add the column with a default value for existing records
ALTER TABLE activity_logs
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- For existing records, set updated_at = created_at to maintain historical accuracy
UPDATE activity_logs SET updated_at = created_at WHERE updated_at IS NOT NULL;

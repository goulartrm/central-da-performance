-- Delete notes without crm_note_id
-- These are likely manually created or from other sources

-- First, see how many will be deleted
SELECT COUNT(*) as notes_to_delete
FROM activity_logs
WHERE type = 'note'
  AND (metadata IS NULL OR NOT metadata ? 'crm_note_id');

-- Then delete them
DELETE FROM activity_logs
WHERE type = 'note'
  AND (metadata IS NULL OR NOT metadata ? 'crm_note_id');

-- Verify remaining notes
SELECT
  COUNT(*) as total_notes,
  COUNT(DISTINCT metadata->>'crm_note_id') as unique_crm_ids,
  COUNT(*) - COUNT(DISTINCT metadata->>'crm_note_id') as notes_without_crm_id
FROM activity_logs
WHERE type = 'note';

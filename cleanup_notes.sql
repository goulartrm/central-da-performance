-- Cleanup script to remove duplicate notes from activity_logs
-- Keeps only the most recent note for each crm_note_id

-- Passo 1: Ver quantas duplicatas existem
SELECT
    metadata->>'crm_note_id' as note_id,
    COUNT(*) as qtd,
    MAX(created_at) as mais_recente
FROM activity_logs
WHERE type = 'note'
  AND metadata ? 'crm_note_id'
GROUP BY metadata->>'crm_note_id'
HAVING COUNT(*) > 1
ORDER BY qtd DESC;

-- Passo 2: Deletar duplicatas, mantendo a mais recente
WITH dedup AS (
  SELECT
    id,
    metadata->>'crm_note_id' as crm_note_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY (metadata->>'crm_note_id')
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM activity_logs
  WHERE type = 'note'
    AND metadata ? 'crm_note_id'
)
DELETE FROM activity_logs
WHERE id IN (SELECT id FROM dedup WHERE rn > 1);

-- Passo 3: Verificar resultado
SELECT COUNT(*) as total_notas,
       COUNT(DISTINCT metadata->>'crm_note_id') as notas_unicas
FROM activity_logs
WHERE type = 'note';

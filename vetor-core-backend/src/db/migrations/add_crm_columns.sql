-- Add CRM type enum and columns to organizations table
CREATE TYPE crm_type_enum AS ENUM ('vetor', 'mada', 'none');

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS crm_type crm_type_enum NOT NULL DEFAULT 'none';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS crm_config jsonb NOT NULL DEFAULT '{}';

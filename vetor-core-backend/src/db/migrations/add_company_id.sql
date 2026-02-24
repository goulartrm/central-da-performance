-- Add company_id column to organizations table for Vetor (Base44) CRM
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_id varchar(255);

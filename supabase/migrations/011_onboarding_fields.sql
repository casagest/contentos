-- Add onboarding tracking fields to organizations
ALTER TABLE contentos.organizations
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

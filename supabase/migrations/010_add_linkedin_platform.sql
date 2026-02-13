-- Migration: Add LinkedIn platform support
-- Extends the platform CHECK constraint on social_accounts and posts tables

ALTER TABLE contentos.social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;
ALTER TABLE contentos.social_accounts ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin'));

ALTER TABLE contentos.posts DROP CONSTRAINT IF EXISTS posts_platform_check;
ALTER TABLE contentos.posts ADD CONSTRAINT posts_platform_check
  CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin'));

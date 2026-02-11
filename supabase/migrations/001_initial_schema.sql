-- ============================================================
-- ContentOS Migration 001: Schema & Extensions
-- ============================================================

CREATE SCHEMA IF NOT EXISTS contentos;

CREATE EXTENSION IF NOT EXISTS vector;           -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- Trigram for text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation

-- Grant schema access to Supabase roles (required for PostgREST)
GRANT USAGE ON SCHEMA contentos TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA contentos
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA contentos
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA contentos
    GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

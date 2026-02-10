-- ============================================================
-- ContentOS Migration 001: Schema & Extensions
-- ============================================================

CREATE SCHEMA IF NOT EXISTS contentos;

CREATE EXTENSION IF NOT EXISTS vector;           -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- Trigram for text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation

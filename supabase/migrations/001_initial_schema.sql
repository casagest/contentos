-- ContentOS Initial Schema
-- Run: supabase db push

CREATE SCHEMA IF NOT EXISTS contentos;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- See ARCHITECTURE.md for full schema
-- This file will be populated with the complete SQL from the architecture doc

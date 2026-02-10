# ContentOS — Architecture Blueprint v1.0

## System Overview

ContentOS is a **dual-deployment AI content intelligence platform**:

1. **ContentOS SaaS** — Standalone multi-platform content tool for Romanian creators/businesses (contentos.ro)
2. **ContentOS Dental Module** — Vertical integration inside MEDICALCOR-CORE for dental clinic social media

Both share a **common content engine** (shared package) while having distinct UIs and business logic.

---

## Strategic Architecture Decision: Shared Core, Separate Deployments

```
┌─────────────────────────────────────────────────────────────┐
│                    MONOREPO (Turborepo)                       │
│                                                               │
│  ┌─────────────────────┐    ┌──────────────────────────────┐ │
│  │   apps/contentos     │    │   apps/medicalcor-core       │ │
│  │   (SaaS Product)     │    │   (Dental Platform)          │ │
│  │                      │    │                              │ │
│  │  • Landing page      │    │  • Existing modules          │ │
│  │  • Dashboard         │    │  • Social Content Module     │ │
│  │  • Multi-platform    │    │  • Dental-specific AI        │ │
│  │  • General creators  │    │  • Patient acquisition       │ │
│  └──────────┬───────────┘    └──────────────┬───────────────┘ │
│             │                               │                 │
│             └───────────┬───────────────────┘                 │
│                         │                                     │
│  ┌──────────────────────┴──────────────────────────────────┐ │
│  │              packages/content-engine                      │ │
│  │                                                           │ │
│  │  • AI Content Analysis (Claude API)                       │ │
│  │  • Platform Adapters (Meta, TikTok, YouTube)             │ │
│  │  • Algorithm Scoring Engine                               │ │
│  │  • Romanian NLP Utilities                                 │ │
│  │  • Content Generation Pipeline                            │ │
│  │  • Post History Ingestion                                 │ │
│  │  • Vector Embeddings (pgvector)                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────┐  ┌────────────────────┐              │
│  │ packages/ui        │  │ packages/shared     │              │
│  │ (shared components)│  │ (types, utils, DB)  │              │
│  └────────────────────┘  └────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Architecture (Supabase/PostgreSQL)

### Option A: Single Supabase Project, Schema Separation
- `public` schema → shared tables
- `contentos` schema → SaaS-specific tables
- `medicalcor` schema → dental-specific tables (existing)

### Option B: Two Supabase Projects, Shared Content Engine via API
- ContentOS SaaS → own Supabase instance
- MEDICALCOR-CORE → existing Supabase instance + content engine API calls

**Recommendation: Option A** — single Supabase project with schema separation. Reduces costs, simplifies shared pgvector indexes, enables cross-referencing dental content with general content strategies.

---

## Social Platform API Integration Matrix

| Platform | API | Auth | Key Endpoints | Cost | Rate Limits |
|---|---|---|---|---|---|
| Facebook Pages | Graph API v21.0 | OAuth 2.0 | /page/feed, /page/insights, /page/posts | FREE | 200 calls/user/hour |
| Instagram Business | Instagram Graph API | OAuth 2.0 (via FB) | /media, /insights, /stories | FREE | 200 calls/user/hour |
| TikTok | TikTok Business API | OAuth 2.0 | /video/list, /video/query | FREE | Varies by endpoint |
| YouTube | YouTube Data API v3 | OAuth 2.0 | channels, videos, analytics | FREE (10K units/day) | 10,000 units/day |
| X/Twitter | X API v2 | OAuth 2.0 | tweets, users, search | $200-5,000/mo | Tier-dependent |

**Strategy:** Launch with Meta (FB+IG) + TikTok + YouTube. Add X/Twitter as optional premium tier.

---

## Core Engine Modules

### 1. Content Ingestion Pipeline
```
User connects account → OAuth flow → Fetch post history → 
Store raw data → Generate embeddings (pgvector) → 
Analyze patterns → Build user content profile
```

### 2. AI Content Coach
- Uses Claude API with Romanian-optimized system prompts
- Context: full post history as embeddings, performance metrics
- Proactive recommendations: topics, timing, format
- Dental vertical: patient education content, before/after showcase prompts

### 3. Algorithm Scoring Engine
Platform-specific scoring rubrics:

**Facebook Score (9 metrics):**
1. Engagement Bait Detection (negative signal)
2. Share Probability Score
3. Comment Depth Prediction
4. Visual Quality Assessment
5. Text Length Optimization
6. Hashtag Relevance
7. Posting Time Optimization
8. Content Freshness
9. Community Interaction Score

**Instagram Score (9 metrics):**
1. Save-to-Like Ratio Prediction
2. Reel Completion Rate Estimate
3. Hashtag Strategy Score
4. Caption Hook Strength
5. Visual Aesthetic Consistency
6. Story Engagement Prediction
7. Carousel Swipe-Through Rate
8. Bio Link Click Probability
9. Explore Page Potential

**TikTok Score (9 metrics):**
1. Watch Time Prediction
2. Loop Rate Potential
3. Share-to-View Ratio
4. Sound/Music Trend Alignment
5. Hook Strength (first 3 seconds)
6. Comment Bait Effectiveness
7. Duet/Stitch Potential
8. Hashtag Challenge Alignment
9. For You Page Probability

### 4. Content Generation Pipeline
```
Input (brain dump / topic / inspiration) →
Platform Detection (which platforms?) →
Romanian NLP Processing →
Claude API Generation (platform-optimized) →
Algorithm Score Check →
Iterate if score < threshold →
Output: ready-to-post content per platform
```

### 5. Dental Vertical Extensions
- Pre-built content templates: before/after, patient testimonials, procedure education
- CMSR 2025 compliance checker (medical advertising rules)
- Multi-language generation: RO + EN + DE (for dental tourism)
- Treatment-to-content mapping: All-on-X procedure → content series
- Patient consent integration for case showcases

---

## Monorepo Structure

```
contentos/
├── apps/
│   ├── web/                          # ContentOS SaaS (contentos.ro)
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router
│   │   │   │   ├── (marketing)/      # Landing page, pricing
│   │   │   │   ├── (auth)/           # Login, register, OAuth
│   │   │   │   ├── (dashboard)/      # Main app dashboard
│   │   │   │   │   ├── coach/        # AI Content Coach
│   │   │   │   │   ├── compose/      # Content Composer
│   │   │   │   │   ├── analyze/      # Algorithm Analyzer
│   │   │   │   │   ├── history/      # Post History & Analytics
│   │   │   │   │   ├── research/     # Account Researcher
│   │   │   │   │   ├── braindump/    # Brain Dump Tool
│   │   │   │   │   ├── inspiration/  # Saved Content & Repurpose
│   │   │   │   │   └── settings/     # Account, billing, integrations
│   │   │   │   └── api/              # API routes
│   │   │   ├── components/           # App-specific components
│   │   │   └── lib/                  # App-specific utilities
│   │   ├── public/
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── dental-content/               # MEDICALCOR-CORE module
│       ├── src/
│       │   ├── components/           # Dental-specific UI
│       │   ├── templates/            # Pre-built dental content templates
│       │   ├── compliance/           # CMSR 2025 content checker
│       │   └── lib/                  # Dental content utilities
│       └── package.json
│
├── packages/
│   ├── content-engine/               # ★ SHARED CORE ENGINE
│   │   ├── src/
│   │   │   ├── ai/                   # Claude API integration
│   │   │   │   ├── coach.ts          # Content coaching logic
│   │   │   │   ├── composer.ts       # Content generation
│   │   │   │   ├── scorer.ts         # Algorithm scoring
│   │   │   │   ├── researcher.ts     # Account analysis
│   │   │   │   └── prompts/          # Romanian-optimized prompts
│   │   │   │       ├── system.ts     # Base system prompts
│   │   │   │       ├── facebook.ts   # FB-specific prompts
│   │   │   │       ├── instagram.ts  # IG-specific prompts
│   │   │   │       ├── tiktok.ts     # TikTok-specific prompts
│   │   │   │       ├── youtube.ts    # YouTube-specific prompts
│   │   │   │       └── dental.ts     # Dental vertical prompts
│   │   │   ├── platforms/            # Platform adapters
│   │   │   │   ├── types.ts          # Shared platform types
│   │   │   │   ├── meta.ts           # Facebook + Instagram
│   │   │   │   ├── tiktok.ts         # TikTok Business API
│   │   │   │   ├── youtube.ts        # YouTube Data API
│   │   │   │   └── twitter.ts        # X API v2 (optional/premium)
│   │   │   ├── ingestion/            # Post history ingestion
│   │   │   │   ├── pipeline.ts       # Main ingestion pipeline
│   │   │   │   ├── embeddings.ts     # pgvector embedding generation
│   │   │   │   └── sync.ts           # Periodic sync jobs
│   │   │   ├── analysis/             # Content analysis
│   │   │   │   ├── patterns.ts       # Pattern detection
│   │   │   │   ├── timing.ts         # Optimal timing analysis
│   │   │   │   ├── topics.ts         # Topic clustering
│   │   │   │   └── competitors.ts    # Competitor analysis
│   │   │   ├── scoring/              # Algorithm scoring engines
│   │   │   │   ├── facebook.ts       # FB algorithm scoring
│   │   │   │   ├── instagram.ts      # IG algorithm scoring
│   │   │   │   ├── tiktok.ts         # TikTok algorithm scoring
│   │   │   │   └── youtube.ts        # YouTube algorithm scoring
│   │   │   └── romanian/             # Romanian NLP utilities
│   │   │       ├── diacritice.ts     # Proper ă, â, î, ș, ț handling
│   │   │       ├── slang.ts          # Romanian internet slang
│   │   │       ├── tone.ts           # Formal/informal tone matching
│   │   │       └── templates.ts      # Romanian content templates
│   │   ├── index.ts                  # Package exports
│   │   └── package.json
│   │
│   ├── database/                     # Shared database schemas & queries
│   │   ├── src/
│   │   │   ├── schemas/              # Drizzle ORM schemas
│   │   │   ├── migrations/           # Database migrations
│   │   │   ├── queries/              # Shared query builders
│   │   │   └── seeds/                # Seed data
│   │   └── package.json
│   │
│   ├── ui/                           # Shared UI components
│   │   ├── src/
│   │   │   ├── components/           # Reusable React components
│   │   │   ├── charts/               # Analytics chart components
│   │   │   └── hooks/                # Shared React hooks
│   │   └── package.json
│   │
│   └── shared/                       # Shared types & utilities
│       ├── src/
│       │   ├── types/                # TypeScript types
│       │   ├── utils/                # Utility functions
│       │   └── constants/            # Shared constants
│       └── package.json
│
├── supabase/                         # Supabase configuration
│   ├── migrations/                   # SQL migrations
│   ├── functions/                    # Edge Functions
│   │   ├── ingest-posts/             # Post ingestion webhook
│   │   ├── generate-embeddings/      # Embedding generation
│   │   ├── score-content/            # Content scoring
│   │   └── sync-platforms/           # Platform sync cron
│   └── config.toml
│
├── extensions/
│   └── chrome/                       # Chrome Extension
│       ├── manifest.json
│       ├── popup/
│       ├── content-scripts/
│       └── background/
│
├── turbo.json                        # Turborepo config
├── package.json                      # Root package.json
├── tsconfig.base.json                # Base TypeScript config
├── .env.example                      # Environment variables
└── README.md
```

---

## Database Schema (Supabase/PostgreSQL)

### Core Tables

```sql
-- ============================================================
-- CONTENTOS SCHEMA
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;           -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- Trigram for text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation

-- ============================================================
-- 1. USER & ORGANIZATION
-- ============================================================

CREATE TABLE contentos.organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    type            TEXT NOT NULL DEFAULT 'creator'
                    CHECK (type IN ('creator', 'business', 'agency', 'dental_clinic')),
    plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'starter', 'pro', 'agency', 'dental')),
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    -- Dental integration
    medicalcor_clinic_id    UUID REFERENCES medicalcor.clinics(id),
    -- Metadata
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contentos.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id),
    organization_id UUID NOT NULL REFERENCES contentos.organizations(id),
    role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    display_name    TEXT,
    avatar_url      TEXT,
    preferences     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CONNECTED SOCIAL ACCOUNTS
-- ============================================================

CREATE TABLE contentos.social_accounts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id),
    platform            TEXT NOT NULL
                        CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'twitter')),
    platform_user_id    TEXT NOT NULL,
    platform_username   TEXT,
    platform_name       TEXT,
    avatar_url          TEXT,
    -- OAuth tokens (encrypted at rest by Supabase)
    access_token        TEXT NOT NULL,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    -- Account metrics (cached)
    followers_count     INTEGER DEFAULT 0,
    following_count     INTEGER DEFAULT 0,
    posts_count         INTEGER DEFAULT 0,
    -- Sync status
    last_synced_at      TIMESTAMPTZ,
    sync_status         TEXT DEFAULT 'pending'
                        CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
    sync_error          TEXT,
    -- Metadata
    raw_profile         JSONB DEFAULT '{}',
    settings            JSONB DEFAULT '{}',
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint: one account per platform per org
    UNIQUE(organization_id, platform, platform_user_id)
);

CREATE INDEX idx_social_accounts_org ON contentos.social_accounts(organization_id);
CREATE INDEX idx_social_accounts_platform ON contentos.social_accounts(platform);

-- ============================================================
-- 3. POSTS (ingested from platforms)
-- ============================================================

CREATE TABLE contentos.posts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_account_id   UUID NOT NULL REFERENCES contentos.social_accounts(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id),
    platform            TEXT NOT NULL,
    -- Platform identifiers
    platform_post_id    TEXT NOT NULL,
    platform_url        TEXT,
    -- Content
    content_type        TEXT NOT NULL
                        CHECK (content_type IN (
                            'text', 'image', 'video', 'carousel', 'reel',
                            'story', 'short', 'article', 'thread', 'live'
                        )),
    text_content        TEXT,
    media_urls          TEXT[] DEFAULT '{}',
    hashtags            TEXT[] DEFAULT '{}',
    mentions            TEXT[] DEFAULT '{}',
    language            TEXT DEFAULT 'ro',
    -- Engagement metrics
    likes_count         INTEGER DEFAULT 0,
    comments_count      INTEGER DEFAULT 0,
    shares_count        INTEGER DEFAULT 0,
    saves_count         INTEGER DEFAULT 0,
    views_count         INTEGER DEFAULT 0,
    reach_count         INTEGER DEFAULT 0,
    impressions_count   INTEGER DEFAULT 0,
    -- Computed metrics
    engagement_rate     NUMERIC(8,4),
    virality_score      NUMERIC(8,4),
    -- AI analysis (populated after ingestion)
    content_embedding   vector(1536),    -- pgvector embedding
    topic_tags          TEXT[] DEFAULT '{}',
    sentiment           TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    hook_type           TEXT,
    cta_type            TEXT,
    algorithm_score     JSONB,           -- Per-platform algorithm scores
    ai_analysis         JSONB DEFAULT '{}',
    -- Timing
    published_at        TIMESTAMPTZ NOT NULL,
    -- Dental specific (nullable)
    dental_category     TEXT CHECK (dental_category IN (
                            'before_after', 'patient_testimonial', 'procedure_education',
                            'team_showcase', 'clinic_tour', 'dental_tip',
                            'promotion', 'event', 'technology', NULL
                        )),
    -- Metadata
    raw_data            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint
    UNIQUE(social_account_id, platform_post_id)
);

-- Performance indexes
CREATE INDEX idx_posts_org ON contentos.posts(organization_id);
CREATE INDEX idx_posts_account ON contentos.posts(social_account_id);
CREATE INDEX idx_posts_platform ON contentos.posts(platform);
CREATE INDEX idx_posts_published ON contentos.posts(published_at DESC);
CREATE INDEX idx_posts_engagement ON contentos.posts(engagement_rate DESC);
CREATE INDEX idx_posts_embedding ON contentos.posts
    USING ivfflat (content_embedding vector_cosine_ops)
    WITH (lists = 100);
CREATE INDEX idx_posts_hashtags ON contentos.posts USING GIN(hashtags);
CREATE INDEX idx_posts_topics ON contentos.posts USING GIN(topic_tags);
CREATE INDEX idx_posts_dental ON contentos.posts(dental_category) WHERE dental_category IS NOT NULL;

-- ============================================================
-- 4. CONTENT DRAFTS (user-created content)
-- ============================================================

CREATE TABLE contentos.drafts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id),
    created_by          UUID NOT NULL REFERENCES contentos.users(id),
    -- Content
    title               TEXT,
    body                TEXT NOT NULL,
    media_urls          TEXT[] DEFAULT '{}',
    hashtags            TEXT[] DEFAULT '{}',
    -- Target platforms
    target_platforms    TEXT[] DEFAULT '{}',
    -- Per-platform versions
    platform_versions   JSONB DEFAULT '{}',
    -- Example: {
    --   "facebook": { "text": "...", "hashtags": [...] },
    --   "instagram": { "text": "...", "hashtags": [...], "carousel_slides": [...] },
    --   "tiktok": { "text": "...", "hashtags": [...], "music_suggestion": "..." }
    -- }
    -- Algorithm scores per platform
    algorithm_scores    JSONB DEFAULT '{}',
    -- AI suggestions
    ai_suggestions      JSONB DEFAULT '{}',
    ai_coach_feedback   TEXT,
    -- Status
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'reviewing', 'scheduled', 'published', 'archived')),
    scheduled_at        TIMESTAMPTZ,
    published_at        TIMESTAMPTZ,
    -- Source (how was this draft created?)
    source              TEXT DEFAULT 'manual'
                        CHECK (source IN ('manual', 'braindump', 'repurpose', 'ai_generated', 'template')),
    source_post_id      UUID REFERENCES contentos.posts(id),
    source_inspiration_id UUID REFERENCES contentos.inspirations(id),
    -- Dental specific
    dental_category     TEXT,
    requires_patient_consent BOOLEAN DEFAULT false,
    patient_consent_id  UUID,
    cmsr_compliant      BOOLEAN,
    cmsr_check_result   JSONB,
    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drafts_org ON contentos.drafts(organization_id);
CREATE INDEX idx_drafts_status ON contentos.drafts(status);
CREATE INDEX idx_drafts_scheduled ON contentos.drafts(scheduled_at) WHERE status = 'scheduled';

-- ============================================================
-- 5. INSPIRATIONS (saved content from others)
-- ============================================================

CREATE TABLE contentos.inspirations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id),
    saved_by            UUID NOT NULL REFERENCES contentos.users(id),
    -- Source content
    platform            TEXT NOT NULL,
    platform_post_id    TEXT,
    platform_url        TEXT NOT NULL,
    author_username     TEXT,
    author_name         TEXT,
    -- Content snapshot
    text_content        TEXT,
    media_urls          TEXT[] DEFAULT '{}',
    -- Metrics at time of save
    likes_count         INTEGER DEFAULT 0,
    shares_count        INTEGER DEFAULT 0,
    views_count         INTEGER DEFAULT 0,
    -- AI analysis
    content_embedding   vector(1536),
    why_it_works        TEXT,           -- AI explanation of why this post performs
    repurpose_ideas     JSONB DEFAULT '{}',
    -- Organization
    folder              TEXT DEFAULT 'unsorted',
    tags                TEXT[] DEFAULT '{}',
    notes               TEXT,
    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspirations_org ON contentos.inspirations(organization_id);
CREATE INDEX idx_inspirations_embedding ON contentos.inspirations
    USING ivfflat (content_embedding vector_cosine_ops)
    WITH (lists = 50);

-- ============================================================
-- 6. BRAIN DUMPS
-- ============================================================

CREATE TABLE contentos.brain_dumps (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id),
    created_by          UUID NOT NULL REFERENCES contentos.users(id),
    -- Input
    input_type          TEXT NOT NULL DEFAULT 'text'
                        CHECK (input_type IN ('text', 'voice', 'image')),
    raw_input           TEXT NOT NULL,
    voice_audio_url     TEXT,
    -- AI processing
    processed_content   JSONB DEFAULT '{}',
    -- Example: {
    --   "key_ideas": [...],
    --   "suggested_topics": [...],
    --   "generated_drafts": {
    --     "facebook": { "posts": [...] },
    --     "instagram": { "posts": [...], "reels_scripts": [...] },
    --     "tiktok": { "scripts": [...] }
    --   }
    -- }
    -- Generated drafts
    generated_draft_ids UUID[] DEFAULT '{}',
    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. CONTENT ANALYTICS (aggregated)
-- ============================================================

CREATE TABLE contentos.analytics_daily (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id),
    social_account_id   UUID NOT NULL REFERENCES contentos.social_accounts(id),
    date                DATE NOT NULL,
    -- Aggregate metrics
    posts_count         INTEGER DEFAULT 0,
    total_likes         INTEGER DEFAULT 0,
    total_comments      INTEGER DEFAULT 0,
    total_shares        INTEGER DEFAULT 0,
    total_views         INTEGER DEFAULT 0,
    total_reach         INTEGER DEFAULT 0,
    avg_engagement_rate NUMERIC(8,4),
    -- Best performing
    top_post_id         UUID REFERENCES contentos.posts(id),
    top_post_engagement NUMERIC(8,4),
    -- Growth
    followers_gained    INTEGER DEFAULT 0,
    followers_lost      INTEGER DEFAULT 0,
    net_followers       INTEGER DEFAULT 0,
    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(social_account_id, date)
);

CREATE INDEX idx_analytics_org_date ON contentos.analytics_daily(organization_id, date DESC);

-- ============================================================
-- 8. AI COACH CONVERSATIONS
-- ============================================================

CREATE TABLE contentos.coach_conversations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id),
    user_id             UUID NOT NULL REFERENCES contentos.users(id),
    -- Conversation
    messages            JSONB NOT NULL DEFAULT '[]',
    -- Context used
    context_post_ids    UUID[] DEFAULT '{}',
    context_platform    TEXT,
    -- Metadata
    title               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. CONTENT TEMPLATES (pre-built + custom)
-- ============================================================

CREATE TABLE contentos.templates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Ownership (null = system template)
    organization_id     UUID REFERENCES contentos.organizations(id),
    -- Template definition
    name                TEXT NOT NULL,
    description         TEXT,
    category            TEXT NOT NULL,
    platforms           TEXT[] NOT NULL,
    -- Template content
    template_body       TEXT NOT NULL,
    template_variables  JSONB DEFAULT '{}',
    example_output      TEXT,
    -- Dental specific
    is_dental           BOOLEAN DEFAULT false,
    dental_category     TEXT,
    cmsr_approved       BOOLEAN DEFAULT false,
    -- Usage
    usage_count         INTEGER DEFAULT 0,
    -- Metadata
    is_system           BOOLEAN DEFAULT false,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. COMPETITOR TRACKING
-- ============================================================

CREATE TABLE contentos.tracked_competitors (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id),
    -- Competitor info
    platform            TEXT NOT NULL,
    platform_user_id    TEXT NOT NULL,
    platform_username   TEXT NOT NULL,
    display_name        TEXT,
    -- Cached metrics
    followers_count     INTEGER DEFAULT 0,
    avg_engagement_rate NUMERIC(8,4),
    posting_frequency   NUMERIC(8,2),  -- posts per week
    -- Analysis
    top_topics          TEXT[] DEFAULT '{}',
    content_strategy    JSONB DEFAULT '{}',
    -- Sync
    last_analyzed_at    TIMESTAMPTZ,
    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, platform, platform_user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE contentos.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.inspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.brain_dumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.tracked_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their organization's data
CREATE POLICY "Users can view own org" ON contentos.organizations
    FOR ALL USING (
        id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view own org social accounts" ON contentos.social_accounts
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view own org posts" ON contentos.posts
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

-- (Same pattern for all tables...)

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION contentos.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON contentos.organizations
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_social_accounts_updated_at
    BEFORE UPDATE ON contentos.social_accounts
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

-- Compute engagement rate on post insert/update
CREATE OR REPLACE FUNCTION contentos.compute_engagement_rate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reach_count > 0 THEN
        NEW.engagement_rate = (
            (COALESCE(NEW.likes_count, 0) +
             COALESCE(NEW.comments_count, 0) +
             COALESCE(NEW.shares_count, 0) +
             COALESCE(NEW.saves_count, 0))::NUMERIC /
            NEW.reach_count * 100
        );
    ELSIF NEW.views_count > 0 THEN
        NEW.engagement_rate = (
            (COALESCE(NEW.likes_count, 0) +
             COALESCE(NEW.comments_count, 0) +
             COALESCE(NEW.shares_count, 0) +
             COALESCE(NEW.saves_count, 0))::NUMERIC /
            NEW.views_count * 100
        );
    END IF;

    -- Compute virality score (shares weighted higher)
    NEW.virality_score = (
        COALESCE(NEW.shares_count, 0) * 3 +
        COALESCE(NEW.comments_count, 0) * 2 +
        COALESCE(NEW.likes_count, 0) * 1
    )::NUMERIC;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_post_engagement
    BEFORE INSERT OR UPDATE ON contentos.posts
    FOR EACH ROW EXECUTE FUNCTION contentos.compute_engagement_rate();

-- Similar posts search (pgvector)
CREATE OR REPLACE FUNCTION contentos.search_similar_posts(
    p_organization_id UUID,
    p_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_platform TEXT DEFAULT NULL
)
RETURNS TABLE (
    post_id UUID,
    text_content TEXT,
    platform TEXT,
    engagement_rate NUMERIC,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.text_content,
        p.platform,
        p.engagement_rate,
        1 - (p.content_embedding <=> p_embedding) AS similarity
    FROM contentos.posts p
    WHERE p.organization_id = p_organization_id
      AND p.content_embedding IS NOT NULL
      AND (p_platform IS NULL OR p.platform = p_platform)
    ORDER BY p.content_embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## Pricing Strategy (Romanian Market)

| Plan | Price (EUR/month) | Target | Features |
|---|---|---|---|
| **Free** | €0 | Trial users | 1 platform, 50 posts/month, basic scoring |
| **Starter** | €19 | Individual creators | 2 platforms, unlimited posts, AI coach, scoring |
| **Pro** | €49 | Serious creators | All platforms, competitor tracking, Chrome ext, priority AI |
| **Agency** | €99 | Marketing agencies | Multi-client, white-label, API access, team seats |
| **Dental** | €79 | Dental clinics | All Pro features + dental templates, CMSR compliance, multi-language |

Romanian pricing benchmark: Canva Pro is ~€12/month, Buffer is ~€6/month. ContentOS at €19-49 is premium but justified by AI depth.

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Monorepo scaffold with Turborepo
- [ ] Supabase project setup + schema migration
- [ ] Auth system (email + OAuth for social platforms)
- [ ] Meta Graph API OAuth flow (FB + IG connection)
- [ ] Basic post ingestion from Facebook Pages
- [ ] Landing page at contentos.ro

### Phase 2: Core AI Engine (Weeks 3-4)
- [ ] Claude API integration with Romanian system prompts
- [ ] Post history embeddings generation (pgvector)
- [ ] AI Content Coach (chat interface)
- [ ] Algorithm Scorer v1 (Facebook + Instagram)
- [ ] Content Composer (multi-platform output)

### Phase 3: Full Platform (Weeks 5-6)
- [ ] TikTok Business API integration
- [ ] YouTube Data API integration
- [ ] Brain Dump tool (text → multi-platform content)
- [ ] Inspiration saving + repurpose
- [ ] Post History Analytics dashboard
- [ ] Account Researcher

### Phase 4: Dental Vertical (Week 7)
- [ ] Dental content templates
- [ ] CMSR 2025 compliance checker
- [ ] Multi-language generation (RO/EN/DE)
- [ ] Treatment-to-content mapping
- [ ] Integration bridge to MEDICALCOR-CORE

### Phase 5: Polish & Launch (Week 8)
- [ ] Chrome extension
- [ ] Stripe billing integration
- [ ] Onboarding flow
- [ ] Beta with 20-50 Romanian creators
- [ ] Beta with 5 dental clinics (including MedicalCor)

---

## Cost Projections

### Monthly Operating Costs

| Item | Cost | Notes |
|---|---|---|
| Supabase Pro | $25 | Shared with MEDICALCOR-CORE |
| Vercel Pro | $20 | Frontend hosting |
| Claude API | $100-300 | Based on usage |
| Meta API | $0 | Free |
| TikTok API | $0 | Free |
| YouTube API | $0 | Free |
| Domain (contentos.ro) | ~$2 | Annual / 12 |
| **Total** | **~$150-350/month** |

### Revenue Projections (Conservative)

| Month | Subscribers | MRR (EUR) |
|---|---|---|
| Month 1 (Beta) | 20 free + 10 paid | €400 |
| Month 3 | 50 paid | €1,750 |
| Month 6 | 200 paid | €7,000 |
| Month 12 | 500 paid | €17,500 |
| Month 18 | 1,000 paid | €35,000 |

At 1,000 subscribers × €35 avg → **€420K ARR** with ~90% margins.

---

## Key Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Meta API rate limits | High | Queue-based ingestion, caching, progressive sync |
| X API pricing makes it unaffordable | Medium | Launch without X, add later via 3rd party provider |
| Romanian AI content quality | High | Extensive prompt engineering, native speaker review loop |
| OAuth token refresh failures | Medium | Background refresh jobs, user notification on failure |
| Supabase pgvector performance at scale | Medium | HNSW indexes, embedding cache, batch operations |
| CMSR 2025 regulations change | Low | Modular compliance checker, easy rule updates |

---

## Integration with MEDICALCOR-CORE

The dental vertical connects via a shared Supabase database + API layer:

```
MEDICALCOR-CORE                    ContentOS
┌─────────────┐                    ┌─────────────┐
│  Patient     │◄──────────────────│  Content     │
│  Management  │  Patient consent  │  Templates   │
│              │  for case photos  │              │
├─────────────┤                    ├─────────────┤
│  Treatment   │◄──────────────────│  Treatment   │
│  Protocols   │  Treatment type   │  to Content  │
│  (All-on-X)  │  → content ideas  │  Mapping     │
├─────────────┤                    ├─────────────┤
│  Lead        │◄──────────────────│  Social      │
│  Scoring     │  Social engagement│  Analytics   │
│              │  → lead quality   │              │
├─────────────┤                    ├─────────────┤
│  Marketing   │◄──────────────────│  Content     │
│  Attribution │  Post → lead →    │  Performance │
│              │  patient journey  │              │
└─────────────┘                    └─────────────┘
```

This creates a **closed-loop system**: treatment → content → social post → engagement → lead → patient → treatment → more content.

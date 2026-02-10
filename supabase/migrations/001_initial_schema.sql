-- ContentOS Initial Schema
-- Run: supabase db push

CREATE SCHEMA IF NOT EXISTS contentos;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    medicalcor_clinic_id    UUID,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contentos.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
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
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    platform            TEXT NOT NULL
                        CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'twitter')),
    platform_user_id    TEXT NOT NULL,
    platform_username   TEXT,
    platform_name       TEXT,
    avatar_url          TEXT,
    access_token        TEXT NOT NULL,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    followers_count     INTEGER DEFAULT 0,
    following_count     INTEGER DEFAULT 0,
    posts_count         INTEGER DEFAULT 0,
    last_synced_at      TIMESTAMPTZ,
    sync_status         TEXT DEFAULT 'pending'
                        CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
    sync_error          TEXT,
    raw_profile         JSONB DEFAULT '{}',
    settings            JSONB DEFAULT '{}',
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
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
    platform_post_id    TEXT NOT NULL,
    platform_url        TEXT,
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
    likes_count         INTEGER DEFAULT 0,
    comments_count      INTEGER DEFAULT 0,
    shares_count        INTEGER DEFAULT 0,
    saves_count         INTEGER DEFAULT 0,
    views_count         INTEGER DEFAULT 0,
    reach_count         INTEGER DEFAULT 0,
    impressions_count   INTEGER DEFAULT 0,
    engagement_rate     NUMERIC(8,4),
    virality_score      NUMERIC(8,4),
    content_embedding   vector(1536),
    topic_tags          TEXT[] DEFAULT '{}',
    sentiment           TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    hook_type           TEXT,
    cta_type            TEXT,
    algorithm_score     JSONB,
    ai_analysis         JSONB DEFAULT '{}',
    published_at        TIMESTAMPTZ NOT NULL,
    dental_category     TEXT CHECK (dental_category IN (
                            'before_after', 'patient_testimonial', 'procedure_education',
                            'team_showcase', 'clinic_tour', 'dental_tip',
                            'promotion', 'event', 'technology', NULL
                        )),
    raw_data            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(social_account_id, platform_post_id)
);

CREATE INDEX idx_posts_org ON contentos.posts(organization_id);
CREATE INDEX idx_posts_account ON contentos.posts(social_account_id);
CREATE INDEX idx_posts_platform ON contentos.posts(platform);
CREATE INDEX idx_posts_published ON contentos.posts(published_at DESC);
CREATE INDEX idx_posts_engagement ON contentos.posts(engagement_rate DESC);
CREATE INDEX idx_posts_hashtags ON contentos.posts USING GIN(hashtags);
CREATE INDEX idx_posts_topics ON contentos.posts USING GIN(topic_tags);
CREATE INDEX idx_posts_dental ON contentos.posts(dental_category) WHERE dental_category IS NOT NULL;

-- ============================================================
-- 4. CONTENT DRAFTS
-- ============================================================

CREATE TABLE contentos.drafts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    created_by          UUID NOT NULL REFERENCES contentos.users(id),
    title               TEXT,
    body                TEXT NOT NULL,
    media_urls          TEXT[] DEFAULT '{}',
    hashtags            TEXT[] DEFAULT '{}',
    target_platforms    TEXT[] DEFAULT '{}',
    platform_versions   JSONB DEFAULT '{}',
    algorithm_scores    JSONB DEFAULT '{}',
    ai_suggestions      JSONB DEFAULT '{}',
    ai_coach_feedback   TEXT,
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'reviewing', 'scheduled', 'published', 'archived')),
    scheduled_at        TIMESTAMPTZ,
    published_at        TIMESTAMPTZ,
    source              TEXT DEFAULT 'manual'
                        CHECK (source IN ('manual', 'braindump', 'repurpose', 'ai_generated', 'template')),
    source_post_id      UUID REFERENCES contentos.posts(id),
    dental_category     TEXT,
    requires_patient_consent BOOLEAN DEFAULT false,
    patient_consent_id  UUID,
    cmsr_compliant      BOOLEAN,
    cmsr_check_result   JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drafts_org ON contentos.drafts(organization_id);
CREATE INDEX idx_drafts_status ON contentos.drafts(status);
CREATE INDEX idx_drafts_scheduled ON contentos.drafts(scheduled_at) WHERE status = 'scheduled';

-- ============================================================
-- 5. BRAIN DUMPS
-- ============================================================

CREATE TABLE contentos.brain_dumps (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    created_by          UUID NOT NULL REFERENCES contentos.users(id),
    input_type          TEXT NOT NULL DEFAULT 'text'
                        CHECK (input_type IN ('text', 'voice', 'image')),
    raw_input           TEXT NOT NULL,
    voice_audio_url     TEXT,
    processed_content   JSONB DEFAULT '{}',
    generated_draft_ids UUID[] DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. AI COACH CONVERSATIONS
-- ============================================================

CREATE TABLE contentos.coach_conversations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES contentos.users(id),
    messages            JSONB NOT NULL DEFAULT '[]',
    context_post_ids    UUID[] DEFAULT '{}',
    context_platform    TEXT,
    title               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ANALYTICS (aggregated daily)
-- ============================================================

CREATE TABLE contentos.analytics_daily (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    social_account_id   UUID NOT NULL REFERENCES contentos.social_accounts(id) ON DELETE CASCADE,
    date                DATE NOT NULL,
    posts_count         INTEGER DEFAULT 0,
    total_likes         INTEGER DEFAULT 0,
    total_comments      INTEGER DEFAULT 0,
    total_shares        INTEGER DEFAULT 0,
    total_views         INTEGER DEFAULT 0,
    total_reach         INTEGER DEFAULT 0,
    avg_engagement_rate NUMERIC(8,4),
    top_post_id         UUID REFERENCES contentos.posts(id),
    top_post_engagement NUMERIC(8,4),
    followers_gained    INTEGER DEFAULT 0,
    followers_lost      INTEGER DEFAULT 0,
    net_followers       INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(social_account_id, date)
);

CREATE INDEX idx_analytics_org_date ON contentos.analytics_daily(organization_id, date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE contentos.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.brain_dumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.analytics_daily ENABLE ROW LEVEL SECURITY;

-- Users can access their own organization
CREATE POLICY "Users can view own org"
    ON contentos.organizations FOR ALL USING (
        id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

-- Users can access their own user row
CREATE POLICY "Users can view own profile"
    ON contentos.users FOR ALL USING (id = auth.uid());

-- Users can access their organization's social accounts
CREATE POLICY "Users can view own org social accounts"
    ON contentos.social_accounts FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

-- Users can access their organization's posts
CREATE POLICY "Users can view own org posts"
    ON contentos.posts FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

-- Users can access their organization's drafts
CREATE POLICY "Users can view own org drafts"
    ON contentos.drafts FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

-- Users can access their organization's brain dumps
CREATE POLICY "Users can view own org brain dumps"
    ON contentos.brain_dumps FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

-- Users can access their own coach conversations
CREATE POLICY "Users can view own coach conversations"
    ON contentos.coach_conversations FOR ALL USING (user_id = auth.uid());

-- Users can access their organization's analytics
CREATE POLICY "Users can view own org analytics"
    ON contentos.analytics_daily FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

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

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON contentos.organizations
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON contentos.users
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_social_accounts_updated_at
    BEFORE UPDATE ON contentos.social_accounts
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON contentos.posts
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_drafts_updated_at
    BEFORE UPDATE ON contentos.drafts
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_coach_conversations_updated_at
    BEFORE UPDATE ON contentos.coach_conversations
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

-- ============================================================
-- AUTO-CREATE ORG ON SIGNUP (Supabase Auth trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION contentos.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    user_name TEXT;
    org_slug TEXT;
BEGIN
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
    );

    org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g'))
                || '-' || substr(NEW.id::text, 1, 8);

    INSERT INTO contentos.organizations (name, slug, type, plan)
    VALUES (user_name, org_slug, 'creator', 'free')
    RETURNING id INTO new_org_id;

    INSERT INTO contentos.users (id, organization_id, role, display_name, avatar_url)
    VALUES (
        NEW.id,
        new_org_id,
        'owner',
        user_name,
        NEW.raw_user_meta_data->>'avatar_url'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION contentos.handle_new_user();

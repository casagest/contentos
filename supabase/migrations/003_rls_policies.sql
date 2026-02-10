-- ============================================================
-- ContentOS Migration 003: Granular RLS Policies
-- Replaces basic FOR ALL policies from 001 with per-operation
-- policies, and adds RLS for new tables from 002.
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns the organization_id for the current authenticated user.
-- SECURITY DEFINER so it can read contentos.users even under RLS.
CREATE OR REPLACE FUNCTION contentos.user_org_id()
RETURNS UUID AS $$
    SELECT organization_id
    FROM contentos.users
    WHERE id = auth.uid()
    LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user has admin-level role
CREATE OR REPLACE FUNCTION contentos.user_is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM contentos.users
        WHERE id = auth.uid()
          AND role IN ('owner', 'admin')
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- DROP old blanket FOR ALL policies from 001
-- ============================================================

DROP POLICY IF EXISTS "Users can view own org" ON contentos.organizations;
DROP POLICY IF EXISTS "Users can view own profile" ON contentos.users;
DROP POLICY IF EXISTS "Users can view own org social accounts" ON contentos.social_accounts;
DROP POLICY IF EXISTS "Users can view own org posts" ON contentos.posts;
DROP POLICY IF EXISTS "Users can view own org drafts" ON contentos.drafts;
DROP POLICY IF EXISTS "Users can view own org brain dumps" ON contentos.brain_dumps;
DROP POLICY IF EXISTS "Users can view own coach conversations" ON contentos.coach_conversations;
DROP POLICY IF EXISTS "Users can view own org analytics" ON contentos.analytics_daily;

-- ============================================================
-- ENABLE RLS on new tables from 002
-- ============================================================

ALTER TABLE contentos.inspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.tracked_competitors ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE POLICY "org_select"
    ON contentos.organizations FOR SELECT
    USING (id = contentos.user_org_id());

CREATE POLICY "org_update"
    ON contentos.organizations FOR UPDATE
    USING (
        id = contentos.user_org_id()
        AND contentos.user_is_admin()
    )
    WITH CHECK (id = contentos.user_org_id());

-- INSERT handled by handle_new_user() trigger (SECURITY DEFINER)

-- ============================================================
-- USERS
-- ============================================================

CREATE POLICY "users_select"
    ON contentos.users FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "users_update_self"
    ON contentos.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert"
    ON contentos.users FOR INSERT
    WITH CHECK (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    );

CREATE POLICY "users_delete"
    ON contentos.users FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
        AND id != auth.uid()
    );

-- ============================================================
-- SOCIAL ACCOUNTS
-- ============================================================

CREATE POLICY "social_accounts_select"
    ON contentos.social_accounts FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "social_accounts_insert"
    ON contentos.social_accounts FOR INSERT
    WITH CHECK (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    );

CREATE POLICY "social_accounts_update"
    ON contentos.social_accounts FOR UPDATE
    USING (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    )
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "social_accounts_delete"
    ON contentos.social_accounts FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    );

-- ============================================================
-- POSTS
-- ============================================================

CREATE POLICY "posts_select"
    ON contentos.posts FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "posts_insert"
    ON contentos.posts FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "posts_update"
    ON contentos.posts FOR UPDATE
    USING (organization_id = contentos.user_org_id())
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "posts_delete"
    ON contentos.posts FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    );

-- ============================================================
-- DRAFTS
-- ============================================================

CREATE POLICY "drafts_select"
    ON contentos.drafts FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "drafts_insert"
    ON contentos.drafts FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "drafts_update"
    ON contentos.drafts FOR UPDATE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    )
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "drafts_delete"
    ON contentos.drafts FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    );

-- ============================================================
-- INSPIRATIONS
-- ============================================================

CREATE POLICY "inspirations_select"
    ON contentos.inspirations FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "inspirations_insert"
    ON contentos.inspirations FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "inspirations_update"
    ON contentos.inspirations FOR UPDATE
    USING (
        organization_id = contentos.user_org_id()
        AND (saved_by = auth.uid() OR contentos.user_is_admin())
    )
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "inspirations_delete"
    ON contentos.inspirations FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND (saved_by = auth.uid() OR contentos.user_is_admin())
    );

-- ============================================================
-- BRAIN DUMPS
-- ============================================================

CREATE POLICY "brain_dumps_select"
    ON contentos.brain_dumps FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "brain_dumps_insert"
    ON contentos.brain_dumps FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "brain_dumps_update"
    ON contentos.brain_dumps FOR UPDATE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    )
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "brain_dumps_delete"
    ON contentos.brain_dumps FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    );

-- ============================================================
-- COACH CONVERSATIONS
-- ============================================================

CREATE POLICY "coach_conversations_select"
    ON contentos.coach_conversations FOR SELECT
    USING (
        organization_id = contentos.user_org_id()
        AND user_id = auth.uid()
    );

CREATE POLICY "coach_conversations_insert"
    ON contentos.coach_conversations FOR INSERT
    WITH CHECK (
        organization_id = contentos.user_org_id()
        AND user_id = auth.uid()
    );

CREATE POLICY "coach_conversations_update"
    ON contentos.coach_conversations FOR UPDATE
    USING (
        organization_id = contentos.user_org_id()
        AND user_id = auth.uid()
    )
    WITH CHECK (
        organization_id = contentos.user_org_id()
        AND user_id = auth.uid()
    );

CREATE POLICY "coach_conversations_delete"
    ON contentos.coach_conversations FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND user_id = auth.uid()
    );

-- ============================================================
-- TEMPLATES
-- System templates visible to all, custom to own org only
-- ============================================================

CREATE POLICY "templates_select"
    ON contentos.templates FOR SELECT
    USING (
        is_system = true
        OR organization_id = contentos.user_org_id()
    );

CREATE POLICY "templates_insert"
    ON contentos.templates FOR INSERT
    WITH CHECK (
        organization_id = contentos.user_org_id()
        AND is_system = false
    );

CREATE POLICY "templates_update"
    ON contentos.templates FOR UPDATE
    USING (
        organization_id = contentos.user_org_id()
        AND is_system = false
    )
    WITH CHECK (
        organization_id = contentos.user_org_id()
        AND is_system = false
    );

CREATE POLICY "templates_delete"
    ON contentos.templates FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND is_system = false
        AND contentos.user_is_admin()
    );

-- ============================================================
-- TRACKED COMPETITORS
-- ============================================================

CREATE POLICY "tracked_competitors_select"
    ON contentos.tracked_competitors FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "tracked_competitors_insert"
    ON contentos.tracked_competitors FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "tracked_competitors_update"
    ON contentos.tracked_competitors FOR UPDATE
    USING (organization_id = contentos.user_org_id())
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "tracked_competitors_delete"
    ON contentos.tracked_competitors FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    );

-- ============================================================
-- ANALYTICS DAILY
-- ============================================================

CREATE POLICY "analytics_daily_select"
    ON contentos.analytics_daily FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "analytics_daily_insert"
    ON contentos.analytics_daily FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "analytics_daily_update"
    ON contentos.analytics_daily FOR UPDATE
    USING (organization_id = contentos.user_org_id())
    WITH CHECK (organization_id = contentos.user_org_id());

-- ============================================================
-- ContentOS Migration 005: Handle New User Trigger
-- Auto-creates organization + contentos.users row on signup.
-- Runs inside Postgres (no PostgREST dependency).
-- ============================================================

-- Trigger function: fires AFTER INSERT on auth.users
CREATE OR REPLACE FUNCTION contentos.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id uuid;
    user_name text;
    org_slug text;
BEGIN
    -- Extract display name from user metadata
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- Generate unique slug: sanitized name + first 8 chars of user ID
    org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]+', '-', 'g'));
    org_slug := trim(both '-' from org_slug);
    org_slug := org_slug || '-' || substr(NEW.id::text, 1, 8);

    -- Create default organization
    INSERT INTO contentos.organizations (name, slug, plan)
    VALUES (user_name, org_slug, 'free')
    RETURNING id INTO new_org_id;

    -- Create user row linked to the organization
    INSERT INTO contentos.users (id, organization_id, role, display_name)
    VALUES (NEW.id, new_org_id, 'owner', user_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION contentos.handle_new_user();

COMMENT ON FUNCTION contentos.handle_new_user() IS
    'Auto-provisions organization + user row when a new auth user signs up.';

-- ============================================================
-- BACKFILL: Create orgs for existing auth users who don't have
-- a contentos.users row yet (registered before this trigger).
-- ============================================================
DO $$
DECLARE
    r RECORD;
    new_org_id uuid;
    user_name text;
    org_slug text;
BEGIN
    FOR r IN
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN contentos.users cu ON cu.id = au.id
        WHERE cu.id IS NULL
    LOOP
        user_name := COALESCE(
            r.raw_user_meta_data->>'display_name',
            r.raw_user_meta_data->>'full_name',
            split_part(r.email, '@', 1)
        );

        org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]+', '-', 'g'));
        org_slug := trim(both '-' from org_slug);
        org_slug := org_slug || '-' || substr(r.id::text, 1, 8);

        INSERT INTO contentos.organizations (name, slug, plan)
        VALUES (user_name, org_slug, 'free')
        RETURNING id INTO new_org_id;

        INSERT INTO contentos.users (id, organization_id, role, display_name)
        VALUES (r.id, new_org_id, 'owner', user_name);

        RAISE NOTICE 'Backfilled user % with org %', r.id, new_org_id;
    END LOOP;
END;
$$;

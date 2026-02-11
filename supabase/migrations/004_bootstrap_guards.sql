-- ============================================================
-- ContentOS Migration 004: Bootstrap Guards
-- Funcții și verificări pentru idempotență și health check.
-- ============================================================

-- Verifică dacă bootstrap-ul core (002) s-a executat complet.
-- Utile pentru health checks și debug.
CREATE OR REPLACE FUNCTION contentos.bootstrap_ok()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'contentos' AND tablename = 'organizations') AND
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'contentos' AND tablename = 'users') AND
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'contentos' AND tablename = 'social_accounts') AND
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'contentos' AND tablename = 'posts') AND
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'contentos' AND tablename = 'drafts') AND
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'contentos' AND tablename = 'brain_dumps') AND
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'contentos' AND tablename = 'analytics_daily') AND
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'contentos' AND tablename = 'coach_conversations')
    );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION contentos.bootstrap_ok() IS 'Returns true if all core bootstrap tables (002) exist. Use for health checks.';

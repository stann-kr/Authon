-- ============================================================
-- Authon Full Schema Reset
-- ============================================================
-- ⚠️ WARNING: 모든 기존 테이블과 데이터를 삭제합니다!
-- Supabase Dashboard → SQL Editor 에서 실행하세요.
--
-- 실행 순서:
--   1. 이 파일의 "STEP 1: DROP" 부분을 먼저 실행
--   2. 성공하면 schema.sql 전체를 실행
-- ============================================================

-- ============================================================
-- STEP 1: DROP EVERYTHING (기존 스키마 정리)
-- ============================================================

-- 1a. Drop auth trigger (항상 존재하는 auth.users 테이블)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 1b. Drop all policies on public tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 1c. Drop tables (CASCADE removes dependent triggers, indexes, policies automatically)
DROP TABLE IF EXISTS public.external_dj_links CASCADE;
DROP TABLE IF EXISTS public.guests CASCADE;
DROP TABLE IF EXISTS public.djs CASCADE;
DROP TABLE IF EXISTS public.user_applications CASCADE;  -- legacy table
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.venues CASCADE;

-- 1d. Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.check_guest_dj_venue() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.increment_external_link_guest_count() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_venue_id() CASCADE;

-- ============================================================
-- STEP 1 완료! 
-- 이제 schema.sql 전체를 Supabase SQL Editor에 붙여넣고 실행하세요.
-- ============================================================

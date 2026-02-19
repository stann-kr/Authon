-- Authon Database Schema
-- Multi-venue guest management system with Supabase Auth integration
--
-- User Hierarchy: super_admin → venue_admin → door / dj
-- External DJs: Token-based access without authentication
--
-- [IMPORTANT] Requires Supabase Auth for all internal users.
-- [IMPORTANT] RLS uses auth.jwt()->'app_metadata' for role/venue_id (no recursion).
--             app_metadata is set by handle_new_user() trigger and Edge Functions.

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Venues table
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'club' CHECK (
        type IN (
            'club',
            'bar',
            'lounge',
            'festival',
            'private'
        )
    ),
    address TEXT,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (all authenticated staff)
-- auth_user_id references Supabase Auth; every internal user MUST have an auth account
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    auth_user_id UUID UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues (id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (
        role IN (
            'super_admin',
            'venue_admin',
            'door_staff',
            'staff',
            'dj'
        )
    ),
    guest_limit INTEGER DEFAULT 10,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- super_admin은 플랫폼 전체 관리자이므로 venue_id가 NULL 허용
    -- 그 외 역할은 반드시 venue_id 필수
    CONSTRAINT users_venue_required CHECK (
        role = 'super_admin'
        OR venue_id IS NOT NULL
    )
);

-- DJs table (registered venue DJs, linked to a user account)
CREATE TABLE IF NOT EXISTS public.djs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    venue_id UUID NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    event TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- External DJ Links (token-based access for unregistered DJs)
CREATE TABLE IF NOT EXISTS public.external_dj_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    venue_id UUID NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid (),
    dj_name TEXT NOT NULL,
    event TEXT NOT NULL,
    date DATE NOT NULL,
    max_guests INTEGER NOT NULL DEFAULT 5,
    used_guests INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guests table
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    venue_id UUID NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dj_id UUID REFERENCES public.djs (id) ON DELETE SET NULL,
    external_link_id UUID REFERENCES public.external_dj_links (id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'checked',
            'deleted'
        )
    ),
    check_in_time TIMESTAMPTZ,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: add created_by_user_id if not exists (for existing deployments)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'guests' AND column_name = 'created_by_user_id'
    ) THEN
        ALTER TABLE public.guests ADD COLUMN created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- 2. FUNCTIONS & TRIGGERS
-- ============================================================

-- Validate guest's DJ venue match
CREATE OR REPLACE FUNCTION check_guest_dj_venue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dj_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.djs
            WHERE id = NEW.dj_id AND venue_id = NEW.venue_id
        ) THEN
            RAISE EXCEPTION 'DJ does not belong to the specified venue';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_guest_dj_venue ON public.guests;

CREATE TRIGGER enforce_guest_dj_venue
    BEFORE INSERT OR UPDATE ON public.guests
    FOR EACH ROW EXECUTE FUNCTION check_guest_dj_venue();

-- Updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_venues_updated_at ON public.venues;

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_djs_updated_at ON public.djs;

CREATE TRIGGER update_djs_updated_at BEFORE UPDATE ON public.djs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guests_updated_at ON public.guests;

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_external_dj_links_updated_at ON public.external_dj_links;

CREATE TRIGGER update_external_dj_links_updated_at BEFORE UPDATE ON public.external_dj_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment used_guests when external link guest is created
CREATE OR REPLACE FUNCTION increment_external_link_guest_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.external_link_id IS NOT NULL THEN
        UPDATE public.external_dj_links
        SET used_guests = used_guests + 1
        WHERE id = NEW.external_link_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_guest_created_increment_link ON public.guests;

CREATE TRIGGER on_guest_created_increment_link
    AFTER INSERT ON public.guests
    FOR EACH ROW EXECUTE FUNCTION increment_external_link_guest_count();

-- Handle new Supabase Auth user → auto-create public.users profile
-- Expects user_metadata: { name, role, venue_id (optional for super_admin), guest_limit }
-- Also copies role & venue_id into app_metadata so JWT claims are available for RLS.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role TEXT;
  _venue_id UUID;
  _meta JSONB;
BEGIN
  _role := COALESCE(new.raw_user_meta_data->>'role', 'dj');
  _venue_id := NULLIF(new.raw_user_meta_data->>'venue_id', '')::uuid;

  -- 1. Create public.users profile
  INSERT INTO public.users (auth_user_id, email, name, role, venue_id, guest_limit)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    _role,
    _venue_id,
    COALESCE((new.raw_user_meta_data->>'guest_limit')::integer, 10)
  );

  -- 2. Sync role & venue_id into app_metadata (used by JWT for RLS)
  _meta := COALESCE(new.raw_app_meta_data, '{}'::jsonb);
  _meta := _meta || jsonb_build_object('app_role', _role);
  IF _venue_id IS NOT NULL THEN
    _meta := _meta || jsonb_build_object('app_venue_id', _venue_id::text);
  ELSE
    _meta := _meta || jsonb_build_object('app_venue_id', null);
  END IF;

  UPDATE auth.users SET raw_app_meta_data = _meta WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_venues_active ON public.venues (active);

CREATE INDEX IF NOT EXISTS idx_users_venue_id ON public.users (venue_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_djs_venue_id ON public.djs (venue_id);

CREATE INDEX IF NOT EXISTS idx_djs_user_id ON public.djs (user_id);

CREATE INDEX IF NOT EXISTS idx_djs_active ON public.djs (active);

CREATE INDEX IF NOT EXISTS idx_guests_venue_id ON public.guests (venue_id);

CREATE INDEX IF NOT EXISTS idx_guests_date ON public.guests (date);

CREATE INDEX IF NOT EXISTS idx_guests_dj_id ON public.guests (dj_id);

CREATE INDEX IF NOT EXISTS idx_guests_external_link_id ON public.guests (external_link_id);

CREATE INDEX IF NOT EXISTS idx_guests_status ON public.guests (status);

CREATE INDEX IF NOT EXISTS idx_external_dj_links_venue_id ON public.external_dj_links (venue_id);

CREATE INDEX IF NOT EXISTS idx_external_dj_links_token ON public.external_dj_links (token);

CREATE INDEX IF NOT EXISTS idx_external_dj_links_date ON public.external_dj_links (date);

-- ============================================================
-- 4. ROW LEVEL SECURITY (JWT app_metadata based — no recursion)
-- ============================================================
-- RLS reads role/venue from auth.jwt()->'app_metadata' which is set by:
--   - handle_new_user() trigger on sign-up
--   - Edge Functions (create-user) with supabaseAdmin.auth.admin.updateUserById()
--
-- Key claims used:
--   (auth.jwt()->'app_metadata'->>'app_role')       — 'super_admin' | 'venue_admin' | 'door_staff' | 'staff' | 'dj'
--   (auth.jwt()->'app_metadata'->>'app_venue_id')   — UUID string or null

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.external_dj_links ENABLE ROW LEVEL SECURITY;

-- ---- Venues Policies ----
DROP POLICY IF EXISTS "Enable read access for all users" ON public.venues;

CREATE POLICY "Enable read access for all users" ON public.venues FOR
SELECT USING (true);

DROP POLICY IF EXISTS "Super admins can insert venues" ON public.venues;

CREATE POLICY "Super admins can insert venues" ON public.venues FOR
INSERT
WITH
    CHECK (
        (
            auth.jwt () -> 'app_metadata' ->> 'app_role'
        ) = 'super_admin'
    );

DROP POLICY IF EXISTS "Super admins can update venues" ON public.venues;

CREATE POLICY "Super admins can update venues" ON public.venues FOR
UPDATE USING (
    (
        auth.jwt () -> 'app_metadata' ->> 'app_role'
    ) = 'super_admin'
);

-- ---- Users Policies ----
-- Own profile: always allowed
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users FOR
SELECT USING (auth.uid () = auth_user_id);

-- Super admin: see all users
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;

CREATE POLICY "Super admins can view all users" ON public.users FOR
SELECT USING (
        (
            auth.jwt () -> 'app_metadata' ->> 'app_role'
        ) = 'super_admin'
    );

-- Venue staff can view users in same venue (needed to show "By User" in guest lists)
DROP POLICY IF EXISTS "Venue staff can view venue users" ON public.users;

CREATE POLICY "Venue staff can view venue users" ON public.users
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
        AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
    );

-- Own profile update
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile" ON public.users FOR
UPDATE USING (auth.uid () = auth_user_id);

-- Super admin: update all
DROP POLICY IF EXISTS "Super admins can update all users" ON public.users;

CREATE POLICY "Super admins can update all users" ON public.users FOR
UPDATE USING (
    (
        auth.jwt () -> 'app_metadata' ->> 'app_role'
    ) = 'super_admin'
);

-- Venue admin: update venue users
DROP POLICY IF EXISTS "Venue admins can update venue users" ON public.users;

CREATE POLICY "Venue admins can update venue users" ON public.users
    FOR UPDATE USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'venue_admin'
        AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
    );

-- ---- DJs Policies ----
DROP POLICY IF EXISTS "Venue members can view djs" ON public.djs;

CREATE POLICY "Venue members can view djs" ON public.djs
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
    );

DROP POLICY IF EXISTS "Super admins and venue admins can manage djs" ON public.djs;

CREATE POLICY "Super admins and venue admins can manage djs" ON public.djs
    FOR ALL USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') = 'venue_admin'
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

-- ---- Guests Policies ----
DROP POLICY IF EXISTS "Venue staff can view guests" ON public.guests;

CREATE POLICY "Venue staff can view guests" ON public.guests
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

DROP POLICY IF EXISTS "Venue staff and DJs can add guests" ON public.guests;

CREATE POLICY "Venue staff and DJs can add guests" ON public.guests
    FOR INSERT WITH CHECK (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

DROP POLICY IF EXISTS "Door staff and admins can update guests" ON public.guests;

CREATE POLICY "Door staff and admins can update guests" ON public.guests
    FOR UPDATE USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

DROP POLICY IF EXISTS "Admins can delete guests" ON public.guests;

CREATE POLICY "Admins can delete guests" ON public.guests
    FOR DELETE USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

-- Venue staff can view external links (needed to show DJ name in guest lists)
DROP POLICY IF EXISTS "Venue staff can view external links" ON public.external_dj_links;

CREATE POLICY "Venue staff can view external links" ON public.external_dj_links
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

DROP POLICY IF EXISTS "Admins can create external links" ON public.external_dj_links;

CREATE POLICY "Admins can create external links" ON public.external_dj_links
    FOR INSERT WITH CHECK (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') = 'venue_admin'
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

DROP POLICY IF EXISTS "Admins can update external links" ON public.external_dj_links;

CREATE POLICY "Admins can update external links" ON public.external_dj_links
    FOR UPDATE USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') = 'venue_admin'
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

DROP POLICY IF EXISTS "Admins can delete external links" ON public.external_dj_links;

CREATE POLICY "Admins can delete external links" ON public.external_dj_links
    FOR DELETE USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') = 'venue_admin'
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );
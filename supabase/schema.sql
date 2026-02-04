-- Supabase Auth Integration & RLS Improvements
--
-- [IMPORTANT] Security & Migration Note:
-- 1. 현재 설정은 개발 편의를 위해 RLS(Row Level Security)가 모든 접근을 허용하도록 설정되어 있습니다.
-- 2. 실제 서비스 배포 전에는 반드시 아래 주석 처리된 "Secure Policies" 섹션의 정책을 적용해야 합니다.
-- 3. 보안 정책을 적용하려면 기존 로컬 인증(`lib/auth.ts`) 대신 Supabase Auth(`supabase.auth.signInWithPassword`)를 사용해야 합니다.
-- 4. `public.users` 테이블의 `id`는 `auth.users.id`와 일치시키는 것이 권장됩니다.

-- Venues table
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'club' CHECK (type IN ('club', 'bar', 'lounge', 'festival', 'private')),
    address TEXT,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
-- Legacy Auth Support: `password_hash` is kept for existing local auth compatibility.
-- Supabase Auth 연동: public.users.id는 auth.users.id를 참조
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL, -- Kept for compatibility
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'door', 'dj')),
    guest_limit INTEGER DEFAULT 10,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DJs table
CREATE TABLE IF NOT EXISTS public.djs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    event TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guests table
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dj_id UUID REFERENCES public.djs(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'checked', 'deleted')),
    check_in_time TIMESTAMPTZ,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venues_active ON public.venues(active);
CREATE INDEX IF NOT EXISTS idx_users_venue_id ON public.users(venue_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_djs_venue_id ON public.djs(venue_id);
CREATE INDEX IF NOT EXISTS idx_djs_user_id ON public.djs(user_id);
CREATE INDEX IF NOT EXISTS idx_djs_active ON public.djs(active);
CREATE INDEX IF NOT EXISTS idx_guests_venue_id ON public.guests(venue_id);
CREATE INDEX IF NOT EXISTS idx_guests_date ON public.guests(date);
CREATE INDEX IF NOT EXISTS idx_guests_dj_id ON public.guests(dj_id);
CREATE INDEX IF NOT EXISTS idx_guests_status ON public.guests(status);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate guest venue matches dj venue (subquery not allowed in CHECK)
CREATE OR REPLACE FUNCTION enforce_guest_dj_venue_match()
RETURNS TRIGGER AS $$
DECLARE
    dj_venue_id UUID;
BEGIN
    IF NEW.dj_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT venue_id INTO dj_venue_id FROM public.djs WHERE id = NEW.dj_id;

    IF dj_venue_id IS NULL THEN
        RAISE EXCEPTION 'DJ not found for dj_id: %', NEW.dj_id;
    END IF;

    IF NEW.venue_id <> dj_venue_id THEN
        RAISE EXCEPTION 'Guest venue_id % does not match DJ venue_id %', NEW.venue_id, dj_venue_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_djs_updated_at BEFORE UPDATE ON public.djs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_guest_dj_venue_match_trigger
    BEFORE INSERT OR UPDATE ON public.guests
    FOR EACH ROW EXECUTE FUNCTION enforce_guest_dj_venue_match();

-- Row Level Security (RLS)
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- [DEVELOPMENT MODE] Allow all access
-- WARNING: This is insecure. Migrate to the policies below for production.
CREATE POLICY "Enable all access for venues" ON public.venues FOR ALL USING (true);
CREATE POLICY "Enable all access for users" ON public.users FOR ALL USING (true);
CREATE POLICY "Enable all access for djs" ON public.djs FOR ALL USING (true);
CREATE POLICY "Enable all access for guests" ON public.guests FOR ALL USING (true);

/*
-- [SECURE POLICIES] - Enable these after migrating to Supabase Auth
-- Drop the development policies above and uncomment these.

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Venues Policies
CREATE POLICY "Enable read access for all users" ON public.venues
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert venues" ON public.venues
    FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update venues" ON public.venues
    FOR UPDATE USING (public.get_current_user_role() = 'admin');

-- Users Policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id OR public.get_current_user_role() = 'admin');

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- DJs Policies
CREATE POLICY "Enable read access for djs" ON public.djs
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage djs" ON public.djs
    FOR ALL USING (public.get_current_user_role() = 'admin');

-- Guests Policies
CREATE POLICY "Venue staff can view guests" ON public.guests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.venue_id = guests.venue_id
            AND users.role IN ('admin', 'door', 'dj')
        )
    );

CREATE POLICY "Staff can add guests" ON public.guests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.venue_id = venue_id
            AND users.role IN ('admin', 'dj')
        )
    );

CREATE POLICY "Door can check in guests" ON public.guests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.venue_id = guests.venue_id
            AND users.role IN ('admin', 'door')
        )
    );
*/

-- Add unique constraint to users.email
ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Add extension for generating random UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Venues table (클럽, 이벤트 공간 등)
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

-- Users table (venue별 관리자, Door 스태프, DJ 등)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT guests_dj_venue_check CHECK (
        dj_id IS NULL OR 
        venue_id = (SELECT venue_id FROM public.djs WHERE id = dj_id)
    )
);

-- Indexes for better query performance
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
CREATE INDEX IF NOT EXISTS idx_guests_venue_date ON public.guests(venue_id, date);
CREATE INDEX IF NOT EXISTS idx_guests_venue_date_status ON public.guests(venue_id, date, status);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_djs_updated_at BEFORE UPDATE ON public.djs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample Venues data
INSERT INTO public.venues (id, name, type, address, description) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CLUB ALPHA', 'club', 'Sample Address 123, District A', 'Example nightclub venue A'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CLUB BETA', 'club', 'Sample Address 456, District B', 'Example nightclub venue B'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'LOUNGE GAMMA', 'lounge', 'Sample Address 789, District C', 'Example lounge venue C')
ON CONFLICT (id) DO NOTHING;

-- Sample Users data (password: 'password123' for all - 실제로는 해시 필요)
INSERT INTO public.users (id, venue_id, email, password_hash, name, role, guest_limit) VALUES
    -- CLUB ALPHA users
    ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@clubalpha.example', 'password123', 'Admin Smith', 'admin', 100),
    ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'door@clubalpha.example', 'password123', 'Door Johnson', 'door', 0),
    ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dj1@clubalpha.example', 'password123', 'DJ PHOENIX', 'dj', 20),
    ('10000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dj2@clubalpha.example', 'password123', 'DJ STORM', 'dj', 15),
    -- CLUB BETA users
    ('20000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin@clubbeta.example', 'password123', 'Admin Williams', 'admin', 100),
    ('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'door@clubbeta.example', 'password123', 'Door Davis', 'door', 0),
    ('20000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dj1@clubbeta.example', 'password123', 'DJ ECHO', 'dj', 18),
    -- LOUNGE GAMMA users
    ('30000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin@loungegamma.example', 'password123', 'Admin Brown', 'admin', 50),
    ('30000000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dj1@loungegamma.example', 'password123', 'DJ NOVA', 'dj', 12)
ON CONFLICT (id) DO NOTHING;

-- Sample DJs data (연결 user_id 포함)
INSERT INTO public.djs (id, venue_id, user_id, name, event) VALUES
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000003', 'DJ PHOENIX', 'FRIDAY NIGHT SESSION'),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000004', 'DJ STORM', 'SATURDAY VIBES'),
    ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', 'DJ ECHO', 'WEEKEND SPECIAL'),
    ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, 'DJ THUNDER', 'MONTHLY EVENT'),
    ('55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'DJ NOVA', 'LOUNGE SESSIONS')
ON CONFLICT (id) DO NOTHING;

-- Sample guests data
INSERT INTO public.guests (venue_id, name, dj_id, status, date, check_in_time) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'JOHN SMITH', '11111111-1111-1111-1111-111111111111', 'pending', '2025-08-30', NULL),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'JANE DOE', '11111111-1111-1111-1111-111111111111', 'checked', '2025-08-30', '2025-08-30 19:30:00+00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ROBERT WILSON', '22222222-2222-2222-2222-222222222222', 'pending', '2025-08-30', NULL),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'EMILY TAYLOR', '22222222-2222-2222-2222-222222222222', 'checked', '2025-08-30', '2025-08-30 20:15:00+00'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MICHAEL ANDERSON', '33333333-3333-3333-3333-333333333333', 'pending', '2025-08-30', NULL),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'SARAH MARTINEZ', '33333333-3333-3333-3333-333333333333', 'checked', '2025-08-30', '2025-08-30 21:00:00+00'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'DAVID GARCIA', '44444444-4444-4444-4444-444444444444', 'pending', '2025-08-30', NULL),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'LISA RODRIGUEZ', '55555555-5555-5555-5555-555555555555', 'pending', '2025-08-30', NULL),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GUEST EXAMPLE 1', NULL, 'deleted', '2025-08-25', NULL),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GUEST EXAMPLE 2', NULL, 'checked', '2025-08-25', '2025-08-25 18:00:00+00')
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) - 일단 모든 접근 허용 (개발용)
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users on venues" ON public.venues USING (true);
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users on users" ON public.users USING (true);
CREATE POLICY "Enable read access for all users" ON public.djs FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users on djs" ON public.djs USING (true);
CREATE POLICY "Enable all access for all users on guests" ON public.guests USING (true);

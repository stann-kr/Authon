-- Migration: Create events table for RA integration

-- 1. Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    venue_id UUID NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
    ra_event_id TEXT, -- RA의 고유 이벤트 ID
    title TEXT NOT NULL,
    date DATE NOT NULL,
    image_url TEXT,
    event_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (venue_id, ra_event_id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON public.events (venue_id);

CREATE INDEX IF NOT EXISTS idx_events_date ON public.events (date);

CREATE INDEX IF NOT EXISTS idx_events_ra_event_id ON public.events (ra_event_id);

-- 3. Triggers for updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Enable read access for all venue staff
DROP POLICY IF EXISTS "Venue staff can view events" ON public.events;

CREATE POLICY "Venue staff can view events" ON public.events
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

-- Policy: Only super admins and venue admins can manually insert/update/delete events
-- (Service role will bypass RLS during Edge Function sync)
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Admins can manage events" ON public.events
    FOR ALL USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') = 'venue_admin'
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );
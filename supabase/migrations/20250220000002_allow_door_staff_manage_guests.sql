-- Allow door_staff role to manage guests (INSERT and DELETE)
-- This role needs to be able to register guests at the door and remove them if necessary.

-- 1. UPDATE INSERT POLICY: add door_staff
DROP POLICY IF EXISTS "Venue staff and DJs can add guests" ON public.guests;

CREATE POLICY "Venue staff and DJs can add guests" ON public.guests
    FOR INSERT WITH CHECK (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

-- 2. UPDATE DELETE POLICY: add door_staff
DROP POLICY IF EXISTS "Admins can delete guests" ON public.guests;

CREATE POLICY "Admins can delete guests" ON public.guests
    FOR DELETE USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );
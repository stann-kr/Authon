-- Fix: Allow staff and dj roles to UPDATE guests (needed for soft-delete via deleteGuest)
-- Previously only venue_admin and door_staff could UPDATE, causing RLS errors
-- when staff/dj tried to delete their own guests.

DROP POLICY IF EXISTS "Door staff and admins can update guests" ON public.guests;
CREATE POLICY "Door staff and admins can update guests" ON public.guests
    FOR UPDATE USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

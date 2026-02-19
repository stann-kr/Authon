-- Add explicit read access for venue staff to the users table
-- This allows roles like 'door_staff' and 'dj' to see the names of users who created guests.

-- 1. Drop the existing venue admin exclusive policy
DROP POLICY IF EXISTS "Venue admins can view venue users" ON public.users;

DROP POLICY IF EXISTS "Venue staff can view venue users" ON public.users;

-- 2. Create the new inclusive policy for all venue staff
CREATE POLICY "Venue staff can view venue users" ON public.users
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
        AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
    );
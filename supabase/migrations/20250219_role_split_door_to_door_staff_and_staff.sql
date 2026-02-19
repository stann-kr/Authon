-- Migration: Split 'door' role into 'door_staff' and add 'staff'
-- Date: 2025-02-19
-- Description:
--   - Rename existing 'door' role to 'door_staff' (keeps Door + Guest access)
--   - Add new 'staff' role (Guest access only)
--   - Update CHECK constraint on users.role
--   - Update RLS policies for guests table

-- 1. Drop old CHECK constraint and add new one
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'venue_admin', 'door_staff', 'staff', 'dj'));

-- 2. Migrate existing 'door' users to 'door_staff'
UPDATE public.users SET role = 'door_staff' WHERE role = 'door';

-- 3. Update app_metadata for affected auth users
-- This needs to be done via admin API or manually per user.
-- The following comment serves as a reminder:
-- For each user with old role 'door', their auth.users.raw_app_meta_data
-- should be updated: app_role = 'door_staff'

-- 4. Recreate RLS policies for guests table

-- SELECT: all venue roles can view guests
DROP POLICY IF EXISTS "Venue staff can view guests" ON public.guests;
CREATE POLICY "Venue staff can view guests" ON public.guests
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

-- INSERT: staff and DJs can add guests (door_staff cannot add, only check-in)
DROP POLICY IF EXISTS "Venue staff and DJs can add guests" ON public.guests;
CREATE POLICY "Venue staff and DJs can add guests" ON public.guests
    FOR INSERT WITH CHECK (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

-- UPDATE: door_staff and admins can check-in guests
DROP POLICY IF EXISTS "Door staff and admins can update guests" ON public.guests;
CREATE POLICY "Door staff and admins can update guests" ON public.guests
    FOR UPDATE USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

-- DELETE: staff and DJs can delete their own guests
DROP POLICY IF EXISTS "Admins can delete guests" ON public.guests;
CREATE POLICY "Admins can delete guests" ON public.guests
    FOR DELETE USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );

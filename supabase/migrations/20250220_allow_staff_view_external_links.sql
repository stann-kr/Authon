-- Add explicit read access for venue staff to the external_dj_links table
-- This allows roles like 'door_staff' and 'dj' to see the DJ name for guests registered via links.

-- 1. Drop the existing admin exclusive policy
DROP POLICY IF EXISTS "Admins can view external links" ON public.external_dj_links;

DROP POLICY IF EXISTS "Venue staff can view external links" ON public.external_dj_links;

-- 2. Create the new inclusive policy for all venue staff
CREATE POLICY "Venue staff can view external links" ON public.external_dj_links
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'app_role') = 'super_admin'
        OR (
            (auth.jwt()->'app_metadata'->>'app_role') IN ('venue_admin', 'door_staff', 'staff', 'dj')
            AND (auth.jwt()->'app_metadata'->>'app_venue_id')::uuid = venue_id
        )
    );
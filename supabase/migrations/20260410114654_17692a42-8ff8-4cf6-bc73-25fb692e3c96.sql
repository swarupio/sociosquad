
DROP POLICY IF EXISTS "Org owners can verify attendance" ON public.volunteer_registrations;

ALTER TABLE public.volunteer_registrations DROP CONSTRAINT IF EXISTS volunteer_registrations_opportunity_id_fkey;
ALTER TABLE public.volunteer_registrations ALTER COLUMN opportunity_id TYPE text USING opportunity_id::text;

CREATE POLICY "Org owners can verify attendance"
  ON public.volunteer_registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM opportunities op
      JOIN organizations o ON o.id = op.org_id
      WHERE op.id::text = volunteer_registrations.opportunity_id
        AND o.user_id = auth.uid()
    )
  );

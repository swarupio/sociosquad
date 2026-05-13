-- Geocoded coordinates for volunteering map (nullable when geocoding fails)
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

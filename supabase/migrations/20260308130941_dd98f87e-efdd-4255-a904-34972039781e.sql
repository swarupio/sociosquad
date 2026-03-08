
-- User roles enum
CREATE TYPE public.app_role AS ENUM ('volunteer', 'organization');

-- User roles table (separate from profiles per security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'volunteer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role
  );
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  website TEXT DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT 'Mumbai',
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view orgs" ON public.organizations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can insert org" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update org" ON public.organizations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Real opportunities posted by NGOs
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  skills_needed TEXT[] DEFAULT '{}',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME DEFAULT '09:00',
  end_time TIME DEFAULT '17:00',
  location TEXT NOT NULL DEFAULT '',
  city TEXT DEFAULT 'Mumbai',
  max_volunteers INTEGER DEFAULT 50,
  time_commitment TEXT DEFAULT 'Half Day',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view open opportunities
CREATE POLICY "Anyone can view opportunities" ON public.opportunities
  FOR SELECT TO authenticated USING (true);
-- Org owners can manage their opportunities
CREATE POLICY "Org owner can insert" ON public.opportunities
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM organizations o WHERE o.id = org_id AND o.user_id = auth.uid()));
CREATE POLICY "Org owner can update" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM organizations o WHERE o.id = org_id AND o.user_id = auth.uid()));
CREATE POLICY "Org owner can delete" ON public.opportunities
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM organizations o WHERE o.id = org_id AND o.user_id = auth.uid()));

-- Volunteer registrations for opportunities
CREATE TABLE public.volunteer_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered',
  attended BOOLEAN DEFAULT false,
  hours_credited NUMERIC(5,1) DEFAULT 0,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, user_id)
);

ALTER TABLE public.volunteer_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view registrations" ON public.volunteer_registrations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can register" ON public.volunteer_registrations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own registration" ON public.volunteer_registrations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Org owners can update registrations (mark attendance)
CREATE POLICY "Org owners can verify attendance" ON public.volunteer_registrations
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM opportunities op
    JOIN organizations o ON o.id = op.org_id
    WHERE op.id = opportunity_id AND o.user_id = auth.uid()
  ));

-- Auto-assign volunteer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'volunteer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

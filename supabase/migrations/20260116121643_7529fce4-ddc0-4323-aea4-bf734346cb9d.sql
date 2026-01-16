-- Create families table
CREATE TABLE public.families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family members junction table
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, user_id)
);

-- Create family invitations table for email invites
CREATE TABLE public.family_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  UNIQUE(family_id, email)
);

-- Add family_id to pets table (optional - allows pet to be shared with a family)
ALTER TABLE public.pets ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Enable RLS on all new tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is family member
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE user_id = _user_id
      AND family_id = _family_id
  )
$$;

-- Security definer function to get all family IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_family_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id
  FROM public.family_members
  WHERE user_id = _user_id
$$;

-- Families RLS policies
CREATE POLICY "Users can view families they belong to"
ON public.families FOR SELECT
USING (public.is_family_member(auth.uid(), id));

CREATE POLICY "Users can create families"
ON public.families FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family members can update family"
ON public.families FOR UPDATE
USING (public.is_family_member(auth.uid(), id));

CREATE POLICY "Creator can delete family"
ON public.families FOR DELETE
USING (auth.uid() = created_by);

-- Family members RLS policies
CREATE POLICY "Users can view members of their families"
ON public.family_members FOR SELECT
USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can add new members"
ON public.family_members FOR INSERT
WITH CHECK (public.is_family_member(auth.uid(), family_id) OR auth.uid() = user_id);

CREATE POLICY "Users can remove themselves from family"
ON public.family_members FOR DELETE
USING (auth.uid() = user_id);

-- Family invitations RLS policies
CREATE POLICY "Family members can view invitations"
ON public.family_invitations FOR SELECT
USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create invitations"
ON public.family_invitations FOR INSERT
WITH CHECK (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can update invitations"
ON public.family_invitations FOR UPDATE
USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can delete invitations"
ON public.family_invitations FOR DELETE
USING (public.is_family_member(auth.uid(), family_id));

-- Update pets RLS policies to include family access
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
CREATE POLICY "Users can view their own pets or family pets"
ON public.pets FOR SELECT
USING (
  auth.uid() = user_id 
  OR family_id IN (SELECT public.get_user_family_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
CREATE POLICY "Users can update their own pets or family pets"
ON public.pets FOR UPDATE
USING (
  auth.uid() = user_id 
  OR family_id IN (SELECT public.get_user_family_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete their own pets" ON public.pets;
CREATE POLICY "Users can delete their own pets or family pets"
ON public.pets FOR DELETE
USING (
  auth.uid() = user_id 
  OR family_id IN (SELECT public.get_user_family_ids(auth.uid()))
);

-- Update pet_events RLS to include family pet access
DROP POLICY IF EXISTS "Users can view their own pet events" ON public.pet_events;
CREATE POLICY "Users can view their own pet events or family pet events"
ON public.pet_events FOR SELECT
USING (
  auth.uid() = user_id 
  OR pet_id IN (
    SELECT id FROM public.pets 
    WHERE family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can update their own pet events" ON public.pet_events;
CREATE POLICY "Users can update their own pet events or family pet events"
ON public.pet_events FOR UPDATE
USING (
  auth.uid() = user_id 
  OR pet_id IN (
    SELECT id FROM public.pets 
    WHERE family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can delete their own pet events" ON public.pet_events;
CREATE POLICY "Users can delete their own pet events or family pet events"
ON public.pet_events FOR DELETE
USING (
  auth.uid() = user_id 
  OR pet_id IN (
    SELECT id FROM public.pets 
    WHERE family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_families_updated_at
BEFORE UPDATE ON public.families
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
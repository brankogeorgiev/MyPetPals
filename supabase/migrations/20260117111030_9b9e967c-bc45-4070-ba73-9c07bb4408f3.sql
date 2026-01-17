-- Create a function to find a family by invite code (bypasses RLS)
CREATE OR REPLACE FUNCTION public.find_family_by_invite_code(_invite_code text)
RETURNS TABLE (
  id uuid,
  name text,
  created_by uuid,
  invite_code text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.name, f.created_by, f.invite_code, f.created_at
  FROM public.families f
  WHERE f.invite_code = UPPER(_invite_code)
  LIMIT 1
$$;

-- Allow users to join a family by inserting themselves if they know the family exists
-- The current INSERT policy allows: is_family_member OR auth.uid() = user_id
-- This already allows self-insertion, which is correct

-- The issue is that family_members SELECT policy uses is_family_member which causes recursion
-- on first check. Let's make the SELECT policy work for the user's own memberships too.
DROP POLICY IF EXISTS "Users can view members of their families" ON public.family_members;

CREATE POLICY "Users can view family members"
ON public.family_members
FOR SELECT
USING (
  user_id = auth.uid() OR 
  family_id IN (SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid())
);
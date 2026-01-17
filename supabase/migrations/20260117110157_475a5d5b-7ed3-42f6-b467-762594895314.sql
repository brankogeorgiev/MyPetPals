-- Add policy to allow creators to view their own families
-- This is needed because after INSERT with .select(), the user isn't a member yet
CREATE POLICY "Creator can view their own family"
ON public.families
FOR SELECT
USING (auth.uid() = created_by);
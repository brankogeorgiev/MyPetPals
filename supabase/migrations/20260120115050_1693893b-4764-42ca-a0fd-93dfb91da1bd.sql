-- Fix the get_family_members function to join on correct column
CREATE OR REPLACE FUNCTION public.get_family_members(_family_id uuid)
RETURNS TABLE (
  id uuid,
  family_id uuid,
  user_id uuid,
  joined_at timestamptz,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    fm.id,
    fm.family_id,
    fm.user_id,
    fm.joined_at,
    COALESCE(p.full_name, 'Unknown') as full_name,
    p.avatar_url
  FROM public.family_members fm
  LEFT JOIN public.profiles p ON p.user_id = fm.user_id
  WHERE fm.family_id = _family_id
  ORDER BY fm.joined_at ASC
$$;
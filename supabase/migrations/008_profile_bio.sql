-- Personal bio + ensure profiles are publicly readable
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Make sure the SELECT RLS policy is open (idempotent — already done in 006, repeat for safety)
DROP POLICY IF EXISTS "anyone can read profiles" ON public.profiles;
CREATE POLICY "anyone can read profiles"
  ON public.profiles FOR SELECT TO authenticated, anon USING (true);

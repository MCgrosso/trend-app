-- Allow authenticated users to read all profiles (needed for player list in duels)
GRANT SELECT ON public.profiles TO authenticated;

-- Allow reading answers to compute active_today
GRANT SELECT ON public.answers TO authenticated;

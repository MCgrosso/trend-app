-- Customizable avatar backgrounds
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_bg text DEFAULT 'purple';

-- Rebuild get_weekly_ranking to include avatar_bg in the return shape
DROP FUNCTION IF EXISTS get_weekly_ranking();

CREATE OR REPLACE FUNCTION get_weekly_ranking()
RETURNS TABLE (
  id           uuid,
  username     text,
  first_name   text,
  last_name    text,
  avatar_url   text,
  frame        text,
  avatar_bg    text,
  weekly_score bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.frame,
    p.avatar_bg,
    SUM(CASE WHEN a.is_correct THEN 10 ELSE 0 END)::bigint AS weekly_score
  FROM answers a
  JOIN profiles p ON a.user_id = p.id
  WHERE a.answered_at >= date_trunc('week', current_timestamp)
  GROUP BY p.id, p.username, p.first_name, p.last_name, p.avatar_url, p.frame, p.avatar_bg
  ORDER BY weekly_score DESC;
$$;

GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO anon;

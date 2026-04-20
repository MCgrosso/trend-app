-- Agregar columna frame a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS frame text DEFAULT 'white';

-- Recrear función con frame incluido
CREATE OR REPLACE FUNCTION get_weekly_ranking()
RETURNS TABLE (
  id           uuid,
  username     text,
  first_name   text,
  last_name    text,
  avatar_url   text,
  frame        text,
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
    COALESCE(
      SUM(CASE WHEN a.is_correct THEN 10 ELSE 0 END),
      0
    )::bigint AS weekly_score
  FROM profiles p
  LEFT JOIN answers a
    ON  a.user_id = p.id
    AND DATE_TRUNC('week', a.answered_at AT TIME ZONE 'UTC')
        = DATE_TRUNC('week', NOW() AT TIME ZONE 'UTC')
  GROUP BY p.id, p.username, p.first_name, p.last_name, p.avatar_url, p.frame
  ORDER BY weekly_score DESC;
$$;

GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO anon;

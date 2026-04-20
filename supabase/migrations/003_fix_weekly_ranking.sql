-- Corrige el filtro de fechas usando date_trunc('week', current_timestamp)
-- e INNER JOIN para mostrar solo usuarios que jugaron esta semana

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
    SUM(CASE WHEN a.is_correct THEN 10 ELSE 0 END)::bigint AS weekly_score
  FROM answers a
  JOIN profiles p ON a.user_id = p.id
  WHERE a.answered_at >= date_trunc('week', current_timestamp)
  GROUP BY p.id, p.username, p.first_name, p.last_name, p.avatar_url, p.frame
  ORDER BY weekly_score DESC;
$$;

GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO anon;

-- ── Inter-Church duels ────────────────────────────────────────────────────────
-- Adds an `is_inter_church` flag on duels (set at creation when both
-- participants belong to different, non-null churches), an `inter_church_wins`
-- counter on profiles (incremented on win when the duel was inter-church),
-- two RPCs for ranking views, and an updated `apply_duel_result` that keeps
-- the existing logic from migration 012 and just adds the counter increment.

-- ── Columns ─────────────────────────────────────────────────────────────────
ALTER TABLE public.duels
  ADD COLUMN IF NOT EXISTS is_inter_church boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS inter_church_wins integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_duels_is_inter_church
  ON public.duels(is_inter_church) WHERE is_inter_church = true;

-- ── RPC: ranking de iglesias ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_church_ranking()
RETURNS TABLE (
  id           uuid,
  name         text,
  abbreviation text,
  icon_emoji   text,
  member_count bigint,
  total_score  bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.abbreviation,
    c.icon_emoji,
    COUNT(p.id)                              AS member_count,
    COALESCE(SUM(p.total_score), 0)::bigint  AS total_score
  FROM public.churches c
  LEFT JOIN public.profiles p ON p.church_id = c.id
  WHERE c.status = 'approved'
  GROUP BY c.id, c.name, c.abbreviation, c.icon_emoji
  ORDER BY total_score DESC, member_count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_church_ranking() TO anon, authenticated;

-- ── RPC: embajadores (top inter_church_wins por iglesia) ────────────────────
CREATE OR REPLACE FUNCTION public.get_church_ambassadors()
RETURNS TABLE (
  church_id          uuid,
  user_id            uuid,
  username           text,
  first_name         text,
  inter_church_wins  integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (p.church_id)
    p.church_id,
    p.id           AS user_id,
    p.username,
    p.first_name,
    p.inter_church_wins
  FROM public.profiles p
  WHERE p.church_id IS NOT NULL
    AND p.inter_church_wins > 0
  ORDER BY p.church_id, p.inter_church_wins DESC, p.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_church_ambassadors() TO anon, authenticated;

-- ── apply_duel_result: same as 012, plus inter_church_wins increment ─────────
-- Returns jsonb (preserved API). Idempotent via duels.result_applied.
CREATE OR REPLACE FUNCTION public.apply_duel_result(p_duel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duel        duels%ROWTYPE;
  v_winner_id   uuid;
  v_loser_id    uuid;
  v_is_draw     boolean;
BEGIN
  SELECT * INTO v_duel FROM duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'duel_not_found');
  END IF;

  IF auth.uid() IS NULL
     OR (auth.uid() <> v_duel.challenger_id AND auth.uid() <> v_duel.opponent_id) THEN
    RETURN jsonb_build_object('error', 'not_participant');
  END IF;

  IF v_duel.status <> 'finished' THEN
    RETURN jsonb_build_object('error', 'duel_not_finished');
  END IF;

  IF v_duel.result_applied THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', true);
  END IF;

  v_is_draw := (v_duel.winner_id IS NULL);

  IF v_is_draw THEN
    UPDATE profiles
    SET draws       = draws + 1,
        total_score = total_score + 10,
        win_streak  = 0
    WHERE id IN (v_duel.challenger_id, v_duel.opponent_id);
  ELSE
    v_winner_id := v_duel.winner_id;
    v_loser_id  := CASE
      WHEN v_winner_id = v_duel.challenger_id THEN v_duel.opponent_id
      ELSE v_duel.challenger_id
    END;

    UPDATE profiles
    SET wins              = wins + 1,
        total_score       = total_score + 20,
        win_streak        = win_streak + 1,
        best_streak       = GREATEST(best_streak, win_streak + 1),
        inter_church_wins = inter_church_wins + (CASE WHEN v_duel.is_inter_church THEN 1 ELSE 0 END)
    WHERE id = v_winner_id;

    UPDATE profiles
    SET losses      = losses + 1,
        total_score = total_score + 5,
        win_streak  = 0
    WHERE id = v_loser_id;
  END IF;

  -- Recompute titles for both participants
  UPDATE profiles SET title = (
    CASE
      WHEN wins >= 100       THEN 'rey'
      WHEN win_streak >= 10  THEN 'invencible'
      WHEN wins >= 50        THEN 'leyenda'
      WHEN win_streak >= 3   THEN 'profeta'
      WHEN wins >= 30        THEN 'campeon'
      WHEN wins >= 15        THEN 'guerrero'
      WHEN wins >= 5         THEN 'aprendiz'
      ELSE 'novato'
    END
  ) WHERE id IN (v_duel.challenger_id, v_duel.opponent_id);

  UPDATE duels SET result_applied = true WHERE id = p_duel_id;

  RETURN jsonb_build_object(
    'ok', true,
    'winner_id', v_winner_id::text,
    'loser_id',  v_loser_id::text,
    'draw',      v_is_draw,
    'inter_church', v_duel.is_inter_church
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_duel_result(uuid) TO authenticated;

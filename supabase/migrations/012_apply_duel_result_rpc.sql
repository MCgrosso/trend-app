-- ── Fix: duels only counted wins on one profile ─────────────────────────────
-- Root cause: the profiles RLS policy "users can update own profile" allows
-- only auth.uid() = id, so when the TS action updated BOTH profiles with the
-- user's session client, the opponent's row was silently blocked.
--
-- Fix: SECURITY DEFINER RPC that applies the result to both profiles at once,
-- bypassing RLS. Callable by either participant.

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

  -- Only the two participants may invoke this
  IF auth.uid() IS NULL
     OR (auth.uid() <> v_duel.challenger_id AND auth.uid() <> v_duel.opponent_id) THEN
    RETURN jsonb_build_object('error', 'not_participant');
  END IF;

  IF v_duel.status <> 'finished' THEN
    RETURN jsonb_build_object('error', 'duel_not_finished');
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
    SET wins        = wins + 1,
        total_score = total_score + 20,
        win_streak  = win_streak + 1,
        best_streak = GREATEST(best_streak, win_streak + 1)
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

  RETURN jsonb_build_object(
    'ok', true,
    'winner_id', v_winner_id::text,
    'loser_id',  v_loser_id::text,
    'draw',      v_is_draw
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_duel_result(uuid) TO authenticated;

-- Idempotency guard: prevent double-applying a duel's result ------------------
-- If the duel was already applied once, a second call must not re-increment.
ALTER TABLE public.duels ADD COLUMN IF NOT EXISTS result_applied boolean DEFAULT false;

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
    SET wins        = wins + 1,
        total_score = total_score + 20,
        win_streak  = win_streak + 1,
        best_streak = GREATEST(best_streak, win_streak + 1)
    WHERE id = v_winner_id;

    UPDATE profiles
    SET losses      = losses + 1,
        total_score = total_score + 5,
        win_streak  = 0
    WHERE id = v_loser_id;
  END IF;

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
    'draw',      v_is_draw
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_duel_result(uuid) TO authenticated;

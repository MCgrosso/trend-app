-- ── Categories ──────────────────────────────────────────────────────────────
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category text DEFAULT 'General';

-- ── Profile duel stats & title ────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS duel_wins        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duel_losses      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duel_draws       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duel_win_streak  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duel_best_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS title            text    DEFAULT 'novato';

-- ── Duels table ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duels (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'pending',
  -- pending → opponent must accept
  -- active  → both answer questions
  -- finished
  -- cancelled / rejected
  categories          text[]      DEFAULT '{}',
  challenger_score    integer     DEFAULT 0,
  opponent_score      integer     DEFAULT 0,
  winner_id           uuid        REFERENCES profiles(id),
  challenger_finished boolean     DEFAULT false,
  opponent_finished   boolean     DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  finished_at         timestamptz
);

-- ── Duel questions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duel_questions (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id            uuid    NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  question_id        uuid    NOT NULL REFERENCES questions(id),
  question_order     integer NOT NULL,
  challenger_answer  text,
  challenger_correct boolean,
  opponent_answer    text,
  opponent_correct   boolean
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE duels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants see duel" ON duels
  FOR SELECT TO authenticated
  USING (challenger_id = auth.uid() OR opponent_id = auth.uid());

CREATE POLICY "challenger creates duel" ON duels
  FOR INSERT TO authenticated
  WITH CHECK (challenger_id = auth.uid());

CREATE POLICY "participants update duel" ON duels
  FOR UPDATE TO authenticated
  USING (challenger_id = auth.uid() OR opponent_id = auth.uid());

CREATE POLICY "participants see duel questions" ON duel_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM duels d
      WHERE d.id = duel_id
        AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
    )
  );

CREATE POLICY "participants insert duel questions" ON duel_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM duels d
      WHERE d.id = duel_id
        AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
    )
  );

CREATE POLICY "participants update duel questions" ON duel_questions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM duels d
      WHERE d.id = duel_id
        AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE duels;

-- ── Helper: duels played today ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_daily_duel_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer
  FROM duels
  WHERE (challenger_id = p_user_id OR opponent_id = p_user_id)
    AND status NOT IN ('cancelled', 'rejected')
    AND created_at >= date_trunc('day', current_timestamp);
$$;
GRANT EXECUTE ON FUNCTION get_daily_duel_count(uuid) TO authenticated;

-- ── Finish duel (atomic) ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finish_duel(p_duel_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_duel         duels%ROWTYPE;
  v_is_challenger boolean;
  v_winner_id    uuid;
  v_result       text;
  v_pts_winner   integer := 20;
  v_pts_loser    integer := 5;
  v_pts_draw     integer := 10;
BEGIN
  SELECT * INTO v_duel FROM duels WHERE id = p_duel_id FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Duel not found'); END IF;
  IF v_duel.status = 'finished' THEN RETURN jsonb_build_object('ok', true); END IF;

  v_is_challenger := (v_duel.challenger_id = p_user_id);

  -- Mark this player as finished
  IF v_is_challenger THEN
    UPDATE duels SET challenger_finished = true WHERE id = p_duel_id;
    v_duel.challenger_finished := true;
  ELSE
    UPDATE duels SET opponent_finished = true WHERE id = p_duel_id;
    v_duel.opponent_finished := true;
  END IF;

  -- Only resolve when both done
  IF NOT (v_duel.challenger_finished AND v_duel.opponent_finished) THEN
    RETURN jsonb_build_object('waiting', true);
  END IF;

  -- Determine winner
  IF v_duel.challenger_score > v_duel.opponent_score THEN
    v_winner_id := v_duel.challenger_id;
    v_result    := 'challenger';
  ELSIF v_duel.opponent_score > v_duel.challenger_score THEN
    v_winner_id := v_duel.opponent_id;
    v_result    := 'opponent';
  ELSE
    v_winner_id := NULL;
    v_result    := 'draw';
  END IF;

  -- Update duel
  UPDATE duels
  SET status = 'finished', winner_id = v_winner_id, finished_at = now()
  WHERE id = p_duel_id;

  -- Update profiles
  IF v_result = 'draw' THEN
    UPDATE profiles SET
      duel_draws = duel_draws + 1,
      total_score = total_score + v_pts_draw,
      duel_win_streak = 0
    WHERE id IN (v_duel.challenger_id, v_duel.opponent_id);
  ELSE
    -- Winner
    UPDATE profiles SET
      duel_wins = duel_wins + 1,
      total_score = total_score + v_pts_winner,
      duel_win_streak = duel_win_streak + 1,
      duel_best_streak = GREATEST(duel_best_streak, duel_win_streak + 1)
    WHERE id = v_winner_id;
    -- Loser
    UPDATE profiles SET
      duel_losses = duel_losses + 1,
      total_score = total_score + v_pts_loser,
      duel_win_streak = 0
    WHERE id = CASE WHEN v_result = 'challenger' THEN v_duel.opponent_id ELSE v_duel.challenger_id END;
  END IF;

  -- Recompute titles
  UPDATE profiles SET title = (
    CASE
      WHEN duel_wins >= 100 THEN 'rey'
      WHEN duel_win_streak >= 10 THEN 'invencible'
      WHEN duel_wins >= 50 THEN 'leyenda'
      WHEN duel_wins >= 30 THEN 'campeon'
      WHEN duel_win_streak >= 3 THEN 'profeta'
      WHEN duel_wins >= 15 THEN 'guerrero'
      WHEN duel_wins >= 5 THEN 'aprendiz'
      ELSE 'novato'
    END
  ) WHERE id IN (v_duel.challenger_id, v_duel.opponent_id);

  RETURN jsonb_build_object('result', v_result, 'winner_id', v_winner_id::text);
END;
$$;
GRANT EXECUTE ON FUNCTION finish_duel(uuid, uuid) TO authenticated;

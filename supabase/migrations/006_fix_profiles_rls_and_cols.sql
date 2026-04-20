-- ── Fix column names (rename duel_* → wins/losses/draws/win_streak/best_streak) ──
-- Only rename if they were created with the duel_ prefix
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='duel_wins') THEN
    ALTER TABLE profiles RENAME COLUMN duel_wins        TO wins;
    ALTER TABLE profiles RENAME COLUMN duel_losses      TO losses;
    ALTER TABLE profiles RENAME COLUMN duel_draws       TO draws;
    ALTER TABLE profiles RENAME COLUMN duel_win_streak  TO win_streak;
    ALTER TABLE profiles RENAME COLUMN duel_best_streak TO best_streak;
  END IF;
END $$;

-- If the columns don't exist yet (migration 004 not run), create them with the short names
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wins        integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS losses      integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS draws       integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_streak  integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_streak integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title       text    DEFAULT 'novato';

-- ── Allow all authenticated users to READ all profiles ───────────────────────
-- Drop any existing select policies that restrict to own row, then add open one.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "authenticated users can read all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

-- Keep write policies scoped to own row
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "users can insert own profile" ON profiles;
CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ── Fix finish_duel function to use new column names ─────────────────────────
CREATE OR REPLACE FUNCTION finish_duel(p_duel_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_duel         duels%ROWTYPE;
  v_is_challenger boolean;
  v_winner_id    uuid;
  v_result       text;
BEGIN
  SELECT * INTO v_duel FROM duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Duel not found'); END IF;
  IF v_duel.status = 'finished' THEN RETURN jsonb_build_object('ok', true); END IF;

  v_is_challenger := (v_duel.challenger_id = p_user_id);

  IF v_is_challenger THEN
    UPDATE duels SET challenger_finished = true WHERE id = p_duel_id;
    v_duel.challenger_finished := true;
  ELSE
    UPDATE duels SET opponent_finished = true WHERE id = p_duel_id;
    v_duel.opponent_finished := true;
  END IF;

  IF NOT (v_duel.challenger_finished AND v_duel.opponent_finished) THEN
    RETURN jsonb_build_object('waiting', true);
  END IF;

  IF v_duel.challenger_score > v_duel.opponent_score THEN
    v_winner_id := v_duel.challenger_id; v_result := 'challenger';
  ELSIF v_duel.opponent_score > v_duel.challenger_score THEN
    v_winner_id := v_duel.opponent_id;  v_result := 'opponent';
  ELSE
    v_winner_id := NULL; v_result := 'draw';
  END IF;

  UPDATE duels SET status = 'finished', winner_id = v_winner_id, finished_at = now()
  WHERE id = p_duel_id;

  IF v_result = 'draw' THEN
    UPDATE profiles SET draws = draws + 1, total_score = total_score + 10, win_streak = 0
    WHERE id IN (v_duel.challenger_id, v_duel.opponent_id);
  ELSE
    UPDATE profiles SET wins = wins + 1, total_score = total_score + 20,
      win_streak = win_streak + 1, best_streak = GREATEST(best_streak, win_streak + 1)
    WHERE id = v_winner_id;
    UPDATE profiles SET losses = losses + 1, total_score = total_score + 5, win_streak = 0
    WHERE id = CASE WHEN v_result = 'challenger' THEN v_duel.opponent_id ELSE v_duel.challenger_id END;
  END IF;

  UPDATE profiles SET title = (
    CASE
      WHEN wins >= 100          THEN 'rey'
      WHEN win_streak >= 10     THEN 'invencible'
      WHEN wins >= 50           THEN 'leyenda'
      WHEN wins >= 30           THEN 'campeon'
      WHEN win_streak >= 3      THEN 'profeta'
      WHEN wins >= 15           THEN 'guerrero'
      WHEN wins >= 5            THEN 'aprendiz'
      ELSE 'novato'
    END
  ) WHERE id IN (v_duel.challenger_id, v_duel.opponent_id);

  RETURN jsonb_build_object('result', v_result, 'winner_id', v_winner_id::text);
END;
$$;
GRANT EXECUTE ON FUNCTION finish_duel(uuid, uuid) TO authenticated;

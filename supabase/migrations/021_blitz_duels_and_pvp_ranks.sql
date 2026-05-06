-- ── Modos contrarreloj (Blitz / Dinámico) + sistema de rangos PVP ─────────────
-- Tabla blitz_duels para los duelos contrarreloj (independiente de duels para
-- no contaminar lógica existente de preguntas compartidas, energía, etc.)
-- Sistema de rangos basado en pvp_points: Novato/Aprendiz/Veterano/Leyenda.
-- Multiplicadores aplicados al ganar contra rango distinto.

-- ── Profile columns ──────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pvp_rank           text    DEFAULT 'Novato',
  ADD COLUMN IF NOT EXISTS pvp_points         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pvp_win_streak     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pvp_best_streak    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pvp_total_games    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pvp_win_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blitz_wins         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blitz_best_score   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dynamic_wins       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dynamic_best_time  integer DEFAULT 0;

-- ── blitz_duels table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blitz_duels (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode                      text NOT NULL CHECK (mode IN ('blitz', 'dynamic')),
  challenger_score          integer DEFAULT 0,
  opponent_score            integer DEFAULT 0,
  challenger_time_survived  integer DEFAULT 0,
  opponent_time_survived    integer DEFAULT 0,
  challenger_rank           text,
  opponent_rank             text,
  winner_id                 uuid REFERENCES public.profiles(id),
  rank_multiplier           numeric DEFAULT 1.0,
  same_rank                 boolean DEFAULT false,
  status                    text    DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished')),
  result_applied            boolean DEFAULT false,
  challenger_finished       boolean DEFAULT false,
  opponent_finished         boolean DEFAULT false,
  challenger_points_delta   integer,
  opponent_points_delta     integer,
  started_at                timestamptz,
  finished_at               timestamptz,
  created_at                timestamptz DEFAULT now()
);

GRANT ALL ON public.blitz_duels TO authenticated;
ALTER TABLE public.blitz_duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view their blitz duels" ON public.blitz_duels;
CREATE POLICY "Players can view their blitz duels" ON public.blitz_duels
  FOR SELECT TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "Players can insert blitz duels" ON public.blitz_duels;
CREATE POLICY "Players can insert blitz duels" ON public.blitz_duels
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS "Players can update their blitz duels" ON public.blitz_duels;
CREATE POLICY "Players can update their blitz duels" ON public.blitz_duels
  FOR UPDATE TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Realtime para sincronizar fin de tiempo / rival caído entre ambos clientes
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_duels;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ── Notifications: agregar user_id opcional para notifs personales ──────────
-- (Las globales siguen funcionando con user_id = NULL.)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "users insert own personal notifications" ON public.notifications;
CREATE POLICY "users insert own personal notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── Rank helpers ─────────────────────────────────────────────────────────────
-- Mantener en sincronía con src/lib/pvpRanks.ts
CREATE OR REPLACE FUNCTION public.compute_pvp_rank(p_points integer)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_points >= 600 THEN 'Leyenda'
    WHEN p_points >= 300 THEN 'Veterano'
    WHEN p_points >= 100 THEN 'Aprendiz'
    ELSE 'Novato'
  END;
$$;
GRANT EXECUTE ON FUNCTION public.compute_pvp_rank(integer) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.pvp_rank_order(p_rank text)
RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_rank
    WHEN 'Novato'    THEN 1
    WHEN 'Aprendiz'  THEN 2
    WHEN 'Veterano'  THEN 3
    WHEN 'Leyenda'   THEN 4
    ELSE 1
  END;
$$;
GRANT EXECUTE ON FUNCTION public.pvp_rank_order(text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.update_pvp_rank(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_points integer;
  v_new_rank text;
BEGIN
  SELECT pvp_points INTO v_points FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_new_rank := public.compute_pvp_rank(v_points);
  UPDATE profiles SET pvp_rank = v_new_rank WHERE id = p_user_id;
  RETURN v_new_rank;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_pvp_rank(uuid) TO authenticated;

-- Backfill rangos de jugadores existentes según sus puntos actuales
UPDATE profiles
SET pvp_rank = public.compute_pvp_rank(COALESCE(pvp_points, 0))
WHERE pvp_rank IS NULL OR pvp_rank = '';

-- ── apply_blitz_result: actualiza puntos/rango/wins atómicamente ────────────
-- Espera que el duelo ya esté en status='finished' con winner_id seteado.
-- Devuelve { ok, draw, winner_id, loser_id, winner_delta, loser_delta,
--           winner_old_rank, winner_new_rank, ranked_up, mode }.
CREATE OR REPLACE FUNCTION public.apply_blitz_result(p_duel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duel              blitz_duels%ROWTYPE;
  v_winner_id         uuid;
  v_loser_id          uuid;
  v_is_draw           boolean;
  v_winner_rank       text;
  v_loser_rank        text;
  v_winner_points     integer;
  v_loser_points      integer;
  v_winner_delta      integer;
  v_loser_delta       integer;
  v_winner_old_rank   text;
  v_winner_new_points integer;
  v_winner_new_rank   text;
  v_loser_new_points  integer;
  v_loser_new_rank    text;
  v_ch_id             uuid;
  v_op_id             uuid;
  v_ch_delta          integer;
  v_op_delta          integer;
  v_winner_blitz_score integer;
  v_winner_dyn_time    integer;
BEGIN
  SELECT * INTO v_duel FROM blitz_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'duel_not_found'); END IF;

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

  v_ch_id   := v_duel.challenger_id;
  v_op_id   := v_duel.opponent_id;
  v_is_draw := (v_duel.winner_id IS NULL);

  IF v_is_draw THEN
    -- Empate: solo cuenta el game para ambos, sin puntos ni rachas
    UPDATE profiles
    SET pvp_total_games = pvp_total_games + 1,
        pvp_win_streak  = 0
    WHERE id IN (v_ch_id, v_op_id);

    UPDATE profiles
    SET pvp_win_percentage = CASE
      WHEN pvp_total_games = 0 THEN 0
      ELSE ROUND( (blitz_wins + dynamic_wins)::numeric * 100 / pvp_total_games, 1)
    END
    WHERE id IN (v_ch_id, v_op_id);

    UPDATE blitz_duels
    SET result_applied         = true,
        challenger_points_delta = 0,
        opponent_points_delta   = 0
    WHERE id = p_duel_id;

    RETURN jsonb_build_object('ok', true, 'draw', true, 'winner_delta', 0, 'loser_delta', 0, 'mode', v_duel.mode);
  END IF;

  v_winner_id := v_duel.winner_id;
  v_loser_id  := CASE WHEN v_winner_id = v_ch_id THEN v_op_id ELSE v_ch_id END;

  SELECT pvp_rank, pvp_points INTO v_winner_rank, v_winner_points FROM profiles WHERE id = v_winner_id FOR UPDATE;
  SELECT pvp_rank, pvp_points INTO v_loser_rank,  v_loser_points  FROM profiles WHERE id = v_loser_id  FOR UPDATE;

  v_winner_old_rank := v_winner_rank;

  -- Cálculo de deltas según diferencia de rango
  IF v_winner_rank = v_loser_rank THEN
    v_winner_delta := 20;
  ELSIF public.pvp_rank_order(v_loser_rank) > public.pvp_rank_order(v_winner_rank) THEN
    v_winner_delta := 35; -- ganador era de rango inferior
  ELSE
    v_winner_delta := 10; -- ganador era de rango superior
  END IF;

  IF v_winner_rank = v_loser_rank THEN
    v_loser_delta := -10;
  ELSIF public.pvp_rank_order(v_winner_rank) > public.pvp_rank_order(v_loser_rank) THEN
    v_loser_delta := -5;  -- perdió contra alguien de rango superior
  ELSE
    v_loser_delta := -15; -- perdió contra alguien de rango inferior
  END IF;

  v_winner_new_points := v_winner_points + v_winner_delta;
  v_loser_new_points  := GREATEST(0, v_loser_points + v_loser_delta);
  v_winner_new_rank   := public.compute_pvp_rank(v_winner_new_points);
  v_loser_new_rank    := public.compute_pvp_rank(v_loser_new_points);

  -- Puntaje del ganador en este duelo según el modo
  IF v_winner_id = v_ch_id THEN
    v_winner_blitz_score := v_duel.challenger_score;
    v_winner_dyn_time    := v_duel.challenger_time_survived;
  ELSE
    v_winner_blitz_score := v_duel.opponent_score;
    v_winner_dyn_time    := v_duel.opponent_time_survived;
  END IF;

  -- Update WINNER
  UPDATE profiles
  SET pvp_points       = v_winner_new_points,
      pvp_rank         = v_winner_new_rank,
      pvp_win_streak   = pvp_win_streak + 1,
      pvp_best_streak  = GREATEST(pvp_best_streak, pvp_win_streak + 1),
      pvp_total_games  = pvp_total_games + 1,
      blitz_wins       = blitz_wins   + (CASE WHEN v_duel.mode = 'blitz'   THEN 1 ELSE 0 END),
      blitz_best_score = (CASE WHEN v_duel.mode = 'blitz'
                                 THEN GREATEST(blitz_best_score, v_winner_blitz_score)
                                 ELSE blitz_best_score END),
      dynamic_wins     = dynamic_wins + (CASE WHEN v_duel.mode = 'dynamic' THEN 1 ELSE 0 END),
      dynamic_best_time = (CASE WHEN v_duel.mode = 'dynamic'
                                  THEN GREATEST(dynamic_best_time, v_winner_dyn_time)
                                  ELSE dynamic_best_time END)
  WHERE id = v_winner_id;

  -- Update LOSER
  UPDATE profiles
  SET pvp_points      = v_loser_new_points,
      pvp_rank        = v_loser_new_rank,
      pvp_win_streak  = 0,
      pvp_total_games = pvp_total_games + 1
  WHERE id = v_loser_id;

  -- Recalcular pvp_win_percentage para ambos
  UPDATE profiles
  SET pvp_win_percentage = CASE
    WHEN pvp_total_games = 0 THEN 0
    ELSE ROUND( (blitz_wins + dynamic_wins)::numeric * 100 / pvp_total_games, 1)
  END
  WHERE id IN (v_winner_id, v_loser_id);

  -- Persistir deltas en el duelo (orden challenger/opponent)
  IF v_winner_id = v_ch_id THEN
    v_ch_delta := v_winner_delta;
    v_op_delta := v_loser_delta;
  ELSE
    v_ch_delta := v_loser_delta;
    v_op_delta := v_winner_delta;
  END IF;

  UPDATE blitz_duels
  SET result_applied         = true,
      challenger_points_delta = v_ch_delta,
      opponent_points_delta   = v_op_delta
  WHERE id = p_duel_id;

  RETURN jsonb_build_object(
    'ok', true,
    'draw', false,
    'winner_id', v_winner_id::text,
    'loser_id',  v_loser_id::text,
    'winner_delta', v_winner_delta,
    'loser_delta',  v_loser_delta,
    'winner_old_rank', v_winner_old_rank,
    'winner_new_rank', v_winner_new_rank,
    'ranked_up', (public.pvp_rank_order(v_winner_new_rank) > public.pvp_rank_order(v_winner_old_rank)),
    'mode', v_duel.mode
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_blitz_result(uuid) TO authenticated;

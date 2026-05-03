-- ── Sistema de XP, niveles, energía y modo rankeado/amistoso ────────────────
-- profiles: xp/level (progresión), energy/energy_last_recharge (PVP rankeado),
-- ranked_wins/unranked_wins (breakdown del campo `wins` que sigue como total).
-- duels: is_ranked (true por default = todos los duelos previos cuentan como rankeados).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp                     integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level                  integer     DEFAULT 1,
  ADD COLUMN IF NOT EXISTS energy                 integer     DEFAULT 5,
  ADD COLUMN IF NOT EXISTS energy_last_recharge   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ranked_wins            integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unranked_wins          integer     DEFAULT 0;

ALTER TABLE public.duels
  ADD COLUMN IF NOT EXISTS is_ranked boolean DEFAULT true;

-- Backfill: cualquier duelo previo (sin is_ranked seteado) queda como rankeado
UPDATE public.duels SET is_ranked = true WHERE is_ranked IS NULL;

-- ── RPC: energía actual considerando recarga continua ────────────────────────
-- Cada 7200s (= 2hs) suma 1 punto, hasta un máximo de 5.
CREATE OR REPLACE FUNCTION public.get_current_energy(p_energy integer, p_last_recharge timestamptz)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT LEAST(5, p_energy + FLOOR(EXTRACT(EPOCH FROM (now() - p_last_recharge)) / 7200)::integer);
$$;

GRANT EXECUTE ON FUNCTION public.get_current_energy(integer, timestamptz) TO anon, authenticated;

-- ── RPC para gastar energía atómicamente al aceptar un duelo rankeado ───────
-- Calcula la energía actual, devuelve false si está en 0, sino la decrementa
-- y normaliza energy_last_recharge para que el "tick" siga contando desde ahora.
CREATE OR REPLACE FUNCTION public.consume_energy(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored integer;
  v_last   timestamptz;
  v_now    integer;
  v_ticks  integer;
BEGIN
  -- Solo el propio usuario puede gastar su energía
  IF auth.uid() <> p_user_id THEN RETURN false; END IF;

  SELECT energy, energy_last_recharge INTO v_stored, v_last
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;

  v_ticks := FLOOR(EXTRACT(EPOCH FROM (now() - v_last)) / 7200)::integer;
  v_now   := LEAST(5, v_stored + v_ticks);

  IF v_now <= 0 THEN RETURN false; END IF;

  UPDATE profiles
    SET energy = v_now - 1,
        -- Reseteamos el contador de recarga: lo "anclamos" al múltiplo entero
        -- más cercano al pasado, para no perder progreso parcial de recarga.
        energy_last_recharge = v_last + make_interval(secs => v_ticks * 7200)
    WHERE id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_energy(uuid) TO authenticated;

-- ── RPC para sumar XP y recalcular nivel atómicamente ───────────────────────
-- Devuelve { new_xp, new_level, levels_gained } como jsonb.
-- Fórmula del usuario: xpForLevel(n) = 100 + (n-1) * 50  (XP de n→n+1)
-- Acumulado para alcanzar nivel L: sum k=1..L-1 (100 + (k-1)*50) = (L-1)*100 + 25*(L-1)*(L-2)
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_old      integer;
  v_level_old   integer;
  v_xp_new      integer;
  v_level_new   integer;
  v_threshold   integer;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'noop', true);
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  -- Permitimos a cualquier sesión autenticada otorgarse XP a sí misma o
  -- a través de SECURITY DEFINER siendo admin (para hooks de duelo, etc).
  IF auth.uid() <> p_user_id
     AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT xp, level INTO v_xp_old, v_level_old FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'profile_not_found'); END IF;

  v_xp_new    := COALESCE(v_xp_old, 0) + p_amount;
  v_level_new := COALESCE(v_level_old, 1);

  -- Subir niveles uno a uno hasta que el XP acumulado no alcance el siguiente.
  -- Cap de seguridad en nivel 50.
  LOOP
    EXIT WHEN v_level_new >= 50;
    -- Acumulado para alcanzar el siguiente nivel:
    v_threshold := v_level_new * 100 + 25 * v_level_new * (v_level_new - 1);
    EXIT WHEN v_xp_new < v_threshold;
    v_level_new := v_level_new + 1;
  END LOOP;

  UPDATE profiles SET xp = v_xp_new, level = v_level_new WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'new_xp', v_xp_new,
    'new_level', v_level_new,
    'levels_gained', v_level_new - COALESCE(v_level_old, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer) TO authenticated;

-- ── apply_duel_result: actualizar para distinguir rankeado/amistoso + sumar XP
-- Mantiene la firma jsonb. Cambios:
--   * Si is_ranked: incrementa ranked_wins + sigue actualizando wins/losses (totales)
--   * Si NO ranked: solo incrementa unranked_wins. NO afecta wins, losses, draws,
--     win_streak ni total_score (los amistosos no tocan ranking ni títulos).
--   * XP: ranked → ganador +30 / perdedor +10 / empate +15 c/u.
--          amistoso → ganador +15 / perdedor +5 / empate +10 c/u.
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
  v_xp_winner   integer;
  v_xp_loser    integer;
BEGIN
  SELECT * INTO v_duel FROM duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'duel_not_found'); END IF;

  IF auth.uid() IS NULL
     OR (auth.uid() <> v_duel.challenger_id AND auth.uid() <> v_duel.opponent_id) THEN
    RETURN jsonb_build_object('error', 'not_participant');
  END IF;

  IF v_duel.status <> 'finished' THEN RETURN jsonb_build_object('error', 'duel_not_finished'); END IF;
  IF v_duel.result_applied THEN RETURN jsonb_build_object('ok', true, 'already_applied', true); END IF;

  v_is_draw := (v_duel.winner_id IS NULL);

  IF v_is_draw THEN
    IF COALESCE(v_duel.is_ranked, true) THEN
      UPDATE profiles
      SET draws       = draws + 1,
          total_score = total_score + 10,
          win_streak  = 0
      WHERE id IN (v_duel.challenger_id, v_duel.opponent_id);
      v_xp_winner := 15; v_xp_loser := 15; -- empate ranked: 15 c/u
    ELSE
      v_xp_winner := 10; v_xp_loser := 10; -- empate amistoso
    END IF;
    PERFORM award_xp(v_duel.challenger_id, v_xp_winner);
    PERFORM award_xp(v_duel.opponent_id,   v_xp_loser);
  ELSE
    v_winner_id := v_duel.winner_id;
    v_loser_id  := CASE WHEN v_winner_id = v_duel.challenger_id THEN v_duel.opponent_id ELSE v_duel.challenger_id END;

    IF COALESCE(v_duel.is_ranked, true) THEN
      UPDATE profiles
      SET wins              = wins + 1,
          ranked_wins       = ranked_wins + 1,
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
      v_xp_winner := 30; v_xp_loser := 10;
    ELSE
      UPDATE profiles
      SET unranked_wins = unranked_wins + 1
      WHERE id = v_winner_id;
      v_xp_winner := 15; v_xp_loser := 5;
    END IF;
    PERFORM award_xp(v_winner_id, v_xp_winner);
    PERFORM award_xp(v_loser_id,  v_xp_loser);
  END IF;

  -- Recalcular títulos solo si fue rankeado (los amistosos no afectan títulos)
  IF COALESCE(v_duel.is_ranked, true) THEN
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
  END IF;

  UPDATE duels SET result_applied = true WHERE id = p_duel_id;

  RETURN jsonb_build_object(
    'ok', true,
    'winner_id', v_winner_id::text,
    'loser_id',  v_loser_id::text,
    'draw',      v_is_draw,
    'ranked',    COALESCE(v_duel.is_ranked, true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_duel_result(uuid) TO authenticated;

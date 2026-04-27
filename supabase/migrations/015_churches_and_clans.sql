-- ── Churches & Clans system ───────────────────────────────────────────────────
-- Adds two organizational layers above profiles:
--   * churches: real-world congregations a user attends.
--   * clans:    in-app teams (predefined "tribes" or user-created) that may
--               belong to a church.
-- Profiles get optional church_id and clan_id columns.
-- Seeds the MVDA church and the 12 tribes of Israel as predefined clans of MVDA.

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.churches (
  id            uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          text        NOT NULL,
  abbreviation  text,
  icon_emoji    text        DEFAULT '⛪',
  icon_url      text,
  description   text,
  status        text        DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clans (
  id             uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           text        NOT NULL,
  church_id      uuid        REFERENCES public.churches(id) ON DELETE SET NULL,
  shield_color   text        DEFAULT '#7c3aed',
  shield_bg      text        DEFAULT 'purple',
  shield_icon    text        DEFAULT '⚔️',
  created_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_predefined  boolean     DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

-- ── Profile membership columns ──────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS clan_id   uuid REFERENCES public.clans(id)    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_church_id ON public.profiles(church_id);
CREATE INDEX IF NOT EXISTS idx_profiles_clan_id   ON public.profiles(clan_id);
CREATE INDEX IF NOT EXISTS idx_clans_church_id    ON public.clans(church_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "churches_select_approved_or_own" ON public.churches;
CREATE POLICY "churches_select_approved_or_own"
  ON public.churches FOR SELECT
  USING (
    status = 'approved'
    OR requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "churches_insert_authenticated" ON public.churches;
CREATE POLICY "churches_insert_authenticated"
  ON public.churches FOR INSERT
  WITH CHECK (auth.uid() = requested_by AND status = 'pending');

DROP POLICY IF EXISTS "churches_update_admin" ON public.churches;
CREATE POLICY "churches_update_admin"
  ON public.churches FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "churches_delete_admin" ON public.churches;
CREATE POLICY "churches_delete_admin"
  ON public.churches FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "clans_select_all" ON public.clans;
CREATE POLICY "clans_select_all"
  ON public.clans FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "clans_insert_user" ON public.clans;
CREATE POLICY "clans_insert_user"
  ON public.clans FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      is_predefined = false
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  );

DROP POLICY IF EXISTS "clans_update_creator_or_admin" ON public.clans;
CREATE POLICY "clans_update_creator_or_admin"
  ON public.clans FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "clans_delete_admin" ON public.clans;
CREATE POLICY "clans_delete_admin"
  ON public.clans FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.churches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clans    TO authenticated;
GRANT SELECT ON public.churches TO anon;
GRANT SELECT ON public.clans    TO anon;

-- ── Seed: MVDA + 12 tribus de Israel ────────────────────────────────────────
DO $$
DECLARE
  mvda_id uuid;
BEGIN
  -- Insert MVDA only if not already present
  IF NOT EXISTS (SELECT 1 FROM public.churches WHERE abbreviation = 'MVDA') THEN
    INSERT INTO public.churches (name, abbreviation, icon_emoji, status)
    VALUES ('Ministerio Visión de Águila', 'MVDA', '🦅', 'approved');
  END IF;

  SELECT id INTO mvda_id FROM public.churches WHERE abbreviation = 'MVDA' LIMIT 1;

  IF mvda_id IS NOT NULL THEN
    -- Insert each tribe only if not already present (idempotent re-run)
    INSERT INTO public.clans (name, church_id, shield_color, shield_bg, shield_icon, is_predefined)
    SELECT v.name, mvda_id, v.color, v.bg, v.icon, true
    FROM (VALUES
      ('Tribu de Judá',     '#eab308', 'gold',    '🦁'),
      ('Tribu de Leví',     '#06b6d4', 'cyan',    '📜'),
      ('Tribu de Rubén',    '#ef4444', 'red',     '💧'),
      ('Tribu de Simeón',   '#f97316', 'orange',  '⚔️'),
      ('Tribu de Dan',      '#10b981', 'emerald', '🐍'),
      ('Tribu de Neftalí',  '#8b5cf6', 'purple',  '🦌'),
      ('Tribu de Gad',      '#a3a3a3', 'gray',    '⚡'),
      ('Tribu de Aser',     '#f59e0b', 'amber',   '🫒'),
      ('Tribu de Isacar',   '#0ea5e9', 'sky',     '☀️'),
      ('Tribu de Zabulón',  '#3b82f6', 'blue',    '⛵'),
      ('Tribu de José',     '#84cc16', 'lime',    '🌾'),
      ('Tribu de Benjamín', '#ec4899', 'pink',    '🐺')
    ) AS v(name, color, bg, icon)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.clans c
      WHERE c.name = v.name AND c.church_id = mvda_id
    );
  END IF;
END $$;

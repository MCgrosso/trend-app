-- ── Personaje de cuerpo entero (sprite LPC) ──────────────────────────────────
-- Se muestra en los duelos. Valores posibles: 'chico' | 'chica'.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "character" text NOT NULL DEFAULT 'chico';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_character_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_character_check CHECK ("character" IN ('chico', 'chica'));
  END IF;
END $$;

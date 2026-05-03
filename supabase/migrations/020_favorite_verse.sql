-- ── Versículo favorito por usuario ───────────────────────────────────────────
-- Texto del versículo + referencia (libro cap:vers). Se muestra en el perfil
-- público y aparece en la tarjeta de presentación compartible.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favorite_verse     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS favorite_verse_ref text DEFAULT '';

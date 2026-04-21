-- Ensure all answer columns exist on duel_questions (idempotent)
ALTER TABLE public.duel_questions ADD COLUMN IF NOT EXISTS challenger_answer  text;
ALTER TABLE public.duel_questions ADD COLUMN IF NOT EXISTS challenger_correct boolean;
ALTER TABLE public.duel_questions ADD COLUMN IF NOT EXISTS opponent_answer    text;
ALTER TABLE public.duel_questions ADD COLUMN IF NOT EXISTS opponent_correct   boolean;

GRANT SELECT, INSERT, UPDATE ON public.duel_questions TO authenticated;

-- Re-create RLS policies (drop + create = idempotent)
ALTER TABLE public.duel_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants see duel questions"     ON public.duel_questions;
DROP POLICY IF EXISTS "participants insert duel questions"  ON public.duel_questions;
DROP POLICY IF EXISTS "participants update duel questions"  ON public.duel_questions;

CREATE POLICY "participants see duel questions"
  ON public.duel_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM duels d
      WHERE d.id = duel_id
        AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
    )
  );

CREATE POLICY "participants insert duel questions"
  ON public.duel_questions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM duels d
      WHERE d.id = duel_id
        AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
    )
  );

CREATE POLICY "participants update duel questions"
  ON public.duel_questions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM duels d
      WHERE d.id = duel_id
        AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
    )
  );

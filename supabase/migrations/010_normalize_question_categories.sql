-- Ensure every question has a non-null, non-empty category so the duel
-- fallback (which queries by id alone) and category match work consistently.

UPDATE public.questions
SET category = 'General'
WHERE category IS NULL OR trim(category) = '';

-- Helpful index for the .in('category', ...) query used by acceptDuel
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);

-- Verify counts (run manually in SQL editor):
--   SELECT category, count(*) FROM questions GROUP BY category ORDER BY count DESC;

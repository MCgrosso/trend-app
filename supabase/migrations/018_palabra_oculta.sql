-- ── Modo de juego "La Palabra Oculta" ────────────────────────────────────────
-- Tipo ahorcado con versículos bíblicos. Una jugada por usuario por versículo.
-- Cada día tiene su propio puzzle (available_date).

CREATE TABLE IF NOT EXISTS public.word_puzzles (
  id              uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  verse           text        NOT NULL,
  reference       text        NOT NULL,
  hidden_words    text[]      NOT NULL,
  hint            text        NOT NULL,
  available_date  date        NOT NULL DEFAULT current_date,
  difficulty      text        DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_word_puzzles_date ON public.word_puzzles(available_date);

CREATE TABLE IF NOT EXISTS public.word_puzzle_attempts (
  id            uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  puzzle_id     uuid        NOT NULL REFERENCES public.word_puzzles(id) ON DELETE CASCADE,
  completed     boolean     DEFAULT false,
  errors        integer     DEFAULT 0,
  time_seconds  integer,
  score         integer     DEFAULT 0,
  completed_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, puzzle_id)
);

CREATE INDEX IF NOT EXISTS idx_wpa_user ON public.word_puzzle_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_wpa_puzzle ON public.word_puzzle_attempts(puzzle_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.word_puzzles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_puzzle_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "word_puzzles_read_all" ON public.word_puzzles;
CREATE POLICY "word_puzzles_read_all" ON public.word_puzzles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "word_puzzles_write_admin" ON public.word_puzzles;
CREATE POLICY "word_puzzles_write_admin" ON public.word_puzzles
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "wpa_select_own" ON public.word_puzzle_attempts;
CREATE POLICY "wpa_select_own" ON public.word_puzzle_attempts
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wpa_insert_own" ON public.word_puzzle_attempts;
CREATE POLICY "wpa_insert_own" ON public.word_puzzle_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wpa_update_own" ON public.word_puzzle_attempts;
CREATE POLICY "wpa_update_own" ON public.word_puzzle_attempts
  FOR UPDATE USING (user_id = auth.uid());

GRANT SELECT ON public.word_puzzles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.word_puzzles         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.word_puzzle_attempts TO authenticated;

-- ── Seed: 14 versículos para los próximos 14 días ───────────────────────────
INSERT INTO public.word_puzzles (verse, reference, hidden_words, hint, available_date, difficulty) VALUES
('Porque de tal manera amó Dios al mundo, que dio a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.', 'Juan 3:16', ARRAY['manera','mundo','unigénito','cree','eterna'], 'El versículo más conocido de la Biblia sobre el amor de Dios', current_date, 'easy'),
('El Señor es mi pastor; nada me faltará.', 'Salmo 23:1', ARRAY['pastor','faltará'], 'El Salmo más amado de David', current_date + 1, 'easy'),
('Todo lo puedo en Cristo que me fortalece.', 'Filipenses 4:13', ARRAY['puedo','Cristo','fortalece'], 'Versículo de fortaleza del apóstol Pablo', current_date + 2, 'easy'),
('Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.', 'Jeremías 29:11', ARRAY['pensamientos','paz','mal','esperáis'], 'Promesa de Dios sobre el futuro', current_date + 3, 'medium'),
('Confía en Jehová con todo tu corazón, y no te apoyes en tu propia prudencia.', 'Proverbios 3:5', ARRAY['Confía','corazón','apoyes','prudencia'], 'Versículo sobre la confianza en Dios', current_date + 4, 'medium'),
('Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas.', 'Isaías 40:31', ARRAY['esperan','fuerzas','alas','águilas'], 'Promesa para los que esperan en Dios', current_date + 5, 'medium'),
('No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo.', 'Isaías 41:10', ARRAY['temas','contigo','desmayes','esfuerzo'], 'Palabras de aliento de Dios', current_date + 6, 'medium'),
('El Señor es mi luz y mi salvación; ¿de quién temeré? El Señor es la fortaleza de mi vida; ¿de quién me he de atemorizar?', 'Salmo 27:1', ARRAY['luz','salvación','temeré','fortaleza','atemorizar'], 'Declaración de confianza de David', current_date + 7, 'hard'),
('¿No te he mandado que te esfuerces y seas valiente? No temas ni desmayes, porque Jehová tu Dios estará contigo dondequiera que vayas.', 'Josué 1:9', ARRAY['esfuerces','valiente','temas','desmayes','dondequiera'], 'Mandato de Dios a Josué antes de entrar a Canaán', current_date + 8, 'hard'),
('Amarás al Señor tu Dios con todo tu corazón, y con toda tu alma, y con toda tu mente.', 'Mateo 22:37', ARRAY['Amarás','corazón','alma','mente'], 'El mandamiento más importante según Jesús', current_date + 9, 'medium'),
('Porque la paga del pecado es muerte, mas la dádiva de Dios es vida eterna en Cristo Jesús Señor nuestro.', 'Romanos 6:23', ARRAY['pecado','muerte','dádiva','eterna'], 'Versículo central del evangelio', current_date + 10, 'hard'),
('Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.', 'Mateo 6:33', ARRAY['buscad','primeramente','justicia','añadidas'], 'Enseñanza de Jesús sobre las prioridades', current_date + 11, 'medium'),
('En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.', 'Juan 1:1', ARRAY['principio','Verbo','Dios'], 'El comienzo del evangelio de Juan', current_date + 12, 'easy'),
('Yo soy la vid, vosotros los pámpanos; el que permanece en mí, y yo en él, éste lleva mucho fruto.', 'Juan 15:5', ARRAY['vid','pámpanos','permanece','fruto'], 'Jesús explica la relación con sus discípulos', current_date + 13, 'hard')
ON CONFLICT DO NOTHING;

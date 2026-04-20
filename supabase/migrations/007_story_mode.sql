-- ── Story Mode schema ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.story_chapters (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  book              text        NOT NULL,
  chapter           integer     NOT NULL,
  title             text        NOT NULL,
  character_name    text        NOT NULL,
  character_emoji   text        NOT NULL,
  introduction      text        NOT NULL,
  bible_tip         text        NOT NULL,
  week_start        date        NOT NULL,
  week_end          date        NOT NULL,
  is_active         boolean     DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.story_answers (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES profiles(id) NOT NULL,
  chapter_id  uuid        REFERENCES story_chapters(id) NOT NULL,
  question_id uuid        REFERENCES questions(id) NOT NULL,
  is_correct  boolean     NOT NULL,
  answered_at timestamptz DEFAULT now(),
  UNIQUE (user_id, question_id)
);

GRANT ALL    ON public.story_chapters TO authenticated;
GRANT SELECT ON public.story_chapters TO anon;
GRANT ALL    ON public.story_answers  TO authenticated;

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS story_chapter_id uuid REFERENCES story_chapters(id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.story_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_answers  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapters readable by everyone" ON public.story_chapters;
CREATE POLICY "chapters readable by everyone"
  ON public.story_chapters FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "admins manage chapters" ON public.story_chapters;
CREATE POLICY "admins manage chapters"
  ON public.story_chapters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "users see own story answers" ON public.story_answers;
CREATE POLICY "users see own story answers"
  ON public.story_answers FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users insert own story answers" ON public.story_answers;
CREATE POLICY "users insert own story answers"
  ON public.story_answers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ── Seed: Génesis 1 chapter + 5 questions ────────────────────────────────────
DO $$
DECLARE
  v_chapter_id uuid;
  v_exists     boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM story_chapters WHERE book = 'Génesis' AND chapter = 1) INTO v_exists;

  IF NOT v_exists THEN
    INSERT INTO story_chapters (
      book, chapter, title, character_name, character_emoji,
      introduction, bible_tip, week_start, week_end, is_active
    ) VALUES (
      'Génesis', 1,
      'El Principio de Todo',
      'Moisés',
      '🧔',
      '¡Shalom! Soy Moisés, siervo del Señor. Antes de comenzar este desafío, quiero contarte algo maravilloso... En el principio, cuando todo era oscuridad y vacío, Dios habló. Y con Su palabra, todo cobró vida. En seis días creó los cielos, la tierra, las aguas, las plantas, los animales... y finalmente, Su obra más especial: el ser humano, creado a Su propia imagen. Este capítulo es el fundamento de todo lo que leerás en la Biblia. ¿Estás listo para demostrar que lo conocés?',
      '📖 Te recomiendo tener tu Biblia cerca. Abrí Génesis capítulo 1 y leelo antes de responder. ¡Te va a ayudar muchísimo!',
      current_date, current_date + 6, true
    ) RETURNING id INTO v_chapter_id;

    INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_option, explanation, available_date, category, story_chapter_id) VALUES
      ('¿Qué creó Dios en el primer día?',
       'La tierra y el mar', 'La luz', 'Las plantas', 'El sol y la luna',
       'B', 'En el primer día Dios dijo "Sea la luz" y separó la luz de las tinieblas (Génesis 1:3-5)',
       current_date, 'Modo Historia', v_chapter_id),
      ('¿Qué separó Dios en el segundo día?',
       'La tierra del mar', 'El día de la noche', 'Las aguas de arriba de las de abajo', 'Los animales de las plantas',
       'C', 'Dios creó el firmamento para separar las aguas que estaban debajo de las que estaban sobre el firmamento (Génesis 1:6-8)',
       current_date, 'Modo Historia', v_chapter_id),
      ('¿En qué día creó Dios al ser humano?',
       'Cuarto día', 'Quinto día', 'Sexto día', 'Séptimo día',
       'C', 'En el sexto día Dios creó al hombre y a la mujer a su imagen y semejanza (Génesis 1:26-31)',
       current_date, 'Modo Historia', v_chapter_id),
      ('¿A imagen de quién fue creado el ser humano?',
       'De los ángeles', 'De los animales', 'De Dios mismo', 'De la naturaleza',
       'C', 'Génesis 1:27 dice: "Y creó Dios al hombre a su imagen, a imagen de Dios lo creó"',
       current_date, 'Modo Historia', v_chapter_id),
      ('¿Qué hizo Dios el séptimo día?',
       'Creó los océanos', 'Creó las estrellas', 'Descansó y bendijo ese día', 'Creó los animales',
       'C', 'Dios descansó el séptimo día de toda su obra y lo bendijo y santificó (Génesis 2:2-3)',
       current_date, 'Modo Historia', v_chapter_id);
  END IF;
END $$;

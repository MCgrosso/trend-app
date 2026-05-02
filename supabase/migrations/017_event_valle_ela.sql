-- ── Evento "Valle de Elá": 7 días con David ──────────────────────────────────
-- events_challenge: define cada día (formato RPG / narrativo / unlock).
-- events_progress:  guarda completado, score y reflexión por usuario.
-- Días RPG embeben sus 5 preguntas en una columna jsonb (battle_questions).

CREATE TABLE IF NOT EXISTS public.events_challenge (
  id                uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_name        text        NOT NULL DEFAULT 'Valle de Elá',
  day_number        integer     NOT NULL,
  title             text        NOT NULL,
  subtitle          text        NOT NULL,
  format            text        NOT NULL CHECK (format IN ('rpg','narrative','unlock')),
  narrative_text    text        NOT NULL,
  reflection_prompt text,
  character_image   text,
  enemy_image       text,
  unlock_date       timestamptz NOT NULL,
  frame_reward      text,
  frame_color       text,
  frame_style       text,
  battle_questions  jsonb,
  is_active         boolean     DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (event_name, day_number)
);

CREATE TABLE IF NOT EXISTS public.events_progress (
  id                uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_day_id  uuid        NOT NULL REFERENCES public.events_challenge(id) ON DELETE CASCADE,
  completed         boolean     DEFAULT false,
  score             integer     DEFAULT 0,
  reflection_answer text,
  is_public         boolean     DEFAULT false,
  completed_at      timestamptz,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (user_id, challenge_day_id)
);

CREATE INDEX IF NOT EXISTS idx_events_progress_user   ON public.events_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_events_progress_public ON public.events_progress(is_public) WHERE is_public = true;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.events_challenge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_progress  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_challenge_read_all" ON public.events_challenge;
CREATE POLICY "events_challenge_read_all" ON public.events_challenge
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "events_challenge_write_admin" ON public.events_challenge;
CREATE POLICY "events_challenge_write_admin" ON public.events_challenge
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "events_progress_select_own_or_public" ON public.events_progress;
CREATE POLICY "events_progress_select_own_or_public" ON public.events_progress
  FOR SELECT USING (
    user_id = auth.uid()
    OR (is_public = true AND reflection_answer IS NOT NULL)
  );

DROP POLICY IF EXISTS "events_progress_insert_own" ON public.events_progress;
CREATE POLICY "events_progress_insert_own" ON public.events_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "events_progress_update_own" ON public.events_progress;
CREATE POLICY "events_progress_update_own" ON public.events_progress
  FOR UPDATE USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events_challenge TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events_progress  TO authenticated;
GRANT SELECT ON public.events_challenge TO anon;
GRANT SELECT ON public.events_progress  TO anon;

-- ── Seed: 7 días del Valle de Elá ───────────────────────────────────────────
DO $$
DECLARE
  q_pastor jsonb := '[
    {"q":"¿De qué tribu de Israel era David?","a":"Judá","options":["Judá","Leví","Benjamín","Dan"]},
    {"q":"¿Qué animal arrebató una oveja del rebaño?","a":"Un oso","options":["Un oso","Un lobo","Un león","Un águila"]},
    {"q":"¿Quién era el padre de David?","a":"Isaí","options":["Isaí","Saúl","Samuel","Booz"]},
    {"q":"¿En qué ciudad pastoreaba David?","a":"Belén","options":["Belén","Hebrón","Jerusalén","Betel"]},
    {"q":"¿Cuál fue la actitud de David ante el oso?","a":"Lo enfrentó con valentía","options":["Lo enfrentó con valentía","Llamó a sus hermanos","Huyó al pueblo","Esperó al amanecer"]}
  ]'::jsonb;
  q_defensor jsonb := '[
    {"q":"¿Qué animal mató David además del oso?","a":"Un león","options":["Un león","Un toro","Un jabalí","Una serpiente"]},
    {"q":"¿Cómo agarró David al león?","a":"De la quijada","options":["De la quijada","De la cola","De las patas","De la melena"]},
    {"q":"¿En quién confiaba David para sus batallas?","a":"En Jehová","options":["En Jehová","En sus hermanos","En su fuerza","En su honda"]},
    {"q":"¿Qué cuidaba David en el campo?","a":"Las ovejas de su padre","options":["Las ovejas de su padre","Su propio rebaño","Las cabras del rey","Vacas del pueblo"]},
    {"q":"¿Qué le enseñaron estas batallas a David?","a":"A confiar en Dios","options":["A confiar en Dios","A pelear solo","A esconderse","A huir rápido"]}
  ]'::jsonb;
  q_elegido jsonb := '[
    {"q":"¿Cuántas piedras eligió David del arroyo?","a":"Cinco","options":["Cinco","Tres","Siete","Diez"]},
    {"q":"¿Qué arma usó David para vencer a Goliat?","a":"Una honda","options":["Una honda","Una espada","Un arco","Una lanza"]},
    {"q":"¿En el nombre de quién enfrentó David a Goliat?","a":"De Jehová de los ejércitos","options":["De Jehová de los ejércitos","De Saúl","De Israel","De su padre"]},
    {"q":"¿Cuántos días desafió Goliat a Israel?","a":"Cuarenta","options":["Cuarenta","Diez","Veinte","Siete"]},
    {"q":"¿Dónde golpeó la piedra a Goliat?","a":"En la frente","options":["En la frente","En el pecho","En el brazo","En la pierna"]}
  ]'::jsonb;
BEGIN
  INSERT INTO public.events_challenge
    (day_number, title, subtitle, format, narrative_text, reflection_prompt,
     character_image, enemy_image, unlock_date, frame_reward, frame_color, frame_style, battle_questions)
  VALUES
    (1, 'Pastor de Ovejas', 'David defiende su rebaño', 'rpg',
     E'Antes de ser rey, David era un joven pastor en los campos de Belén. Mientras sus hermanos mayores hacían otras cosas, él cuidaba las ovejas de su padre Isaí con dedicación y valentía.\n\nUn día, un oso llegó y arrebató una oveja del rebaño. David no huyó. Fue tras él, lo golpeó y rescató la oveja de su boca. Lo mismo hizo con un león.\n\nDavid dijo: "Jehová, que me ha librado de las garras del león y del oso, Él también me librará de la mano de este filisteo." (1 Samuel 17:34-37)',
     '¿En qué área de tu vida necesitás tener la valentía de David para defender lo que Dios te dio?',
     '/david_pastor.png', '/oso_batalla.png',
     '2026-05-02 01:00:00+00',
     'pastor_frame', '#22c55e', 'green_pastoral', q_pastor),

    (2, 'Músico de Dios', 'La música que calmaba tormentas', 'narrative',
     E'El rey Saúl era atormentado por un espíritu de angustia. Sus siervos buscaron a alguien que supiera tocar el arpa para calmarlo.\n\nLe hablaron de David, el hijo de Isaí, que era hábil músico. Cuando David tocaba, el espíritu malo se apartaba de Saúl y el rey encontraba alivio.\n\nDios había puesto en David un don especial: la música que ministraba al alma. Los Salmos que David escribió siguen ministrando corazones hoy, miles de años después.',
     '¿Qué don o talento te dio Dios que podrías usar para ministrar a otros como David usó su música?',
     '/david_musico.png', NULL,
     '2026-05-03 01:00:00+00',
     'musico_frame', '#f59e0b', 'gold_musical', NULL),

    (3, 'Ungido de Dios', 'El día que todo cambió', 'narrative',
     E'Dios le dijo al profeta Samuel: "Ve a Isaí de Belén porque de sus hijos me he provisto de rey." Samuel fue y vio a Eliab, el mayor e imponente, y pensó que era el elegido.\n\nPero Dios le dijo: "No mires su apariencia ni su estatura. Los hombres miran lo que está delante de sus ojos, pero Jehová mira el corazón."\n\nPasaron siete hijos ante Samuel y ninguno era el elegido. "¿Son estos todos tus hijos?" preguntó Samuel. "Queda el menor, que apacienta las ovejas."\n\nCuando David llegó, Dios dijo: "Levántate y úngelo, porque este es." Samuel tomó el cuerno de aceite y lo ungió en medio de sus hermanos.',
     '¿Alguna vez te sentiste ignorado o no considerado como David? ¿Cómo te hace sentir saber que Dios mira tu corazón?',
     '/david_ungido.png', NULL,
     '2026-05-04 01:00:00+00',
     'ungido_frame', '#7c3aed', 'purple_anointed', NULL),

    (4, 'Defensor del Rebaño', 'La batalla contra el león', 'rpg',
     E'David recordó otro día en los campos. Un león rugiente se lanzó sobre el rebaño.\n\nLos demás pastores habrían huido, pero David no era cualquier pastor. Él sabía que esas ovejas estaban bajo su cuidado y protección.\n\nCon fe en Dios y valentía en su corazón, David fue tras el león, lo tomó de la quijada y lo mató. Esta experiencia forjó en David una confianza inquebrantable: no en sus propias fuerzas, sino en el Dios que lo acompañaba en cada batalla.',
     '¿Qué "leones" enfrentás en tu vida que parecen imposibles de vencer? ¿Podés confiarle esa batalla a Dios?',
     '/david_batalla.png', '/leon_batalla.png',
     '2026-05-05 01:00:00+00',
     'defensor_frame', '#ef4444', 'red_warrior', q_defensor),

    (5, 'Mensajero del Rey', 'El día que David vio el valle', 'narrative',
     E'Los filisteos se habían reunido para la batalla y entre ellos estaba Goliat, un gigante de casi tres metros de altura que desafiaba a Israel cada mañana y cada tarde por cuarenta días. Nadie en el ejército de Israel se atrevía a enfrentarlo.\n\nIsaí envió a David con comida para sus hermanos que estaban en el ejército. Cuando David llegó al campamento y escuchó el desafío de Goliat, se indignó:\n\n"¿Quién es este filisteo incircunciso para desafiar a los ejércitos del Dios viviente?"\n\nSus hermanos se enojaron con él pero David no se calló.',
     '¿Qué injusticia o desafío te indigna tanto que no podés quedarte callado? ¿Podría ser Dios llamándote a actuar?',
     '/david_batalla.png', NULL,
     '2026-05-06 01:00:00+00',
     'mensajero_frame', '#00d4ff', 'blue_messenger', NULL),

    (6, 'El Elegido', 'David vs Goliat', 'rpg',
     E'David fue ante el rey Saúl y dijo: "No desmaye el corazón de ninguno a causa de él; tu siervo irá y peleará contra este filisteo."\n\nSaúl le ofreció su armadura pero David no estaba acostumbrado a ella. Tomó su cayado, eligió cinco piedras lisas del arroyo, su honda en mano, y fue hacia Goliat.\n\nEl gigante lo vio y lo menospreció. "¿Soy yo un perro para que vengas a mí con palos?" gritó Goliat.\n\nDavid respondió: "Tú vienes a mí con espada y lanza, pero yo vengo a ti en el nombre de Jehová de los ejércitos. Jehová te entregará hoy en mi mano."\n\nDavid metió su mano en la bolsa, tomó una piedra, la lanzó con su honda... y el gigante cayó.',
     '¿Qué "Goliat" enfrentás hoy? ¿Podés enfrentarlo en el nombre del Señor como David lo hizo?',
     '/david_batalla.png', '/goliat_batalla.png',
     '2026-05-07 01:00:00+00',
     'elegido_frame', '#f59e0b', 'gold_champion', q_elegido),

    (7, 'Héroe del Valle de Elá', 'Tu viaje con David termina... y comienza', 'unlock',
     E'Completaste el viaje de David desde los campos de Belén hasta el Valle de Elá. Viste a un joven pastor convertirse en el héroe que cambió la historia de Israel.\n\nDavid no era el más alto, ni el más fuerte, ni el más experimentado. Era el que tenía un corazón para Dios.\n\nCada batalla que enfrentó antes de Goliat lo preparó para ese momento. Cada momento de adoración, cada noche cuidando ovejas, cada vez que confió en Dios en lo pequeño... lo preparó para lo grande.\n\n¿Y vos? Tu historia también está siendo escrita. Cada desafío que enfrentás con fe te prepara para tu Valle de Elá.',
     '¿Qué aprendiste de David en esta semana que querés aplicar en tu vida? Escribí tu reflexión final.',
     '/david_batalla.png', NULL,
     '2026-05-08 01:00:00+00',
     'valle_ela_frame', 'rainbow', 'rainbow_hero', NULL)
  ON CONFLICT (event_name, day_number) DO NOTHING;
END $$;

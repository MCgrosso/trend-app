-- ============================================================
-- BibleTrivia Youth - Schema SQL para Supabase
-- Correr en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: profiles
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  first_name text not null,
  last_name text not null,
  avatar_url text,
  total_score integer default 0 not null,
  streak_days integer default 0 not null,
  last_played_at date,
  role text default 'user' not null check (role in ('user', 'admin')),
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- TABLA: questions
-- ============================================================
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text not null,
  image_url text,
  available_date date not null default current_date,
  created_at timestamptz default now() not null
);

alter table public.questions enable row level security;

create policy "Questions are viewable by authenticated users"
  on public.questions for select using (auth.role() = 'authenticated');

create policy "Only admins can insert questions"
  on public.questions for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Only admins can update questions"
  on public.questions for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Only admins can delete questions"
  on public.questions for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- ============================================================
-- TABLA: answers
-- ============================================================
create table public.answers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  selected_option text not null check (selected_option in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  answered_at timestamptz default now() not null,
  unique(user_id, question_id)
);

alter table public.answers enable row level security;

create policy "Users can view their own answers"
  on public.answers for select using (auth.uid() = user_id);

create policy "Users can insert their own answers"
  on public.answers for insert with check (auth.uid() = user_id);

-- ============================================================
-- TABLA: announcements
-- ============================================================
create table public.announcements (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  date date not null,
  created_at timestamptz default now() not null
);

alter table public.announcements enable row level security;

create policy "Announcements are viewable by everyone"
  on public.announcements for select using (true);

create policy "Only admins can manage announcements"
  on public.announcements for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- ============================================================
-- TABLA: events
-- ============================================================
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  event_date date not null,
  location text not null,
  created_at timestamptz default now() not null
);

alter table public.events enable row level security;

create policy "Events are viewable by everyone"
  on public.events for select using (true);

create policy "Only admins can manage events"
  on public.events for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substring(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FUNCIÓN: actualizar streak y last_played_at
-- ============================================================
create or replace function public.update_streak_on_answer()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  profile_record public.profiles;
  today date := current_date;
begin
  select * into profile_record from public.profiles where id = new.user_id;

  if profile_record.last_played_at = today then
    -- Ya jugó hoy, no cambiar streak
    null;
  elsif profile_record.last_played_at = today - 1 then
    -- Jugó ayer, incrementar streak
    update public.profiles
    set last_played_at = today, streak_days = streak_days + 1
    where id = new.user_id;
  else
    -- Rompió la racha
    update public.profiles
    set last_played_at = today, streak_days = 1
    where id = new.user_id;
  end if;

  -- Sumar puntos si fue correcto
  if new.is_correct then
    update public.profiles
    set total_score = total_score + 10
    where id = new.user_id;
  end if;

  return new;
end;
$$;

create trigger on_answer_inserted
  after insert on public.answers
  for each row execute procedure public.update_streak_on_answer();

-- ============================================================
-- DATOS DE EJEMPLO: preguntas bíblicas
-- ============================================================
insert into public.questions (question, option_a, option_b, option_c, option_d, correct_option, explanation, available_date) values
('¿Cuántos libros tiene la Biblia?', '66', '72', '60', '80', 'A', 'La Biblia tiene 66 libros: 39 en el Antiguo Testamento y 27 en el Nuevo Testamento.', current_date),
('¿Quién construyó el arca según la Biblia?', 'Abraham', 'Moisés', 'Noé', 'David', 'C', 'Dios le ordenó a Noé construir el arca para salvar a su familia y a los animales del diluvio (Génesis 6-9).', current_date),
('¿Con cuántas piedras venció David a Goliat?', 'Tres', 'Una', 'Cinco', 'Dos', 'B', 'David tomó cinco piedras pero usó solo una para derribar a Goliat con su honda (1 Samuel 17:40-50).', current_date),
('¿En qué ciudad nació Jesús?', 'Nazaret', 'Jerusalén', 'Jericó', 'Belén', 'D', 'Jesús nació en Belén de Judea, según los evangelios de Mateo y Lucas.', current_date),
('¿Cuántos discípulos eligió Jesús?', 'Siete', 'Diez', 'Doce', 'Quince', 'C', 'Jesús eligió doce discípulos, también llamados apóstoles, para que lo siguieran y aprendieran de Él.', current_date),
('¿Quién fue tragado por un gran pez?', 'Elías', 'Jonás', 'Daniel', 'Pablo', 'B', 'Jonás fue tragado por un gran pez cuando huía de la misión que Dios le encomendó (Jonás 1-2).', current_date),
('¿Cuál es el primer libro de la Biblia?', 'Éxodo', 'Salmos', 'Génesis', 'Mateo', 'C', 'Génesis es el primer libro de la Biblia y relata la creación del mundo y los primeros patriarcas.', current_date),
('¿Cuántos días estuvo Jesús en el desierto siendo tentado?', 'Tres', 'Siete', 'Cuarenta', 'Cien', 'C', 'Jesús ayunó y fue tentado por el diablo durante cuarenta días en el desierto (Mateo 4:1-11).', current_date),
('¿Quién escribió la mayor parte de los Salmos?', 'Salomón', 'David', 'Moisés', 'Isaías', 'B', 'El rey David escribió la mayoría de los 150 Salmos, aunque también contribuyeron otros autores.', current_date + 1),
('¿Qué rio fue dividido por Moisés?', 'El Jordán', 'El Éufrates', 'El Nilo', 'El Mar Rojo', 'D', 'Moisés extendió su mano y Dios dividió el Mar Rojo para que los israelitas pudieran cruzar (Éxodo 14).', current_date + 1),
('¿Cuántos años vivió Matusalén, según la Biblia?', '120', '777', '969', '500', 'C', 'Matusalén vivió 969 años, siendo el hombre más anciano mencionado en la Biblia (Génesis 5:27).', current_date + 1),
('¿En qué libro está el famoso versículo "Porque de tal manera amó Dios al mundo"?', 'Romanos', 'Juan', 'Lucas', 'Efesios', 'B', 'Juan 3:16 dice: "Porque de tal manera amó Dios al mundo, que dio a su Hijo unigénito..."', current_date + 1),
('¿Quién interpretó los sueños del Faraón en Egipto?', 'Moisés', 'Abraham', 'José', 'Daniel', 'C', 'José, hijo de Jacob, interpretó los sueños del Faraón sobre las vacas gordas y flacas (Génesis 41).', current_date + 1);

-- ── Notifications system ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  title       text        NOT NULL,
  message     text        NOT NULL,
  type        text        DEFAULT 'info' CHECK (type IN ('info', 'warning', 'update', 'event', 'maintenance')),
  is_global   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  id              uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  notification_id uuid        REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  read_at         timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, notification_id)
);

GRANT ALL ON public.notifications       TO authenticated;
GRANT ALL ON public.notification_reads  TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications readable by all authenticated" ON public.notifications;
CREATE POLICY "notifications readable by all authenticated"
  ON public.notifications FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins manage notifications" ON public.notifications;
CREATE POLICY "admins manage notifications"
  ON public.notifications FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "users read own reads" ON public.notification_reads;
CREATE POLICY "users read own reads"
  ON public.notification_reads FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users insert own reads" ON public.notification_reads;
CREATE POLICY "users insert own reads"
  ON public.notification_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

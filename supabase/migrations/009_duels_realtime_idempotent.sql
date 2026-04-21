-- Ensure duels table is in the realtime publication (idempotent — safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'duels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE duels;
  END IF;
END $$;

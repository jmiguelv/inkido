-- Explicit grants for application tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.word_lists TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.words TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_usage TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tone_stats TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.homework_scans TO authenticated, service_role;

-- Explicit grants for dictionary tables (Public Read)
GRANT SELECT ON TABLE public.zh_words TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.zh_chars TO anon, authenticated, service_role;

-- Revoke automatic exposure for future tables
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role;

-- Update RLS for dictionary tables to allow public read access
DROP POLICY IF EXISTS "authenticated_read_zh_words" ON public.zh_words;
CREATE POLICY "public_read_zh_words" ON public.zh_words
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_zh_chars" ON public.zh_chars;
CREATE POLICY "public_read_zh_chars" ON public.zh_chars
  FOR SELECT TO anon, authenticated USING (true);

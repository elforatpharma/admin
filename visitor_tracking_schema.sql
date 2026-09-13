-- ==========================================
-- Detailed visitor tracking
-- Elforat Pharma
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmedsalamaahmed21@gmail.com';
$$;

CREATE TABLE IF NOT EXISTS visitor_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_path TEXT,
  referrer TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  device_type TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at ON visitor_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_events_session_id ON visitor_events(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_source_created ON visitor_events(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_events_page_created ON visitor_events(page_path, created_at DESC);

ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_visitor_events" ON visitor_events;
CREATE POLICY "public_insert_visitor_events" ON visitor_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_visitor_events" ON visitor_events;
CREATE POLICY "auth_read_visitor_events" ON visitor_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

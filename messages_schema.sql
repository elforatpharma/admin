-- ==========================================
-- SQL Schema: Customer Messages
-- Elforat Pharma
-- ==========================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'new' CHECK (status IN ('new','read','replied')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

COMMENT ON TABLE messages IS 'Customer contact messages';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmedsalamaahmed21@gmail.com';
$$;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_messages" ON messages;
CREATE POLICY "public_insert_messages" ON messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_manage_messages" ON messages;
CREATE POLICY "auth_manage_messages" ON messages
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Example insert from the public store:
-- const { error } = await _supabase.from('messages').insert([{
--   name: customerName,
--   phone: customerPhone,
--   message: customerMessage
-- }]);

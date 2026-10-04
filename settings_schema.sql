-- ==========================================
-- SQL Schema: Store Settings
-- Elforat Pharma
-- ==========================================

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_updated ON settings(updated_at);

COMMENT ON TABLE settings IS 'Public store settings stored as JSON';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmedsalamaahmed21@gmail.com';
$$;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON settings;
CREATE POLICY "public_read_settings" ON settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_write_settings" ON settings;
CREATE POLICY "auth_write_settings" ON settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Expected JSON shape:
-- {
--   "store_name": "Elforat Pharma",
--   "phone": "01000000000",
--   "whatsapp": "01000000000",
--   "email": "store@example.com",
--   "address": "Store address",
--   "shipping_fee": 60,
--   "free_shipping_threshold": 500,
--   "delivery_areas": [{ "area": "Cairo", "fee": 70 }],
--   "facebook": "https://facebook.com/...",
--   "instagram": "https://instagram.com/...",
--   "notes": ""
-- }

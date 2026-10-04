-- ============================================================
-- RLS POLICIES - Elforat Pharma Admin
-- Run this file in Supabase Dashboard -> SQL Editor.
-- ============================================================

-- The admin UI also checks this email client-side, but the database must
-- enforce the same rule because any authenticated user can call the API.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmedsalamaahmed21@gmail.com';
$$;

-- ============================================================
-- 1) products
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_write_products" ON products;
CREATE POLICY "auth_write_products" ON products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 2) orders
-- Public store can create orders only. Admin can manage them.
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_manage_orders" ON orders;
CREATE POLICY "auth_manage_orders" ON orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3) gifts
-- Public store reads active gifts. Admin manages all gifts.
-- ============================================================
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_gifts" ON gifts;
CREATE POLICY "public_read_gifts" ON gifts
  FOR SELECT TO anon, authenticated
  USING (coalesce(is_active, true) = true);

DROP POLICY IF EXISTS "auth_write_gifts" ON gifts;
CREATE POLICY "auth_write_gifts" ON gifts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 4) coupons
-- Public store can validate currently usable coupons. Admin manages all coupons.
-- ============================================================
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_coupons" ON coupons;
DROP POLICY IF EXISTS "Allow authenticated users to read coupons" ON coupons;
CREATE POLICY "public_read_coupons" ON coupons
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND expiry_date >= current_date);

DROP POLICY IF EXISTS "auth_write_coupons" ON coupons;
DROP POLICY IF EXISTS "Allow authenticated users to insert coupons" ON coupons;
DROP POLICY IF EXISTS "Allow authenticated users to update coupons" ON coupons;
DROP POLICY IF EXISTS "Allow authenticated users to delete coupons" ON coupons;
CREATE POLICY "auth_write_coupons" ON coupons
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5) visitors
-- Optional table: public store can add visits. Admin reads them.
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.visitors') IS NOT NULL THEN
    ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "public_insert_visitors" ON visitors;
    CREATE POLICY "public_insert_visitors" ON visitors
      FOR INSERT TO anon, authenticated
      WITH CHECK (true);

    DROP POLICY IF EXISTS "public_read_visitors" ON visitors;
    CREATE POLICY "public_read_visitors" ON visitors
      FOR SELECT TO anon, authenticated
      USING (true);

    DROP POLICY IF EXISTS "public_update_visitors" ON visitors;
    CREATE POLICY "public_update_visitors" ON visitors
      FOR UPDATE TO anon, authenticated
      USING (true)
      WITH CHECK (true);

    DROP POLICY IF EXISTS "auth_read_visitors" ON visitors;
    CREATE POLICY "auth_read_visitors" ON visitors
      FOR SELECT TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- ============================================================
-- 6) settings
-- Public store reads settings. Admin manages them.
-- ============================================================
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

-- ============================================================
-- 7) messages
-- Public store can create messages only. Admin manages them.
-- ============================================================
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

-- Recommended Supabase dashboard settings:
-- 1) Disable open signups unless users are invited manually.
-- 2) Restrict OAuth/sign-in providers to the admin email above.
-- 3) Keep the anon key public; rely on these RLS rules for real protection.

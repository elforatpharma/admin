-- ==========================================
-- SQL Schema for Coupons System
-- Elforat Pharma
-- ==========================================

CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage >= 1 AND discount_percentage <= 99),
  expiry_date DATE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active_expiry ON coupons(is_active, expiry_date);

COMMENT ON TABLE coupons IS 'Discount coupons available in the store';
COMMENT ON COLUMN coupons.code IS 'Unique coupon code';
COMMENT ON COLUMN coupons.discount_percentage IS 'Discount percentage from 1 to 99';
COMMENT ON COLUMN coupons.expiry_date IS 'Coupon expiry date';
COMMENT ON COLUMN coupons.is_active IS 'Whether the coupon is active';

-- Keep coupon policies in sync with rls_policies.sql.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmedsalamaahmed21@gmail.com';
$$;

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

-- Example validation query for checkout:
-- const { data, error } = await _supabase
--   .from('coupons')
--   .select('code,discount_percentage,expiry_date,description')
--   .eq('code', couponCode.toUpperCase())
--   .eq('is_active', true)
--   .gte('expiry_date', new Date().toISOString().split('T')[0])
--   .single();

-- ============================================================
-- SECURITY HARDENING — Elforat Pharma
-- Run this file ONCE in Supabase SQL Editor after reviewing it.
-- This migration tightens the public-facing RLS rules without
-- changing the Admin UI.
-- ============================================================

-- 1) Visitors are analytics data. They must NOT be publicly readable
-- or freely updateable by anonymous users.
DO $$
BEGIN
  IF to_regclass('public.visitors') IS NOT NULL THEN
    ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "public_read_visitors" ON public.visitors;
    DROP POLICY IF EXISTS "public_update_visitors" ON public.visitors;
    DROP POLICY IF EXISTS public_read_visitors ON public.visitors;
    DROP POLICY IF EXISTS public_update_visitors ON public.visitors;
    DROP POLICY IF EXISTS "auth_read_visitors" ON public.visitors;
    DROP POLICY IF EXISTS auth_manage_visitors ON public.visitors;

    -- The public store may record a visit, but cannot read analytics
    -- or modify an existing visitor record.
    DROP POLICY IF EXISTS "public_insert_visitors" ON public.visitors;
    CREATE POLICY "public_insert_visitors"
      ON public.visitors
      FOR INSERT TO anon, authenticated
      WITH CHECK (true);

    -- Only the real admin can read/manage visitor analytics.
    CREATE POLICY "auth_manage_visitors"
      ON public.visitors
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 2) Orders: public users may create an order only.
-- They must never be able to read, edit or delete existing orders.
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "public_select_orders" ON public.orders;
    DROP POLICY IF EXISTS "public_update_orders" ON public.orders;
    DROP POLICY IF EXISTS "public_delete_orders" ON public.orders;
    DROP POLICY IF EXISTS public_select_orders ON public.orders;
    DROP POLICY IF EXISTS public_update_orders ON public.orders;
    DROP POLICY IF EXISTS public_delete_orders ON public.orders;

    DROP POLICY IF EXISTS "public_insert_orders" ON public.orders;
    CREATE POLICY "public_insert_orders"
      ON public.orders
      FOR INSERT TO anon, authenticated
      WITH CHECK (true);

    DROP POLICY IF EXISTS "auth_manage_orders" ON public.orders;
    CREATE POLICY "auth_manage_orders"
      ON public.orders
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 3) Diagnostic output: verify the important policies after execution.
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('visitors', 'orders')
ORDER BY tablename, policyname;

-- IMPORTANT:
-- Visitor tracking must use INSERT rather than client-side UPDATE/upsert.
-- If the public store currently updates an existing visitor row, change
-- that flow before running this migration or visitor counting may stop.

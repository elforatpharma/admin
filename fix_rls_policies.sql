-- ============================================================
-- إصلاح شامل ومُعاد التنفيذ (idempotent) لسياسات RLS
-- Elforat Pharma — Supabase Dashboard → SQL Editor → Run
--
-- السبب: الجداول مفعّل عليها RLS لكن بدون سياسة INSERT للـ anon،
-- لذلك أي كتابة من المتجر_public تفشل بـ:
--   new row violates row-level security policy for table "..."
--
-- شغّل هذا الملف كاملاً مرة واحدة (ويمكن إعادة تشغيله بأمان).
-- ============================================================

-- ============================================================
-- 0) دالة التحقق من الأدمن
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmedsalamaahmed21@gmail.com';
$$;

-- ============================================================
-- 1) جداول يسمح للمتجر العام (anon) بالكتابة فيها — إدراج فقط
--    (products و gifts و coupons قراءة فقط، تُعالج في القسم 2)
-- ============================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['orders', 'messages', 'store_events', 'visitor_events', 'visitors'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'تخطّي الجدول % — غير موجود', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS public_insert_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY public_insert_%I ON public.%I
         FOR INSERT TO anon, authenticated
         WITH CHECK (true)', t, t);

    -- سياسة عامة بأي اسم قديمة كانت تحجب الإدراج، نتخلّص منها
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert" ON public.%I', t);

    RAISE NOTICE 'تم تفعيل الإدراج العام على الجدول %', t;
  END LOOP;
END $$;

-- ============================================================
-- 2) جداول المتجر: قراءة عامة
-- ============================================================
DO $$
DECLARE
  r text;
  read_all text[] := ARRAY['products', 'settings'];
BEGIN
  FOREACH r IN ARRAY read_all LOOP
    IF to_regclass('public.' || r) IS NULL THEN
      RAISE NOTICE 'تخطّي الجدول % — غير موجود', r;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r);
    EXECUTE format('DROP POLICY IF EXISTS public_read_%I ON public.%I', r, r);
    EXECUTE format(
      'CREATE POLICY public_read_%I ON public.%I
         FOR SELECT TO anon, authenticated
         USING (true)', r, r);
  END LOOP;
END $$;

-- gifts: يقرأ المتجر النشط فقط
DO $$
BEGIN
  IF to_regclass('public.gifts') IS NOT NULL THEN
    ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS public_read_gifts ON public.gifts;
    CREATE POLICY public_read_gifts ON public.gifts
      FOR SELECT TO anon, authenticated
      USING (coalesce(is_active, true) = true);
  END IF;
END $$;

-- coupons: يقرأ المتجر الكوبون النشط غير المنتهي فقط
DO $$
BEGIN
  IF to_regclass('public.coupons') IS NOT NULL THEN
    ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS public_read_coupons ON public.coupons;
    DROP POLICY IF EXISTS "Allow authenticated users to read coupons" ON public.coupons;
    CREATE POLICY public_read_coupons ON public.coupons
      FOR SELECT TO anon, authenticated
      USING (is_active = true AND expiry_date >= current_date);
  END IF;
END $$;

-- visitors: المتجر يزيد العدّاد
DO $$
BEGIN
  IF to_regclass('public.visitors') IS NOT NULL THEN
    ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS public_read_visitors ON public.visitors;
    CREATE POLICY public_read_visitors ON public.visitors
      FOR SELECT TO anon, authenticated
      USING (true);
    DROP POLICY IF EXISTS public_update_visitors ON public.visitors;
    CREATE POLICY public_update_visitors ON public.visitors
      FOR UPDATE TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 3) صلاحيات الأدمن: إدارة كاملة
-- ============================================================
DO $$
DECLARE
  t text;
  admin_tables text[] := ARRAY[
    'products', 'orders', 'messages', 'gifts', 'coupons',
    'settings', 'visitors', 'store_events', 'visitor_events'
  ];
BEGIN
  FOREACH t IN ARRAY admin_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_manage_%I ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS auth_write_%I ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS auth_read_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY auth_manage_%I ON public.%I
         FOR ALL TO authenticated
         USING (public.is_admin())
         WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 4) تنظيف أي سياسة قديمة متعارضة (مسمّاة يدوياً في اللوحة)
-- ============================================================
DO $$
DECLARE
  t text;
  old_names text[] := ARRAY[
    'Allow anonymous insert',
    'Allow anon insert',
    'Allow public insert',
    'anon_insert',
    'Allow anon users to insert',
    'Allow authenticated users to insert',
    'Allow authenticated users to update',
    'Allow authenticated users to delete'
  ];
  n text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders','messages','store_events','visitor_events','visitors'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    FOREACH n IN ARRAY old_names LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', n, t);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 5) تشخيص نهائي — يجب أن يظهر عمود anon_insert = 1 لكل
--    orders / messages / store_events / visitor_events
-- ============================================================
SELECT
  c.relname                                  AS "الجدول",
  c.relrowsecurity                           AS "RLS مفعّل",
  count(*) FILTER (
    WHERE p.polcmd = 'c'
      AND (p.polroles = '{0}'::oid[]
           OR p.polroles && ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'anon')])
  )                                         AS "سياسات إدراج anon",
  string_agg(DISTINCT p.polname, ', ')
    FILTER (WHERE p.polcmd = 'c')           AS "أسماء سياسات الإدراج"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- ============================================================
-- إعدادات مقترحة في لوحة Supabase:
-- 1) تعطيل التسجيل المفتوح (Allow new users) إلا بدعوة يدوية.
-- 2) تقييد مزوّدي الدخول على بريد الأدمن.
-- 3) إبقاء مفتاح anon عاماً والاعتماد على RLS للحماية الحقيقية.
-- ============================================================

-- ============================================================
-- تشخيص كامل لسياسات RLS — Supabase SQL Editor
-- 1) كل السياسات المعرّفة (المهمة)   2) جداول بلا INSERT للـ anon
-- 3) صلاحيات الأدوار                  4) اختبار إدراج حقيقي بدور anon
-- ============================================================

-- 1) كل السياسات المعرّفة
SELECT
  c.relname                                   AS "الجدول",
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END                                         AS "النوع",
  p.polname                                   AS "اسم السياسة",
  CASE
    WHEN p.polroles = '{0}'::oid[] THEN 'public'
    ELSE (SELECT string_agg(r.rolname, ',')
          FROM pg_roles r WHERE r.oid = ANY (p.polroles))
  END                                         AS "الأدوار",
  p.polpermissive                             AS "permisive"
FROM pg_policy p
JOIN pg_class c     ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, p.polcmd;

-- 2) جداول RLS بلا أي سياسة INSERT للـ anon  ← مصدر الخطأ
SELECT
  c.relname                                   AS "الجدول_بدون_إدراج_anon"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
  AND NOT EXISTS (
    SELECT 1 FROM pg_policy p
    WHERE p.polrelid = c.oid
      AND p.polcmd IN ('a','*')
      AND (p.polroles = '{0}'::oid[]
           OR p.polroles && ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'anon')])
  )
ORDER BY c.relname;

-- 3) صلاحيات الجداول للأدوار
SELECT
  c.relname                                   AS "الجدول",
  has_table_privilege('anon', c.oid, 'INSERT')          AS "anon_insert",
  has_table_privilege('anon', c.oid, 'SELECT')          AS "anon_select",
  has_table_privilege('anon', c.oid, 'UPDATE')          AS "anon_update",
  has_table_privilege('anon', c.oid, 'DELETE')          AS "anon_delete",
  has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
                                                   AS "authenticated_all"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
ORDER BY c.relname;

-- 4) اختبار حقيقي للإدراج بدور anon داخل معاملة تُلغى (لا بيانات)
BEGIN;
SET LOCAL ROLE anon;
DO $$
DECLARE
  ok_orders   boolean := false;
  ok_messages boolean := false;
  ok_store    boolean := false;
  ok_visitor  boolean := false;
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.orders (total, status, customer_name) VALUES (0.01,'__test__','test-anon');
      ok_orders := true;
    EXCEPTION WHEN others THEN RAISE NOTICE 'orders: %', SQLERRM; END;
  END IF;

  IF to_regclass('public.messages') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.messages (name, phone, message) VALUES ('test-anon','000','__test__');
      ok_messages := true;
    EXCEPTION WHEN others THEN RAISE NOTICE 'messages: %', SQLERRM; END;
  END IF;

  IF to_regclass('public.store_events') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.store_events (session_id, event_name) VALUES ('test-session','__test__');
      ok_store := true;
    EXCEPTION WHEN others THEN RAISE NOTICE 'store_events: %', SQLERRM; END;
  END IF;

  IF to_regclass('public.visitor_events') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.visitor_events (session_id, page_path, device_type)
      VALUES ('test-session','/test','desktop');
      ok_visitor := true;
    EXCEPTION WHEN others THEN RAISE NOTICE 'visitor_events: %', SQLERRM; END;
  END IF;

  RAISE NOTICE '=== anon INSERT → orders=% messages=% store_events=% visitor_events=% ===',
    ok_orders, ok_messages, ok_store, ok_visitor;
END $$;
ROLLBACK;

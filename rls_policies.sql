-- ============================================================
-- RLS POLICIES - الفرات فارما
-- قم بتنفيذ هذا الملف في Supabase Dashboard → SQL Editor
-- يمنع أي شخص غير مسجل من تعديل/حذف البيانات عبر المفتاح العام (anon key)
-- ============================================================

-- ملاحظة هامة:
-- لوحة التحكم تستخدم جلسة المستخدم المسجل (authenticated) عند تسجيل الدخول
-- المتجر (العميل) يستخدم anon
-- بهذه السياسات:
--   • المتجر: يقرأ المنتجات + الهدايا + الكوبونات + يضيف طلبات فقط
--   • الآدمن (المسجل): يستطيع القراءة والإضافة والتعديل والحذف

-- ============================================================
-- 1) products
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "auth_write_products" ON products;
CREATE POLICY "auth_write_products" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2) orders  (المتجر يضيف طلبات، والآدمن طرف تعديل/حذف)
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_manage_orders" ON orders;
CREATE POLICY "auth_manage_orders" ON orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3) gifts  (المتجر يقرأ الهدايا لتطبيقها في السلة)
-- ============================================================
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_gifts" ON gifts;
CREATE POLICY "public_read_gifts" ON gifts
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_write_gifts" ON gifts;
CREATE POLICY "auth_write_gifts" ON gifts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4) coupons (المتجر يقرأ الكوبونات للتحقق في صفحة الدفع)
-- ============================================================
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_coupons" ON coupons;
CREATE POLICY "public_read_coupons" ON coupons
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_write_coupons" ON coupons;
CREATE POLICY "auth_write_coupons" ON coupons
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5) visitors (اختياري - إن وجد الجدول)
-- ============================================================
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_visitors" ON visitors;
CREATE POLICY "public_insert_visitors" ON visitors
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_visitors" ON visitors;
CREATE POLICY "auth_read_visitors" ON visitors
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 6) settings (إعدادات المتجر - المتجر يقرأ والآدمن يكتب)
-- ============================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON settings;
CREATE POLICY "public_read_settings" ON settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_write_settings" ON settings;
CREATE POLICY "auth_write_settings" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7) messages (رسائل العملاء - المتجر يضيف والآدمن يدير)
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_messages" ON messages;
CREATE POLICY "public_insert_messages" ON messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_manage_messages" ON messages;
CREATE POLICY "auth_manage_messages" ON messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ملاحظات إضافية (من لوحة Supabase Dashboard)
-- ============================================================
-- 1) قصر تسجيل الدخول بجوجل على أيميلك فقط:
--    Authentication → Providers → Google → قم بتفعيل
--    "Restrict to registered email domains" أو عدّل الـ allowlist.
--
-- 2) امنع التسجيل المفتوح:
--    Authentication → Sign In / Up → اعمل إيقاف لـ "Allow new users to sign up"
--    إلا عبر دعوة مباشرة، حتى لا ينشئ أي غريب حساباً.
--
-- 3) بعد فرض السياسات ستلاحظ أن المتجر (بدون تسجيل دخول) لن يستطيع
--    رؤية الطلبات أو تعديلها، وهذا المطلوب.
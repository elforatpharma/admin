--- coupons_schema.sql (原始)


+++ coupons_schema.sql (修改后)
-- ==========================================
-- SQL Schema for Coupons System
-- الفرات فارما - نظام كوبونات الخصم
-- ==========================================

-- إنشاء جدول الكوبونات
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

-- إنشاء فهرس للكود للبحث السريع
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- إنشاء فهرس للحالة والتاريخ
CREATE INDEX IF NOT EXISTS idx_coupons_active_expiry ON coupons(is_active, expiry_date);

-- إضافة تعليقات على الأعمدة
COMMENT ON TABLE coupons IS 'كوبونات الخصم المتاحة في المتجر';
COMMENT ON COLUMN coupons.code IS 'كود الكوبون الفريد';
COMMENT ON COLUMN coupons.discount_percentage IS 'نسبة الخصم من 1 إلى 99';
COMMENT ON COLUMN coupons.expiry_date IS 'تاريخ انتهاء صلاحية الكوبون';
COMMENT ON COLUMN coupons.is_active IS 'حالة الكوبون (نشط/متوقف)';

-- ==========================================
-- Row Level Security (RLS) Policies
-- ==========================================

-- تفعيل RLS على الجدول
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- سياسة السماح للمصادقين فقط بالقراءة
CREATE POLICY "Allow authenticated users to read coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (true);

-- سياسة السماح للمصادقين بإدراج كوبونات جديدة
CREATE POLICY "Allow authenticated users to insert coupons"
  ON coupons FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسة السماح للمصادقين بتحديث الكوبونات
CREATE POLICY "Allow authenticated users to update coupons"
  ON coupons FOR UPDATE
  TO authenticated
  USING (true);

-- سياسة السماح للمصادقين بحذف الكوبونات
CREATE POLICY "Allow authenticated users to delete coupons"
  ON coupons FOR DELETE
  TO authenticated
  USING (true);

-- ==========================================
-- أمثلة على كوبونات افتراضية (اختياري)
-- ==========================================

-- يمكنك إضافة كوبونات تجريبية هنا
-- INSERT INTO coupons (code, discount_percentage, expiry_date, description)
-- VALUES
--   ('WELCOME20', 20, '2025-12-31', 'خصم ترحيبي للعملاء الجدد'),
--   ('SUMMER15', 15, '2025-09-30', 'خصم الصيف'),
--   ('FLASH30', 30, '2025-06-30', 'عرض فلاش محدود');

-- ==========================================
-- ملاحظة هامة للاستخدام في المتجر
-- ==========================================
/*
لاستخدام نظام الكوبونات في صفحة الدفع (checkout):

1. أضف حقل إدخال للكود في صفحة الدفع
2. عند إدخال الكود، قم بالاستعلام عنه:

   const { data, error } = await _supabase
     .from('coupons')
     .select('*')
     .eq('code', couponCode.toUpperCase())
     .eq('is_active', true)
     .gte('expiry_date', new Date().toISOString().split('T')[0])
     .single();

3. إذا كان الكوبون صالحاً، احسب الخصم:

   const discountAmount = (total * data.discount_percentage) / 100;
   const finalTotal = total - discountAmount;

4. احفظ معلومات الكوبون مع الطلب في جدول orders
*/
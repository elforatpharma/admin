-- ============================================================
-- الفرات فارما — إضافة عمود معرض الصور لجدول المنتجات
-- gallery_schema.sql
-- شغّل هذا الكود في Supabase SQL Editor
-- ============================================================

-- 1. إضافة عمود gallery (مصفوفة روابط الصور) لجدول products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;

-- 2. تأكد أن القيمة الافتراضية مصفوفة فارغة وليست NULL
UPDATE products
  SET gallery = '[]'::jsonb
  WHERE gallery IS NULL;

-- 3. فهرس اختياري لتحسين الأداء عند الاستعلام على المنتجات التي لها معرض
CREATE INDEX IF NOT EXISTS idx_products_gallery
  ON products USING GIN (gallery);

-- 4. تحقق من النتيجة — يجب أن يظهر عمود gallery
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name = 'gallery';

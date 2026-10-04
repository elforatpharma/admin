-- ==========================================
-- SQL Schema لإصلاح جميع مشاكل نظام الفرات فارما
-- تاريخ الإنشاء: 2025
-- ملاحظة: قم بتنفيذ هذا الملف كاملاً في Supabase SQL Editor
-- ==========================================

-- ==========================================
-- 1. جدول الهدايا (Gifts)
-- ==========================================
CREATE TABLE IF NOT EXISTS gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_name TEXT NOT NULL,
  gift_img TEXT,
  trigger_product_name TEXT NOT NULL,
  trigger_qty INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول الهدايا
CREATE INDEX IF NOT EXISTS idx_gifts_active ON gifts(is_active);
CREATE INDEX IF NOT EXISTS idx_gifts_created ON gifts(created_at DESC);

-- تعليقات على جدول الهدايا
COMMENT ON TABLE gifts IS 'هدايا العروض الخاصة للعملاء';
COMMENT ON COLUMN gifts.gift_name IS 'اسم الهدية';
COMMENT ON COLUMN gifts.gift_img IS 'رابط صورة الهدية';
COMMENT ON COLUMN gifts.trigger_product_name IS 'المنتج المطلوب للحصول على الهدية';
COMMENT ON COLUMN gifts.trigger_qty IS 'الكمية المطلوبة من المنتج';

-- ==========================================
-- 2. جدول المنتجات (Products)
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  cost NUMERIC(10, 2) DEFAULT 0,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  category TEXT,
  image_url TEXT,
  barcode TEXT UNIQUE,
  priority INTEGER DEFAULT 0,
  badge TEXT,
  old_price NUMERIC(10, 2),
  img TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول المنتجات
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_priority ON products(priority DESC);

-- تعليقات على جدول المنتجات
COMMENT ON TABLE products IS 'منتجات المتجر المتاحة للبيع';
COMMENT ON COLUMN products.stock IS 'الكمية المتوفرة في المخزون';
COMMENT ON COLUMN products.cost IS 'سعر التكلفة لحساب الأرباح';
COMMENT ON COLUMN products.priority IS 'أولوية ظهور المنتج (الأعلى يظهر أولاً)';
COMMENT ON COLUMN products.badge IS 'شارة مميزة للمنتج (مثل: جديد، خصم)';
COMMENT ON COLUMN products.old_price IS 'السعر القديم قبل الخصم';
COMMENT ON COLUMN products.img IS 'رابط صورة المنتج';

-- ==========================================
-- 3. جدول الطلبات (Orders)
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  governorate TEXT,
  city TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  discount NUMERIC(10, 2) DEFAULT 0,
  final_total NUMERIC(10, 2) GENERATED ALWAYS AS (total - discount) STORED,
  status TEXT DEFAULT 'قيد المعالجة' CHECK (status IN ('قيد المعالجة', 'جاري التجهيز', 'تم التوصيل', 'ملغي')),
  payment_method TEXT DEFAULT 'كاش',
  notes TEXT,
  coupon_code TEXT,
  gift_id UUID REFERENCES gifts(id),
  delivery_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول الطلبات
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_governorate ON orders(governorate);
CREATE INDEX IF NOT EXISTS idx_orders_total ON orders(total);

-- تعليقات على جدول الطلبات
COMMENT ON TABLE orders IS 'طلبات العملاء';
COMMENT ON COLUMN orders.items IS 'قائمة المنتجات المطلوبة بصيغة JSON';
COMMENT ON COLUMN orders.final_total IS 'الإجمالي النهائي بعد الخصم';

-- ==========================================
-- 4. جدول العملاء (Customers)
-- ==========================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  governorate TEXT,
  city TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول العملاء
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

-- تعليقات على جدول العملاء
COMMENT ON TABLE customers IS 'بيانات العملاء';
COMMENT ON COLUMN customers.total_orders IS 'إجمالي عدد الطلبات المكتملة';
COMMENT ON COLUMN customers.total_spent IS 'إجمالي المبالغ المنفقة';

-- ==========================================
-- 5. جدول الكوبونات (Coupons)
-- ==========================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage >= 1 AND discount_percentage <= 99),
  expiry_date DATE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول الكوبونات
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active_expiry ON coupons(is_active, expiry_date);

-- تعليقات على جدول الكوبونات
COMMENT ON TABLE coupons IS 'كوبونات الخصم المتاحة في المتجر';
COMMENT ON COLUMN coupons.code IS 'كود الكوبون الفريد';
COMMENT ON COLUMN coupons.discount_percentage IS 'نسبة الخصم من 1 إلى 99';
COMMENT ON COLUMN coupons.expiry_date IS 'تاريخ انتهاء صلاحية الكوبون';
COMMENT ON COLUMN coupons.is_active IS 'حالة الكوبون (نشط/متوقف)';
COMMENT ON COLUMN coupons.usage_count IS 'عدد مرات استخدام الكوبون';
COMMENT ON COLUMN coupons.max_usage IS 'الحد الأقصى لاستخدام الكوبون (NULL = غير محدود)';

-- ==========================================
-- 6. جدول الزوار (Visitors) - لتتبع زيارات الموقع
-- ==========================================
CREATE TABLE IF NOT EXISTS visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  page_url TEXT,
  session_id TEXT
);

-- فهارس لجدول الزوار
CREATE INDEX IF NOT EXISTS idx_visitors_date ON visitors(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitors_session ON visitors(session_id);

-- تعليقات على جدول الزوار
COMMENT ON TABLE visitors IS 'تتبع زوار الموقع والصفحات';

-- ==========================================
-- 7. إعدادات النظام (Settings)
-- ==========================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدخال إعدادات افتراضية
INSERT INTO settings (key, value, description) VALUES
  ('dark_mode', '{"enabled": false}', 'إعدادات الوضع المظلم'),
  ('notifications', '{"audio": true, "visual": true}', 'إعدادات الإشعارات'),
  ('store_info', '{"name": "الفرات فارما", "phone": "", "address": ""}', 'معلومات المتجر')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- Row Level Security (RLS) Policies
-- ==========================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- سياسات الصلاحيات الموحدة للمصادقين
-- سياسة القراءة (SELECT)
CREATE POLICY "authenticated_read_all" ON gifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON visitors FOR SELECT TO authenticated USING (true);

-- سياسة الإدراج (INSERT)
CREATE POLICY "authenticated_insert_all" ON gifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON coupons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON visitors FOR INSERT TO authenticated WITH CHECK (true);

-- سياسة التحديث (UPDATE)
CREATE POLICY "authenticated_update_all" ON gifts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON coupons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON visitors FOR UPDATE TO authenticated USING (true);

-- سياسة الحذف (DELETE)
CREATE POLICY "authenticated_delete_all" ON gifts FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON products FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON orders FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON customers FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON coupons FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON settings FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON visitors FOR DELETE TO authenticated USING (true);

-- ==========================================
-- بيانات تجريبية (اختياري - للحذف عند الإنتاج)
-- ==========================================

-- إضافة هدايا تجريبية
INSERT INTO gifts (gift_name, gift_img, trigger_product_name, trigger_qty, is_active) VALUES
  ('عينة مجانية', 'https://example.com/sample.png', 'أي منتج', 1, true),
  ('كوبون خصم 10%', 'https://example.com/coupon.png', 'مجموعة متكاملة', 2, true),
  ('هدية خاصة', 'https://example.com/gift.png', 'العناية بالبشرة', 3, true)
ON CONFLICT DO NOTHING;

-- إضافة منتجات تجريبية
INSERT INTO products (name, description, price, cost, stock, category, img, badge, old_price, is_active) VALUES
  ('بانادول إكسترا', 'مسكن للألم وخافض للحرارة', 45.00, 30.00, 100, 'مسكنات', 'https://example.com/panadol.png', 'الأكثر مبيعاً 🔥', 50.00, true),
  ('أوجمنتين 1جم', 'مضاد حيوي واسع الطيف', 85.00, 60.00, 50, 'مضادات حيوية', 'https://example.com/augmentin.png', NULL, NULL, true),
  ('فيتامين C', 'مكمل غذائي مناعي', 120.00, 80.00, 75, 'فيتامينات', 'https://example.com/vitc.png', 'جديد ✨', NULL, true),
  ('شراب كحة', 'مهدئ للسعال', 35.00, 20.00, 200, 'أدوية برد', 'https://example.com/cough.png', NULL, 40.00, true)
ON CONFLICT DO NOTHING;

-- إضافة كوبونات تجريبية
INSERT INTO coupons (code, discount_percentage, expiry_date, description, is_active, max_usage) VALUES
  ('WELCOME20', 20, '2025-12-31', 'خصم ترحيبي للعملاء الجدد', true, 100),
  ('SUMMER15', 15, '2025-09-30', 'خصم الصيف', true, NULL),
  ('FLASH30', 30, '2025-06-30', 'عرض فلاش محدود', true, 50)
ON CONFLICT DO NOTHING;

-- ==========================================
-- دوال مساعدة (Helper Functions)
-- ==========================================

-- دالة لتحديث إجمالي مبيعات العميل تلقائياً
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث إحصائيات العميل عند إضافة طلب جديد
  IF TG_OP = 'INSERT' AND NEW.status = 'تم التوصيل' THEN
    UPDATE customers 
    SET total_orders = total_orders + 1,
        total_spent = total_spent + NEW.final_total,
        updated_at = NOW()
    WHERE phone = NEW.customer_phone;
    
    -- إذا لم يكن العميل موجوداً، ننشئه
    IF NOT FOUND THEN
      INSERT INTO customers (name, phone, total_orders, total_spent, created_at, updated_at)
      VALUES (NEW.customer_name, NEW.customer_phone, 1, NEW.final_total, NOW(), NOW());
    END IF;
  END IF;
  
  -- تعديل الإحصائيات عند تغيير حالة الطلب
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'تم التوصيل' AND NEW.status = 'تم التوصيل' THEN
      UPDATE customers 
      SET total_orders = total_orders + 1,
          total_spent = total_spent + NEW.final_total,
          updated_at = NOW()
      WHERE phone = NEW.customer_phone;
      
      IF NOT FOUND THEN
        INSERT INTO customers (name, phone, total_orders, total_spent, created_at, updated_at)
        VALUES (NEW.customer_name, NEW.customer_phone, 1, NEW.final_total, NOW(), NOW());
      END IF;
    ELSIF OLD.status = 'تم التوصيل' AND NEW.status != 'تم التوصيل' THEN
      UPDATE customers 
      SET total_orders = GREATEST(0, total_orders - 1),
          total_spent = GREATEST(0, total_spent - OLD.final_total),
          updated_at = NOW()
      WHERE phone = NEW.customer_phone;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لتحديث إحصائيات العملاء
DROP TRIGGER IF EXISTS trg_update_customer_stats ON orders;
CREATE TRIGGER trg_update_customer_stats
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- دالة لتحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق التحديث التلقائي على الجداول
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- دالة لحساب الخصم وتطبيق الكوبون
CREATE OR REPLACE FUNCTION apply_coupon(p_order_total NUMERIC, p_coupon_code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  discount_amount NUMERIC,
  final_total NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  -- البحث عن الكوبون
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = p_coupon_code
    AND is_active = true
    AND expiry_date >= CURRENT_DATE;
  
  -- التحقق من وجود الكوبون
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC, p_order_total, 'الكوبون غير صالح أو منتهي الصلاحية';
    RETURN;
  END IF;
  
  -- التحقق من الحد الأقصى للاستخدام
  IF v_coupon.max_usage IS NOT NULL AND v_coupon.usage_count >= v_coupon.max_usage THEN
    RETURN QUERY SELECT false, 0::NUMERIC, p_order_total, 'تم استنفاد عدد استخدامات الكوبون';
    RETURN;
  END IF;
  
  -- حساب الخصم
  discount_amount := (p_order_total * v_coupon.discount_percentage) / 100;
  final_total := p_order_total - discount_amount;
  
  -- زيادة عدد الاستخدامات
  UPDATE coupons
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = v_coupon.id;
  
  RETURN QUERY SELECT true, discount_amount, final_total, 'تم تطبيق الكوبون بنجاح';
END;
$$ LANGUAGE plpgsql;

-- دالة لحذف البيانات القديمة (صيانة دورية)
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 365)
RETURNS VOID AS $$
BEGIN
  -- حذف الطلبات الملغية القديمة
  DELETE FROM orders 
  WHERE status = 'ملغي' 
    AND created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  -- حذف سجلات الزوار القديمة
  DELETE FROM visitors
  WHERE visit_date < CURRENT_DATE - (days_to_keep || ' days')::INTERVAL;
  
  -- تحديث سجل الصيانة
  INSERT INTO settings (key, value, description)
  VALUES ('system_maintenance', '{"last_cleanup": "' || NOW()::text || '"}', 'آخر عملية صيانة')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- عرض إحصائيات سريعة (Views)
-- ==========================================

-- عرض المبيعات اليومية
CREATE OR REPLACE VIEW daily_sales AS
SELECT 
  DATE(created_at) as sale_date,
  COUNT(*) as order_count,
  SUM(CASE WHEN status = 'تم التوصيل' THEN final_total ELSE 0 END) as total_revenue,
  AVG(CASE WHEN status = 'تم التوصيل' THEN final_total ELSE 0 END) as avg_order_value
FROM orders
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- عرض المنتجات الأكثر مبيعاً
CREATE OR REPLACE VIEW top_selling_products AS
SELECT 
  p.id,
  p.name,
  p.category,
  p.img,
  COUNT(DISTINCT o.id) as times_sold,
  COALESCE(SUM((oi.value->>'quantity')::INTEGER), 0) as total_quantity
FROM orders o
CROSS JOIN LATERAL JSONB_ARRAY_ELEMENTS(o.items) oi
JOIN products p ON oi.value->>'id' = p.id::TEXT
WHERE o.status = 'تم التوصيل'
GROUP BY p.id, p.name, p.category, p.img
ORDER BY total_quantity DESC
LIMIT 10;

-- عرض إحصائيات المحافظ
CREATE OR REPLACE VIEW governorate_stats AS
SELECT 
  governorate,
  COUNT(*) as order_count,
  SUM(final_total) as total_revenue,
  AVG(final_total) as avg_order_value
FROM orders
WHERE status = 'تم التوصيل'
  AND governorate IS NOT NULL
GROUP BY governorate
ORDER BY order_count DESC;

-- عرض حالة المخزون
CREATE OR REPLACE VIEW inventory_status AS
SELECT 
  category,
  COUNT(*) as product_count,
  SUM(stock) as total_stock,
  SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
  SUM(CASE WHEN stock > 0 AND stock < 10 THEN 1 ELSE 0 END) as low_stock
FROM products
WHERE is_active = true
GROUP BY category;

-- ==========================================
-- ملاحظات هامة للتطبيق
-- ==========================================
/*
لتطبيق هذا المخطط:

1. قم بتنفيذ الكود في Supabase SQL Editor
2. تأكد من تفعيل Realtime للجداول التالية:
   - orders (للإشعارات الفورية)
   - products (للتحديثات المباشرة)
   - gifts (لتحديث الهدايا)

3. لإنشاء Storage Buckets:
   - products: لتخزين صور المنتجات
     Policy: Allow authenticated users to upload and read
   - gifts: لتخزين صور الهدايا
     Policy: Allow authenticated users to upload and read

4. لإعداد Authentication:
   - فعل Email/Password authentication
   - أضف المستخدمين المصرح لهم

5. لحل مشكلة وميض الوضع المظلم:
   - أضف class="dark" إلى وسم HTML إذا كان محفوظاً في localStorage
   - أو استخدم script قبل تحميل Tailwind CSS

6. للتأكد من عمل الرسوم البيانية:
   - تحقق من وجود بيانات في جدول orders
   - تأكد من أن حالة الطلبات تحتوي على 'تم التوصيل'

7. لتفعيل نظام الكوبونات:
   - تأكد من وجود بيانات في جدول coupons
   - استخدم دالة apply_coupon() لحساب الخصم

8. لتفعيل تتبع الزوار:
   - أضف كود JavaScript في كل صفحة يسجل الزيارات
   - مثال: INSERT INTO visitors (session_id, page_url) VALUES (...)
*/

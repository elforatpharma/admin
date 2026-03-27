-- ==========================================
-- SQL Schema لإصلاح جميع مشاكل نظام الفرات فارما
-- تاريخ الإنشاء: 2025
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
COMMENT ON COLUMN gifts.min_order_value IS 'أقل قيمة طلب للحصول على الهدية';

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
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول المنتجات
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- تعليقات على جدول المنتجات
COMMENT ON TABLE products IS 'منتجات المتجر المتاحة للبيع';
COMMENT ON COLUMN products.stock IS 'الكمية المتوفرة في المخزون';
COMMENT ON COLUMN products.cost IS 'سعر التكلفة لحساب الأرباح';

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

-- ==========================================
-- 6. إعدادات النظام (Settings)
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

-- سياسات الصلاحيات الموحدة للمصادقين
-- سياسة القراءة (SELECT)
CREATE POLICY "authenticated_read_all" ON gifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON settings FOR SELECT TO authenticated USING (true);

-- سياسة الإدراج (INSERT)
CREATE POLICY "authenticated_insert_all" ON gifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON coupons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_all" ON settings FOR INSERT TO authenticated WITH CHECK (true);

-- سياسة التحديث (UPDATE)
CREATE POLICY "authenticated_update_all" ON gifts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON coupons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_all" ON settings FOR UPDATE TO authenticated USING (true);

-- سياسة الحذف (DELETE)
CREATE POLICY "authenticated_delete_all" ON gifts FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON products FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON orders FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON customers FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON coupons FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_all" ON settings FOR DELETE TO authenticated USING (true);

-- ==========================================
-- بيانات تجريبية (اختياري - للحذف عند الإنتاج)
-- ==========================================

-- إضافة هدايا تجريبية
INSERT INTO gifts (name, description, min_order_value, is_active) VALUES
  ('عينة مجانية', 'عينة منتج مجانية للطلبات فوق 500 جنيه', 500, true),
  ('كوبون خصم 10%', 'كوبون خصم 10% للطلب القادم', 1000, true),
  ('هدية خاصة', 'هدية حصرية للطلبات فوق 2000 جنيه', 2000, true)
ON CONFLICT DO NOTHING;

-- إضافة منتجات تجريبية
INSERT INTO products (name, description, price, cost, stock, category, is_active) VALUES
  ('بانادول إكسترا', 'مسكن للألم وخافض للحرارة', 45.00, 30.00, 100, 'مسكنات', true),
  ('أوجمنتين 1جم', 'مضاد حيوي واسع الطيف', 85.00, 60.00, 50, 'مضادات حيوية', true),
  ('فيتامين C', 'مكمل غذائي مناعي', 120.00, 80.00, 75, 'فيتامينات', true),
  ('شراب كحة', 'مهدئ للسعال', 35.00, 20.00, 200, 'أدوية برد', true)
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
        total_spent = total_spent + NEW.final_total
    WHERE phone = NEW.customer_phone;
  END IF;
  
  -- تعديل الإحصائيات عند تغيير حالة الطلب
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'تم التوصيل' AND NEW.status = 'تم التوصيل' THEN
      UPDATE customers 
      SET total_orders = total_orders + 1,
          total_spent = total_spent + NEW.final_total
      WHERE phone = NEW.customer_phone;
    ELSIF OLD.status = 'تم التوصيل' AND NEW.status != 'تم التوصيل' THEN
      UPDATE customers 
      SET total_orders = GREATEST(0, total_orders - 1),
          total_spent = GREATEST(0, total_spent - OLD.final_total)
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

-- دالة لحذف البيانات القديمة (صيانة دورية)
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 365)
RETURNS VOID AS $$
BEGIN
  -- حذف الطلبات الملغية القديمة
  DELETE FROM orders 
  WHERE status = 'ملغي' 
    AND created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  -- تحديث سجل الصيانة
  UPDATE settings 
  SET value = jsonb_set(value, '{last_cleanup}', to_jsonb(NOW()::text))
  WHERE key = 'system_maintenance';
  
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
  p.name,
  p.category,
  COUNT(oi.value->>'id') as times_sold,
  SUM((oi.value->>'quantity')::INTEGER) as total_quantity
FROM orders o,
  JSONB_ARRAY_ELEMENTS(o.items) oi
JOIN products p ON oi.value->>'id' = p.id::TEXT
WHERE o.status = 'تم التوصيل'
GROUP BY p.id, p.name, p.category
ORDER BY total_quantity DESC
LIMIT 10;

-- ==========================================
-- ملاحظات هامة
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
   - gifts: لتخزين صور الهدايا

4. لحل مشكلة وميض الوضع المظلم:
   - أضف class="dark" إلى وسم HTML إذا كان محفوظاً في localStorage
   - أو استخدم script قبل تحميل Tailwind CSS

5. للتأكد من عمل الرسوم البيانية:
   - تحقق من وجود بيانات في جدول orders
   - تأكد من أن حالة الطلبات تحتوي على 'تم التوصيل'
*/

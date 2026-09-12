-- ==========================================
-- SQL Schema: Settings (إعدادات المتجر)
-- الفرات فارما
-- ==========================================
-- جدول يخزّن إعدادات المتجر في صف واحد (id=1) داخل عمود JSON
-- حتى يقرأها المتجر (anon) ويعدّلها الآدمن فقط (authenticated)

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهرس المساعد لو حبيت تبحث جوه الـ JSON مستقبلاً
CREATE INDEX IF NOT EXISTS idx_settings_updated ON settings(updated_at);

COMMENT ON TABLE settings IS 'إعدادات المتجر العامة (JSON)';

-- ==========================================
-- RLS
-- ==========================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- المتجر (عام) يقرأ الإعدادات لعرض أسعار التوصيل وبيانات التواصل
DROP POLICY IF EXISTS "public_read_settings" ON settings;
CREATE POLICY "public_read_settings" ON settings
  FOR SELECT TO anon, authenticated USING (true);

-- الآدمن (المسجل) فقط يستطيع الكتابة
DROP POLICY IF EXISTS "auth_write_settings" ON settings;
CREATE POLICY "auth_write_settings" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- شكل البيانات المتوقع في عمود `data` (مثال):
-- ==========================================
/*
{
  "store_name": "الفرات فارما",
  "phone": "01000000000",
  "whatsapp": "01000000000",
  "email": "store@example.com",
  "address": "العنوان الكامل",
  "shipping_fee": 60,
  "free_shipping_threshold": 500,
  "delivery_areas": [
    { "area": "القاهرة", "fee": 70 },
    { "area": "الجيزة", "fee": 70 }
  ],
  "facebook": "https://facebook.com/...",
  "instagram": "https://instagram.com/...",
  "notes": "ملاحظات"
}
*/
-- ==========================================
-- SQL Schema: Messages (رسائل العملاء)
-- الفرات فارما
-- ==========================================
-- رسائل نموذج التواصل في المتجر تُحفظ هنا
-- حتى يقرأها الآدمن ويرد عليها مباشرة عبر واتساب

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'new' CHECK (status IN ('new','read','replied')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس للاستعلام السريع
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

COMMENT ON TABLE messages IS 'رسائل التواصل من العملاء';

-- ==========================================
-- RLS: المتجر يضيف فقط، والآدمن يقرأ ويعدّل ويحذف
-- ==========================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_messages" ON messages;
CREATE POLICY "public_insert_messages" ON messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_manage_messages" ON messages;
CREATE POLICY "auth_manage_messages" ON messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- مثال: كود إدراج رسالة من صفحة المتجر
-- ==========================================
/*
const { error } = await _supabase.from('messages').insert([{
  name: 'اسم العميل',
  phone: '01xxxxxxxxx',
  message: 'نص الرسالة'
}]);
*/
// ===== supabaseClient.js =====
// ملف مركزي لإعداد Supabase - يُستخدم في جميع صفحات لوحة التحكم

const SUPABASE_URL = 'https://sidtdxchiqiogfkwbdui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZHRkeGNoaXFpb2dma3diZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTEyMTAsImV4cCI6MjA4OTY4NzIxMH0.QF1-67Qu2HfWJt3ANSegM87fykOYQBwqC7ggLG8LTVU';

// الأيميل الوحيد المسموح بالدخول إلى لوحة التحكم
const ADMIN_EMAIL = 'ahmedsalamaahmed21@gmail.com';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- التحقق من أن المستخدم الحالي هو الآدمن المسموح له فقط ----
function isAdminUser(user) {
  return user && user.email && user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// ---- استخراج اسم الملف من رابط Storage العام (لحذف الصور القديمة) ----
function getStorageObjectFromUrl(publicUrl) {
  try {
    const u = new URL(publicUrl);
    const base = `${u.origin}/storage/v1/object/public/products/`;
    if (u.href.startsWith(base)) return decodeURIComponent(u.href.slice(base.length));
  } catch (e) { /* url غير صالح */ }
  return null;
}

// ---- حذف صورة من Supabase Storage آمن من الأخطاء ----
async function deleteStorageFile(publicUrl) {
  const path = getStorageObjectFromUrl(publicUrl);
  if (!path) return false;
  try {
    const { error } = await _supabase.storage.from('products').remove([path]);
    if (error) console.error('فشل حذف الملف من التخزين:', error.message);
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ---- تنظيف اسم الملف قبل رفعه (إزالة المسافات والرموز الخطرة) ----
function sanitizeFileName(name) {
  const ext = (name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}
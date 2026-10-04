// ===== supabaseClient.js =====
// Shared Supabase setup for all admin pages.

const SUPABASE_URL = 'https://sidtdxchiqiogfkwbdui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZHRkeGNoaXFpb2dma3diZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTEyMTAsImV4cCI6MjA4OTY4NzIxMH0.QF1-67Qu2HfWJt3ANSegM87fykOYQBwqC7ggLG8LTVU';

// The database RLS policies must enforce this same email through public.is_admin().
const ADMIN_EMAIL = 'ahmedsalamaahmed21@gmail.com';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getUserEmail(user) {
  return normalizeEmail(
    user?.email ||
    user?.user_metadata?.email ||
    user?.identities?.[0]?.identity_data?.email
  );
}

function isAdminUser(user) {
  return getUserEmail(user) === normalizeEmail(ADMIN_EMAIL);
}

function getStorageObjectFromUrl(publicUrl) {
  try {
    const u = new URL(publicUrl);
    const base = `${u.origin}/storage/v1/object/public/products/`;
    if (u.href.startsWith(base)) return decodeURIComponent(u.href.slice(base.length));
  } catch (e) {
    // Ignore invalid URLs.
  }
  return null;
}

async function deleteStorageFile(publicUrl) {
  const path = getStorageObjectFromUrl(publicUrl);
  if (!path) return false;

  try {
    const { error } = await _supabase.storage.from('products').remove([path]);
    if (error) console.error('Failed to delete storage file:', error.message);
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function deleteStorageFiles(publicUrls){
  const urls=Array.isArray(publicUrls)?publicUrls.filter(Boolean):[];
  const paths=[...new Set(urls.map(getStorageObjectFromUrl).filter(Boolean))];
  if(!paths.length)return {ok:true,deleted:0,failed:0};
  let failed=0;
  for(let i=0;i<paths.length;i+=1000){
    const batch=paths.slice(i,i+1000);
    const{error}=await _supabase.storage.from('products').remove(batch);
    if(error){console.error('Failed to delete storage files:',error.message);failed+=batch.length;}
  }
  return {ok:failed===0,deleted:paths.length-failed,failed};
}

function sanitizeFileName(name) {
  const ext = (name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

// ---------------------------------------------------------------
// fetchAll: يجيب كل الصفوف على دفعات (Supabase بيقطع أي نتيجة عند
// حد Max Rows — الافتراضي 1000 — مهما كان .limit()).
// الاستخدام: buildQuery دالة بترجّع query جديد كل مرة، ولازم فيها
// .order() ثابت (يفضل بعمود فريد زي id) وإلا الصفحات ممكن تتكرر/تتخطى.
//   const rows = await fetchAll(() =>
//     _supabase.from('orders').select('id,total').order('id'));
// pageSize لازم يكون <= Max Rows في إعدادات المشروع (الافتراضي 1000).
// ---------------------------------------------------------------
async function fetchAll(buildQuery, { pageSize = 1000, maxRows = 50000 } = {}) {
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

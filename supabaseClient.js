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

function sanitizeFileName(name) {
  const ext = (name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

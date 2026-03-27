// ملف الاتصال المركزي بسوبابيز - الفرات فارما
// يتم تحميل مفاتيح API من متغيرات البيئة لحماية البيانات الحساسة

/**
 * الحصول على متغيرات البيئة بأمان
 * يدعم Vite وبيئات التشغيل المختلفة
 */
function getEnvVariable(name: string, defaultValue?: string): string {
    // بيئة Vite
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[name] || defaultValue || '';
    }
    // بيئة Node.js التقليدية
    if (typeof process !== 'undefined' && process.env) {
        return process.env[name] || defaultValue || '';
    }
    // قيمة افتراضية أو فارغة
    return defaultValue || '';
}

const supabaseUrl = getEnvVariable(
    'VITE_SUPABASE_URL',
    'https://sidtdxchiqiogfkwbdui.supabase.co'
);

const supabaseKey = getEnvVariable(
    'VITE_SUPABASE_ANON_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZHRkeGNoaXFpb2dma3diZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTEyMTAsImV4cCI6MjA4OTY4NzIxMH0.QF1-67Qu2HfWJt3ANSegM87fykOYQBwqC7ggLG8LTVU'
);

// تحذير في وضع التطوير إذا كانت المفاتيح الافتراضية مستخدمة
if (import.meta && import.meta.dev) {
    if (supabaseKey.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
        console.warn(
            '⚠️ تحذير: تستخدم المفاتيح الافتراضية. يرجى إنشاء ملف .env وتحديد VITE_SUPABASE_ANON_KEY'
        );
    }
}

// إعدادات Rate Limiting
const LOGIN_ATTEMPTS_LIMIT = 5;
const LOGIN_LOCKOUT_DURATION = 300000; // 5 دقائق بالميلي ثانية

// للاستخدام المباشر في HTML (CDN)
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// دالة التحقق من Rate Limiting لتسجيل الدخول
async function checkLoginAttempts() {
    const attempts = localStorage.getItem('loginAttempts') || '0';
    const lockoutTime = localStorage.getItem('lockoutTime');

    if (lockoutTime && Date.now() < parseInt(lockoutTime)) {
        const remaining = Math.ceil((parseInt(lockoutTime) - Date.now()) / 60000);
        throw new Error(`تم قفل الحساب لمدة ${remaining} دقيقة بسبب محاولات متعددة فاشلة`);
    }

    return parseInt(attempts);
}

// دالة تسجيل محاولة دخول فاشلة
function recordFailedAttempt() {
    const attempts = (localStorage.getItem('loginAttempts') || '0') | 0;
    const newAttempts = attempts + 1;
    localStorage.setItem('loginAttempts', newAttempts.toString());

    if (newAttempts >= LOGIN_ATTEMPTS_LIMIT) {
        const lockoutTime = Date.now() + LOGIN_LOCKOUT_DURATION;
        localStorage.setItem('lockoutTime', lockoutTime.toString());
        throw new Error(`تم تجاوز عدد المحاولات المسموحة. حاول مرة أخرى بعد ${LOGIN_LOCKOUT_DURATION / 60000} دقيقة`);
    }
}

// دالة إعادة تعيين محاولات الدخول عند النجاح
function resetLoginAttempts() {
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('lockoutTime');
}
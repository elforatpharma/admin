// ===== layout.js =====
// مكونات واجهة مشتركة (Sidebar + Auth) لجميع صفحات لوحة التحكم

// ---- التحقق من الجلسة وأن المستخدم هو الآدمن المسموح ----
async function requireAdmin() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return false; }
  if (!isAdminUser(session.user)) {
    // مستخدم آخر ليس الآدمن المصرح له - نسجّل خروجه ونعيده لتسجيل الدخول
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ---- تسجيل الخروج ----
async function logout() {
  await _supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ---- درج الموبايل ----
function closeMobileMenu() {
  const sb = document.getElementById('app-sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
}

// ---- حقن ستايل الموبايل مرة واحدة ----
function injectLayoutStyles() {
  if (document.getElementById('app-layout-mobile-css')) return;
  const style = document.createElement('style');
  style.id = 'app-layout-mobile-css';
  style.textContent = `
    @media (max-width:1023.98px){
      #app-sidebar{transform:translateX(108%);transition:transform .28s ease;box-shadow:2px 0 30px rgba(0,0,0,.1);}
      #app-sidebar.open{transform:translateX(0);}
      #sidebar-overlay{display:block;opacity:0;visibility:hidden;transition:opacity .28s ease,visibility .28s;}
      #sidebar-overlay.open{opacity:1;visibility:visible;}
      main{width:100%;}
    }
    @media (min-width:1024px){
      #sidebar-overlay{display:none;}
      #mobile-menu-btn{display:none;}
    }
  `;
  document.head.appendChild(style);
}

// ---- إنشاء الـ Sidebar ديناميكياً ----
function renderSidebar(activePage) {
  const navItems = [
    { href: 'admin.html',       icon: 'dashboard',    label: 'الرئيسية' },
    { href: 'orders.html',      icon: 'shopping_bag', label: 'الطلبات' },
    { href: 'inventory.html',   icon: 'inventory_2',  label: 'المخزون' },
    { href: 'customers.html',   icon: 'group',        label: 'العملاء' },
    { href: 'sales-report.html', icon: 'monitoring',   label: 'تقرير المبيعات' },
    { href: 'messages.html',    icon: 'chat',         label: 'رسائل العملاء' },
    { href: 'settings.html',    icon: 'settings',     label: 'إعدادات المتجر' },
  ];

  const navHTML = navItems.map(item => {
    const isActive = item.href === activePage;
    const cls = isActive
      ? 'nav-active flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm'
      : 'flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium text-sm transition-colors';
    return `<a href="${item.href}" class="${cls}" aria-current="${isActive ? 'page' : 'false'}">
      <span class="material-symbols-outlined text-[20px]" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    </a>`;
  }).join('');

  // عناصر إضافية تظهر في الصفحة الرئيسية فقط
  const extraLinks = activePage === 'admin.html' ? `
    <a href="#" onclick="showGiftsSection()" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium text-sm transition-colors">
      <span class="material-symbols-outlined text-[20px]" aria-hidden="true">card_giftcard</span><span>الهدايا</span>
    </a>
    <a href="#" onclick="showCouponsSection()" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium text-sm transition-colors">
      <span class="material-symbols-outlined text-[20px]" aria-hidden="true">local_offer</span><span>الكوبونات</span>
    </a>` : '';

  const sidebarHTML = `
    <aside id="app-sidebar" class="w-64 h-screen fixed right-0 top-0 bg-white border-l border-gray-100/80 flex flex-col z-40" style="box-shadow:2px 0 24px rgba(0,0,0,.04)">
      <div class="p-5 flex items-center gap-3 border-b border-gray-50">
        <div class="w-10 h-10 bg-gradient-to-br from-primary to-rose-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/25">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">clinical_notes</span>
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-[15px] font-black leading-none text-gray-900">الفرات فارما</h1>
          <p class="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-0.5">إدارة المتجر</p>
        </div>
        <button onclick="closeMobileMenu()" id="mobile-close-btn" class="lg:hidden size-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors" aria-label="إغلاق القائمة">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="القائمة الرئيسية">
        ${navHTML}
        ${extraLinks}
      </nav>
      <div class="p-3 border-t border-gray-50">
        <a href="https://elforatpharma.github.io/store/" target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-50 text-xs font-bold tracking-wider uppercase mb-1 transition-colors">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>فتح المتجر
        </a>
        <button onclick="logout()" aria-label="تسجيل الخروج"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-all group text-right">
          <div class="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black" aria-hidden="true">أ.ف</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold truncate text-gray-700 group-hover:text-red-500">الفرات فارما</p>
            <p class="text-[10px] text-gray-400">تسجيل خروج</p>
          </div>
          <span class="material-symbols-outlined text-gray-300 group-hover:text-red-400 text-[18px]" aria-hidden="true">logout</span>
        </button>
      </div>
    </aside>
    <button id="mobile-menu-btn" onclick="document.getElementById('app-sidebar').classList.add('open');document.getElementById('sidebar-overlay').classList.add('open')" class="fixed bottom-6 right-4 z-[60] bg-primary text-white rounded-2xl shadow-xl shadow-primary/30 p-3 flex items-center justify-center transition-transform active:scale-90" aria-label="فتح القائمة">
      <span class="material-symbols-outlined text-[22px]">menu</span>
    </button>
    <div id="sidebar-overlay" onclick="closeMobileMenu()" class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[45]"></div>`;

  // حقن الـ Sidebar في الصفحة
  const placeholder = document.getElementById('sidebar-placeholder');
  if (placeholder) placeholder.outerHTML = sidebarHTML;
  injectLayoutStyles();
}

// ---- مساعد لتهريب HTML لمنع ثغرات XSS ----
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#096;')
    .replace(/\\/g, '&#092;');
}

// ---- SweetAlert2 helpers موحدة ----
function toast(icon, title) {
  if (typeof Swal === 'undefined') { alert(title); return; }
  Swal.fire({ icon, title, toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
}

function confirmDialog(title, text, confirmText = 'نعم، احذف') {
  if (typeof Swal === 'undefined') return Promise.resolve(confirm(title + '\n' + text));
  return Swal.fire({
    title, text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ec135b',
    cancelButtonColor: '#6b7280',
    confirmButtonText: confirmText,
    cancelButtonText: 'إلغاء',
    fontFamily: 'Tajawal'
  }).then(r => r.isConfirmed);
}
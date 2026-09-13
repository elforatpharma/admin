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
    button,a,[role="button"],select,input[type="checkbox"],input[type="radio"]{touch-action:manipulation;}
    button,a,[role="button"]{-webkit-tap-highlight-color:transparent;}
    button:not(:disabled),a[href],[role="button"]{transition-duration:.15s;}
    button:not(:disabled).efp-pressed,a[href].efp-pressed,[role="button"].efp-pressed{transform:scale(.97)!important;filter:saturate(1.08);}
    button:disabled{cursor:not-allowed;opacity:.68;}
    .efp-click-lock{pointer-events:none;}
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

// ====================================================================
// ===== الهوية البصرية الموحّدة لكل النوافذ المنبثقة (SweetAlert2) =====
// تُطبَّق تلقائياً على أي Swal.fire في أي صفحة (تنبيهات، تأكيد، فورم كامل)
// ====================================================================
function injectSwalIdentity() {
  if (document.getElementById('efp-swal-identity-css')) return;
  const style = document.createElement('style');
  style.id = 'efp-swal-identity-css';
  style.textContent = `
    /* ---- الهوية الأساسية: كل نوافذ Swal (تنبيه/تأكيد/فورم) ---- */
    .efp-modal-container{backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);}
    .efp-swal-popup{
      border-radius:26px!important;font-family:'Tajawal',sans-serif!important;
      box-shadow:0 30px 70px rgba(15,23,42,.28),0 8px 20px rgba(77,60,235,.15)!important;
      direction:rtl;
    }
    .efp-swal-popup .swal2-title{font-family:'Cairo',sans-serif;font-weight:900;color:#0f172a;}
    .efp-swal-popup .swal2-html-container{font-family:'Tajawal',sans-serif;color:#334155;}
    .efp-swal-popup .swal2-icon{margin-top:1.8em;}
    .efp-swal-actions{gap:10px!important;}
    .efp-swal-confirm.swal2-confirm{border-radius:9999px!important;font-weight:900!important;padding:10px 26px!important;box-shadow:0 8px 20px rgba(77,60,235,.3)!important;}
    .efp-swal-confirm.swal2-confirm:hover{box-shadow:0 10px 24px rgba(77,60,235,.4)!important;}
    .efp-swal-cancel.swal2-cancel{border-radius:9999px!important;font-weight:800!important;background:#f1f5f9!important;color:#475569!important;box-shadow:none!important;}
    .efp-swal-deny.swal2-deny{border-radius:9999px!important;font-weight:800!important;}

    .efp-pop-in{animation:efp-pop-in-kf .28s cubic-bezier(.2,.9,.3,1.2)!important;}
    .efp-pop-out{animation:efp-pop-out-kf .18s ease-in!important;}
    @keyframes efp-pop-in-kf{from{opacity:0;transform:scale(.92) translateY(12px);}to{opacity:1;transform:scale(1) translateY(0);}}
    @keyframes efp-pop-out-kf{from{opacity:1;transform:scale(1);}to{opacity:0;transform:scale(.95);}}

    /* ---- توست صغير (نجاح/خطأ) - هوية أخف بدون ضبابية ---- */
    .efp-toast-popup{border-radius:16px!important;box-shadow:0 10px 30px rgba(15,23,42,.18)!important;font-family:'Tajawal',sans-serif!important;}
    .efp-toast-popup .swal2-timer-progress-bar{background:linear-gradient(90deg,#4d3ceb,#8536ff)!important;}

    /* ---- مودالات الفورم الكبيرة (إضافة/تعديل بيانات) - هيدر متدرّج + أيقونة ---- */
    .efp-modal-popup{border-radius:28px!important;padding:0!important;overflow:hidden;}
    .efp-modal-popup .swal2-header{padding:0;}
    .efp-modal-popup .swal2-title{
      margin:0;padding:22px 28px;
      background:linear-gradient(90deg,#4d3ceb 0%,#8536ff 100%);
      color:#fff!important;text-align:right;
    }
    .efp-modal-title-wrap{display:flex;align-items:center;gap:12px;}
    .efp-modal-title-wrap .material-symbols-outlined{font-size:26px;background:rgba(255,255,255,.18);border-radius:14px;padding:8px;}
    .efp-modal-title-text{display:flex;flex-direction:column;text-align:right;}
    .efp-modal-title-main{font-family:'Cairo',sans-serif;font-weight:900;font-size:17px;line-height:1.3;color:#fff;}
    .efp-modal-title-sub{font-size:11px;font-weight:500;opacity:.85;margin-top:2px;}
    .efp-modal-popup .swal2-close{color:#fff!important;top:18px!important;left:18px!important;right:auto!important;opacity:.85;}
    .efp-modal-popup .swal2-close:hover{opacity:1;transform:rotate(90deg);background:transparent!important;}

    .efp-modal-html{margin:0!important;padding:24px 28px 4px!important;text-align:right;max-height:64vh;overflow-y:auto;}
    .efp-field-group{margin-bottom:14px;text-align:right;}
    .efp-row-2{display:flex;gap:10px;}
    .efp-row-2 .efp-field-group{flex:1;}
    .efp-label{display:block;font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;}
    .efp-modal-popup .efp-input.swal2-input,
    .efp-modal-popup .efp-input.swal2-textarea{
      margin:0!important;width:100%!important;
      border:2px solid #eef0ff!important;border-radius:14px!important;
      box-shadow:none!important;font-family:'Tajawal',sans-serif;
      font-size:14px;background:#faf8ff;transition:.2s;
    }
    .efp-modal-popup .efp-input:focus{
      border-color:#4d3ceb!important;background:#fff;
      box-shadow:0 0 0 4px rgba(77,60,235,.10)!important;
    }
    .efp-img-row{display:flex;align-items:center;gap:12px;}
    .efp-img-row img{width:56px;height:56px;border-radius:14px;object-fit:cover;background:#f3f4f6;border:1px solid #e5e7eb;}
    .efp-img-row input[type=file]{font-size:11px;color:#64748b;}
    .efp-modal-popup .efp-modal-actions{padding:16px 28px 24px!important;margin:0!important;}

    /* ---- مودالات HTML الأصلية (product/gift/coupon) في admin.html - نفس الهوية ---- */
    .efp-native-overlay{background:rgba(19,27,46,.55)!important;backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);}
    .efp-native-card{border-radius:28px!important;box-shadow:0 30px 70px rgba(15,23,42,.28),0 8px 20px rgba(77,60,235,.15)!important;}
    .efp-native-header{background:linear-gradient(90deg,#4d3ceb 0%,#8536ff 100%);color:#fff;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;}
    .efp-native-header .efp-native-title-wrap{display:flex;align-items:center;gap:12px;}
    .efp-native-header .material-symbols-outlined.efp-native-icon{font-size:24px;background:rgba(255,255,255,.18);border-radius:14px;padding:8px;}
    .efp-native-header h3{font-family:'Cairo',sans-serif;font-weight:900;font-size:17px;color:#fff;margin:0;}
    .efp-native-header p{font-size:11px;opacity:.85;margin:2px 0 0;}
    .efp-native-header .efp-native-close{color:#fff;opacity:.85;transition:.2s;}
    .efp-native-header .efp-native-close:hover{opacity:1;transform:rotate(90deg);background:rgba(255,255,255,.15)!important;}
  `;
  document.head.appendChild(style);
}

// ---- توحيد كل نوافذ SweetAlert2 تلقائياً (بدون تعديل كل استدعاء على حدة) ----
function patchSwalIdentity() {
  if (typeof Swal === 'undefined' || Swal.__efpPatched) return;
  const originalFire = Swal.fire.bind(Swal);
  const mergeClass = (base, extra) => [base, extra].filter(Boolean).join(' ');
  Swal.fire = function (options) {
    options = Object.assign({}, options);
    const cc = Object.assign({}, options.customClass);
    if (options.toast) {
      // توست صغير: هوية أخف بدون ضبابية خلفية
      cc.popup = mergeClass('efp-toast-popup', cc.popup);
    } else {
      if (options.backdrop === undefined) options.backdrop = 'rgba(19,27,46,0.55)';
      cc.container = mergeClass('efp-modal-container', cc.container);
      cc.popup = mergeClass('efp-swal-popup', cc.popup);
      cc.confirmButton = mergeClass('efp-swal-confirm', cc.confirmButton);
      cc.cancelButton = mergeClass('efp-swal-cancel', cc.cancelButton);
      cc.denyButton = mergeClass('efp-swal-deny', cc.denyButton);
      cc.actions = mergeClass('efp-swal-actions', cc.actions);
      if (!options.showClass) options.showClass = { popup: 'efp-pop-in' };
      if (!options.hideClass) options.hideClass = { popup: 'efp-pop-out' };
    }
    options.customClass = cc;
    return originalFire(options);
  };
  Swal.__efpPatched = true;
}

injectSwalIdentity();
patchSwalIdentity();

// ---- إنشاء الـ Sidebar ديناميكياً ----
function renderSidebar(activePage) {
  const navItems = [
    { href: 'admin.html',       icon: 'dashboard',    label: 'الرئيسية' },
    { href: 'orders.html',      icon: 'shopping_bag', label: 'الطلبات' },
    { href: 'inventory.html',   icon: 'inventory_2',  label: 'المخزون' },
    { href: 'customers.html',   icon: 'group',        label: 'العملاء' },
    { href: 'coupons.html',     icon: 'confirmation_number', label: 'الكوبونات والعروض' },
    { href: 'sales-report.html', icon: 'monitoring',   label: 'تقرير المبيعات' },
    { href: 'visitor-analytics.html', icon: 'query_stats', label: 'تحليلات الزيارات' },
    { href: 'messages.html',    icon: 'chat',         label: 'رسائل العملاء' },
    { href: 'settings.html',    icon: 'settings',     label: 'إعدادات المتجر' },
    { href: 'system-check.html', icon: 'health_and_safety', label: 'فحص الربط' },
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

  const sidebarHTML = `
    <aside id="app-sidebar" class="w-64 h-screen fixed right-0 top-0 bg-white border-l border-gray-100/80 flex flex-col z-40" style="box-shadow:2px 0 24px rgba(0,0,0,.04)">
      <div class="p-5 flex items-center gap-3 border-b border-gray-50">
        <div class="w-10 h-10 bg-gradient-to-br from-[#4d3ceb] to-[#8536ff] rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/25">
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
  installFastControls();
}

function installFastControls() {
  if (document.__efpFastControlsInstalled) return;
  document.__efpFastControlsInstalled = true;

  const clickableSelector = 'button,a[href],[role="button"]';
  const lockedUntil = new WeakMap();

  document.addEventListener('pointerdown', event => {
    const el = event.target.closest(clickableSelector);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    el.classList.add('efp-pressed');
  }, { passive: true });

  ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(type => {
    document.addEventListener(type, event => {
      const el = event.target.closest && event.target.closest(clickableSelector);
      if (el) el.classList.remove('efp-pressed');
    }, true);
  });

  document.addEventListener('click', event => {
    const el = event.target.closest(clickableSelector);
    if (!el || el.dataset.allowRapidClick === 'true') return;
    if (el.tagName === 'A' && (el.target === '_blank' || el.hasAttribute('download'))) return;

    const now = Date.now();
    const until = lockedUntil.get(el) || 0;
    if (now < until) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    lockedUntil.set(el, now + 450);
    el.classList.add('efp-click-lock');
    window.setTimeout(() => el.classList.remove('efp-click-lock'), 220);
  }, true);
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
    confirmButtonColor: '#4d3ceb',
    cancelButtonColor: '#6b7280',
    confirmButtonText: confirmText,
    cancelButtonText: 'إلغاء',
    fontFamily: 'Tajawal'
  }).then(r => r.isConfirmed);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectLayoutStyles();
    installFastControls();
  }, { once: true });
} else {
  injectLayoutStyles();
  installFastControls();
}

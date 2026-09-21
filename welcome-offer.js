/**
 * WelcomeOffer - كوبون WELCOME20 لأول زيارة فقط
 * الفرات فارما (يوضع في المتجر، مش في لوحة التحكم)
 *
 * المنطق:
 *  - أول مرة يفتح الزائر المتجر  → الكوبون يتفعّل ويظهر له بانر.
 *  - أي زيارة جديدة بعدها (تبويب/جلسة جديدة) → الكوبون يتلغي تلقائياً.
 *  - بعد إتمام أول طلب بالكوبون → يتلغي فوراً (markUsed).
 *
 * الاستخدام في المتجر:
 *   <script src="welcome-offer.js"></script>          // قبل analysis.min.js
 *
 *   WelcomeOffer.isEligible()      // true لو لسه في زيارته الأولى
 *   WelcomeOffer.guard(code)       // {ok:false,message} لو الكود WELCOME20 والزائر مش مؤهل
 *   WelcomeOffer.markUsed()        // نادِها بعد نجاح الطلب
 */
(function () {
  'use strict';

  var CODE = 'WELCOME20';
  var KEY = 'elforat_welcome_offer_v1';      // localStorage: حالة العرض للزائر
  var SKEY = 'elforat_welcome_session_v1';   // sessionStorage: علامة الزيارة الحالية

  function storageWorks() {
    try {
      localStorage.setItem('__wo_test', '1');
      var ok = localStorage.getItem('__wo_test') === '1';
      localStorage.removeItem('__wo_test');
      return ok;
    } catch (e) { return false; }
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }
  function inThisSession() {
    try { return sessionStorage.getItem(SKEY) === '1'; } catch (e) { return false; }
  }
  function markSession() {
    try { sessionStorage.setItem(SKEY, '1'); } catch (e) {}
  }

  var canStore = storageWorks();
  var state = canStore ? read() : null;

  if (!canStore) {
    // لو المتصفح مانع التخزين مقدرش أعرف الزائر جديد ولا لأ → مفيش عرض
    state = { status: 'expired', reason: 'no_storage' };
  } else if (!state) {
    // أول زيارة على الإطلاق
    state = { status: 'active', firstSeen: Date.now() };
    write(state);
    markSession();
  } else if (state.status === 'active' && !inThisSession()) {
    // رجع تاني في زيارة جديدة → الكوبون يتلغي تلقائياً
    state.status = 'expired';
    state.reason = 'visit_ended';
    state.expiredAt = Date.now();
    write(state);
  }

  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) {} }); }

  function isEligible() { return state.status === 'active'; }

  function expire(reason) {
    if (state.status === 'expired') return;
    state.status = 'expired';
    state.reason = reason || 'manual';
    state.expiredAt = Date.now();
    if (canStore) write(state);
    hideBanner();
    emit();
  }

  function guard(code) {
    if (String(code || '').trim().toUpperCase() !== CODE) return { ok: true };
    if (isEligible()) return { ok: true };
    return { ok: false, message: 'كوبون الترحيب صالح لأول زيارة فقط وقد انتهى' };
  }

  // ---------- البانر ----------
  var bannerEl = null;

  function hideBanner() {
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    bannerEl = null;
  }

  function showBanner() {
    if (bannerEl || !isEligible()) return;
    var el = document.createElement('div');
    el.setAttribute('dir', 'rtl');
    el.style.cssText =
      'position:fixed;bottom:16px;right:16px;left:16px;max-width:420px;margin-inline:auto;z-index:99999;' +
      'background:linear-gradient(90deg,#4d3ceb 0%,#8536ff 100%);color:#fff;border-radius:16px;' +
      'padding:14px 16px;box-shadow:0 10px 30px rgba(77,60,235,.35);font-family:Tajawal,sans-serif;' +
      'display:flex;align-items:center;gap:12px;';

    var text = document.createElement('div');
    text.style.cssText = 'flex:1;font-size:14px;line-height:1.6;';
    text.appendChild(document.createTextNode('🎁 أهلاً بك! خصم 20% على زيارتك الأولى بكود '));
    var b = document.createElement('b');
    b.setAttribute('dir', 'ltr');
    b.textContent = CODE;
    text.appendChild(b);

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'نسخ الكود';
    copy.style.cssText =
      'background:#fff;color:#4d3ceb;border:0;border-radius:999px;padding:8px 14px;font-weight:800;cursor:pointer;font-size:13px;';
    copy.onclick = function () {
      var done = function () { copy.textContent = 'تم النسخ ✓'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(CODE).then(done, done);
      } else { done(); }
    };

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'إغلاق');
    close.textContent = '×';
    close.style.cssText = 'background:transparent;color:#fff;border:0;font-size:22px;cursor:pointer;line-height:1;';
    close.onclick = hideBanner;

    el.appendChild(text);
    el.appendChild(copy);
    el.appendChild(close);
    document.body.appendChild(el);
    bannerEl = el;
  }

  function init() { if (isEligible()) showBanner(); }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  window.WelcomeOffer = {
    code: CODE,
    isEligible: isEligible,
    guard: guard,
    markUsed: function () { expire('order_placed'); },
    expire: expire,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})();

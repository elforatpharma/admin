# تحسينات الفرات فارما — دليل التركيب

⚠️ **مهم:** رتّبي الخطوات بالظبط زي ما هي تحت، لأن كود المتجر (`analysis.js`) بقى
بيعتمد على دالة SQL جديدة (`create_secure_order`) — لو رفعتي كود المتجر قبل
تشغيل ملفات الـ SQL، الشيك أوت (غير Paymob) هيفشل.

## 1) قاعدة البيانات (Supabase SQL Editor) — بالترتيب ده بالظبط

1. `sql/01_orders_schema_migration.sql` — يضيف الأعمدة الناقصة لجدول `orders` بأمان.
2. `sql/02_create_secure_order.sql` — بينشئ دالة `create_secure_order()` اللي
   بتحسب سعر أي طلب (COD / فودافون كاش / إنستاباي) من قاعدة البيانات نفسها،
   مش من المتصفح.
3. `sql/03_rls_policies.sql` — سياسات RLS شاملة لكل الجداول (products, orders,
   coupons, gifts, messages, settings, visitors, visitor_events, store_events,
   offer_countdowns, error_logs). **ده أهم ملف أمان في المشروع.**

كل الملفات آمنة تتشغل أكتر من مرة (idempotent) — بتستخدم `if not exists` و
`drop policy if exists` قبل كل `create`.

## 2) ملفات المتجر (نفس مكان `index.html` الحالي على GitHub Pages)

استبدلي الملفات دي بنفس الأسماء:
- `index.html`
- `supabaseClient.js`
- `paymob.js` (النسخة الأصلية المعدّلة — للتطوير المستقبلي)
- `paymob.min.js` (النسخة المصغّرة اللي الموقع فعليًا بيحمّلها)
- `analysis.js` (النسخة الأصلية المعدّلة — للتطوير المستقبلي)
- `analysis.min.js` (النسخة المصغّرة اللي الموقع فعليًا بيحمّلها)
- `hero-products.jpg` + `hero-products.webp` (صورة مضغوطة، من 421 كيلوبايت
  لـ ~124 كيلوبايت JPG أو ~75 كيلوبايت WebP)
- `logo.png` + `logo.webp` (بعد تصغير الأبعاد من 1024×1024 لـ 300×300)

`index.html` دلوقتي بيحمّل `supabaseClient.js` ثم `paymob.min.js` ثم
`analysis.min.js` — **الترتيب ده مهم**، متغيريهوش.

> لو عايزة تعدّلي أي منطق مستقبلًا: عدّلي `analysis.js` أو `paymob.js`
> (النسخة الأصلية المقروءة)، وبعدين رجّعي تصغيرها بـ:
> `esbuild analysis.js --minify --legal-comments=none --charset=utf8 --outfile=analysis.min.js`
> (نفس الأمر لـ paymob.js). لو معندكيش esbuild، أي أداة minify تانية
> (terser, uglify-js) تمام برضه.

## 3) لوحة التحكم (نفس مكان `admin.html`)

- `admin/abandoned-cart.html` → ضيفيها في نفس فولدر `admin.html` (محتاجة
  `supabaseClient.js` و`layout.js` الموجودين هناك أصلاً، مفيش حاجة تتغير
  فيهم غير `layout.js` نفسه).
- `admin/layout.js` → استبدلي بيه القديم (فيه إضافة رابط "السلات المتروكة"
  في القائمة الجانبية بس، باقي الملف زي ما هو).

## ملخص التعديلات (رقم البند زي ما اتفقنا عليه)

| # | التعديل | الملفات المتأثرة |
|---|---------|-------------------|
| 1 | تحقق من السعر سيرفر-سايد لكل طرق الدفع | `sql/02_create_secure_order.sql`, `analysis.js` |
| 2 | مركزة المفتاح والإعدادات | `supabaseClient.js`, `analysis.js`, `paymob.js`, `index.html` |
| 3 | RLS شاملة على مستوى الداتابيز | `sql/03_rls_policies.sql` |
| 4 | تمييز رسائل النجاح عن الفشل بدل أخضر دايمًا | `analysis.js`, `index.html` |
| 5 | إلغاء الـ fallback الثلاثي في إدراج الطلبات | `sql/01_orders_schema_migration.sql`, `analysis.js`, `paymob.js` |
| 6 | تصغير الملفات (minify) | `analysis.min.js`, `paymob.min.js`, `index.html` |
| 7 | ضغط الصور + WebP | `hero-products.jpg/webp`, `logo.png/webp`, `index.html` |
| 8 | زرار واتساب بدل الفتح التلقائي | `analysis.js`, `paymob.js` |
| 9 | مزامنة لحظية للكوبون مع لوحة التحكم | `analysis.js` |
| 10 | تقرير السلات المتروكة | `admin/abandoned-cart.html`, `admin/layout.js` |

## ملاحظة أمان مهمة لسه محتاجة اهتمام (خارج نطاق التعديلات دي)

في `sql/03_rls_policies.sql` سيبت تعليق عليها: تحديث حالة الدفع بعد الرجوع
من Paymob (`handleReturn` في `paymob.js`) بيتم حاليًا من **المتصفح مباشرة**
(anon)، وده معتمد على تخمين `merchant_order_id` تقريبًا مستحيل عمليًا، لكن
الحل الصح 100% أمنيًا هو **Webhook من Paymob لسيرفر (Edge Function) بيتحقق
من توقيع HMAC**، مش تحديث من المتصفح بعد الـ redirect. ده تحسين إضافي
مقترح للمرحلة الجاية لو حابة نعمله.

## اختبار سريع بعد الرفع

1. افتحي المتجر، ضيفي منتج للسلة، طبّقي كوبون، واعملي طلب بـ "الدفع عند
   الاستلام" — تأكدي إن الطلب ظهر في `orders` بالسعر الصح والخصم الصح.
2. افتحي console المتصفح، جربي تغيّري سعر منتج في `localStorage` يدويًا
   قبل إرسال الطلب — المفروض الطلب يتسجل بالسعر الحقيقي من قاعدة البيانات
   مش السعر المتلاعب فيه.
3. من لوحة التحكم، أوقفي كوبون شغّال حاليًا في سلة مفتوحة عندك في تبويب
   تاني — المفروض يتشال من السلة فورًا من غير ما تعملي refresh.
4. افتحي `admin/abandoned-cart.html` وشوفي إن السلات اللي ماكملتيش طلباتها
   ظاهرة صح.

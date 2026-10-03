# الفرات فارما — دليل المشروع (الحالة الحالية)

المتجر ولوحة التحكم على GitHub Pages، وقاعدة البيانات على Supabase.
طرق الدفع: **الدفع عند الاستلام + InstaPay + فودافون كاش** (Paymob اتشال بالكامل).

## 1) ملفات المتجر

| الملف | وظيفته |
|---|---|
| `index.html` | صفحة المتجر |
| `style.min.css` (من `style.css`) | التنسيقات. عدّلي في `style.css` وأعيدي التصغير |
| `tailwind-built.css` | Tailwind مبني مسبقاً (شوفي قسم البناء تحت) |
| `fa-subset.css` | أيقونات FontAwesome المستخدمة بس (بيتحمّل بدون تعطيل الرسم) |
| `supabase-lite.js` | عميل REST صغير بدل `supabase-js` (بيوفّر حوالي 25 KiB) |
| `welcome-offer.js` | كوبون الترحيب `WELCOME10` لأول 24 ساعة |
| `analysis.js` | المنطق الأساسي (المنتجات، السلة، التتبع، الإعدادات) |
| `store-product.js` | صفحة المنتج (بيتحمّل عند أول فتح لمنتج) |
| `store-checkout.js` | تأكيد الطلب (بيتحمّل عند فتح السلة) |
| `order-status.js` | حالات الطلب + إدخال الطلب بدون تكرار (`merchant_order_id`) |
| `instapay.js` / `vodafone-cash.js` | نوافذ الدفع اليدوي |
| `sw.js` + `manifest.json` | الـ Service Worker والـ PWA |

ترتيب التحميل: `supabase-lite.js` ثم `welcome-offer.js` ثم `analysis.js`.
باقي الملفات (`store-*.js` و`order-status.js` و`instapay.js` و`vodafone-cash.js`) بتتحمّل عند الحاجة من `analysis.js`.

### عند كل نشر
1. زوّدي `?v=` في `index.html`.
2. زوّدي `CACHE_NAME` في `sw.js` **لنفس الرقم**.
3. أي ملف lazy جديد ياخد نفس الرقم في `analysis.js` (`PAYMENT_SCRIPTS` وقاموس الـ chunks).

### بناء Tailwind
```bash
cd tailwind-build && npm install && npm run build
```
بيطلّع `tailwind-built.css` جنب `index.html`. الـ `content` في `tailwind.config.js` لازم يمسح كل الملفات اللي فيها كلاسات: `index.html` و`analysis.js` و`store-product.js` و`store-checkout.js` و`welcome-offer.js`. أي كلاس جديد محتاج إعادة بناء.

## 2) لوحة التحكم

`index.html` (تسجيل دخول) → `admin.html`. الصفحات: `orders` و`inventory` و`customers` و`coupons` و`messages` و`reviews` و`sales-report` و`visitor-analytics` و`settings` و`system-check` و`update-password`.
الملفات المشتركة: `layout.js` (القائمة الجانبية والتحقق من الأدمن) و`supabaseClient.js` (اتصال الأدمن) و`imageUploader.js`.

> `supabaseClient.js` بتاع **المتجر** ملف تاني ومش بيتحمّل في المتجر (بيستخدم `supabase-lite.js`). متخلطيش بينهم عند الرفع.

## 3) قاعدة البيانات (Supabase)

### جدول `orders` — الأعمدة الموجودة فعلاً
`id, order_number, customer_name, customer_phone, governate, city, address, total, status, payment_status, items, notes, created_at, updated_at, customerName, customername, phone, date, payment_method, merchant_order_id, transaction_id, paymob_order_id, coupon_code, discount_amount, session_id, traffic_source, traffic_campaign, order_source, delivered_at, amount_cents, hmac_valid, status_code`

- المتجر والداشبورد بيقروا ويكتبوا في `customerName` و`phone`. الأعمدة `customer_name` و`customername` و`customer_phone` مش مستخدمة.
- `paymob_order_id` و`amount_cents` و`hmac_valid` بقايا Paymob.
- **مفيش** أعمدة `paymentMethod` و`payment` و`note` و`coupon` و`couponCode` و`shipping`. لو ضفتيهم في أي استعلام، السيرفر هيرجّع 400.

### شروط لازم تكون متوفرة
- `unique` على `merchant_order_id` (منع تكرار الطلب عند إعادة المحاولة).
- الـ anon مسموحله `INSERT` على `orders` بس، **من غير SELECT**. عشان كده إدخال الطلب من المتجر بيتم من غير `select`، ولو السيرفر رفض بـ `42501` الكود بيعيد المحاولة بدون طلب الصف راجع (`order-status.js`).
- سياسات الأدمن بتعتمد على `public.is_admin()` وبتطابق `ADMIN_EMAIL` في `supabaseClient.js` بتاع الداشبورد.
- حد الصفوف في Supabase الافتراضي 1000 للطلب الواحد، حتى لو كتبتي `.limit()` أكبر. صفحات التقارير بتتأثر لما الطلبات تزيد.

## 4) ملاحظات مفتوحة

- الأسعار والإجمالي بيتحسبوا في المتصفح وبيتبعتوا للجدول مباشرة. الحماية الحقيقية محتاجة دالة أو Trigger في Supabase بيحسب الإجمالي من جدول `products`.
- أزرار الهاتف في `admin.html` و`customers.html` بتحط الرقم داخل `onclick` بدون تنقية كاملة (ثغرة XSS محتملة). الحل: `data-*` مع event delegation، و`CHECK` على شكل رقم الهاتف في الجدول.
- `hero-products.webp` و`instapay-logo.webp` و`logo.png` وأيقونات الـ PWA لازم تكون موجودة في الريبو (`sw.js` بيتجاهل الناقص بدون ما يكسر باقي الكاش).
- `og:image` بيشاور على `hero-products.jpg`. واتساب وفيسبوك مش بيعرضوا webp بشكل موثوق.

## 5) اختبار سريع بعد أي نشر

1. اعملي طلب عند الاستلام من المتجر وتأكدي إنه ظهر في `orders.html`.
2. افتحي `system-check.html` وتأكدي إن كل الفحوصات سليمة.
3. راجعي جدول `error_logs` لأي صفوف `checkout:*`.

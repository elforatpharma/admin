/**
 * نظام إشعارات محسن للفرات فارما
 * Enhanced Notification System for Al-Furat Pharma
 * 
 * الميزات:
 * - إشعارات Toast محلية
 * - إشعارات Push للمتصفح
 * - تكامل مع WhatsApp
 * - تخزين الإشعارات في قاعدة البيانات
 */

class NotificationManager {
    constructor(options = {}) {
        this.vapidPublicKey = options.vapidPublicKey || '';
        this.swPath = options.serviceWorkerPath || '/sw.js';
        this.apiEndpoint = options.apiEndpoint || '';
        this.notifications = [];
        this.init();
    }

    init() {
        // طلب إذن الإشعارات عند التحميل
        if ('Notification' in window && Notification.permission === 'default') {
            // لا نطلب الإذن مباشرة، ننتظر تفاعل المستخدم
            console.log('نظام الإشعارات جاهز');
        }
    }

    // عرض إشعار Toast محلي
    show(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type);
        document.body.appendChild(toast);

        // إزالة الإشعار بعد المدة المحددة
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        // تشغيل صوت إذا كان متاحاً
        this.playNotificationSound(type);

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 left-4 z-50 transform transition-all duration-300 translate-x-[-100%] opacity-0`;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-amber-500',
            info: 'bg-blue-500'
        };

        toast.innerHTML = `
            <div class="${colors[type] || colors.info} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md">
                <span class="text-2xl">${icons[type] || icons.info}</span>
                <p class="font-bold text-sm flex-1">${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white/80 hover:text-white transition-colors">
                    ✕
                </button>
            </div>
        `;

        // تحريك الدخول
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-[-100%]', 'opacity-0');
        });

        return toast;
    }

    removeToast(toast) {
        toast.classList.add('translate-x-[-100%]', 'opacity-0');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }

    playNotificationSound(type) {
        // يمكن إضافة أصوات مخصصة هنا
        if (type === 'error') {
            // صوت خطأ
            this.beep(400, 600);
        } else if (type === 'success') {
            // صوت نجاح
            this.beep(600, 400);
        }
    }

    beep(freq, duration) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);
        } catch (e) {
            console.log('لا يمكن تشغيل الصوت');
        }
    }

    // طلب إذن إشعارات Push
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('المتصفح لا يدعم إشعارات Push');
            return false;
        }

        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('تم قبول إذن الإشعارات');
            await this.subscribeToPush();
            return true;
        } else {
            console.warn('تم رفض إذن الإشعارات');
            return false;
        }
    }

    // الاشتراك في إشعارات Push
    async subscribeToPush() {
        try {
            // تسجيل Service Worker
            const registration = await navigator.serviceWorker.register(this.swPath);
            console.log('Service Worker مسجل:', registration);

            // التحقق من دعم Push
            if (!('pushManager' in registration)) {
                console.warn('Push Manager غير مدعوم');
                return null;
            }

            // التحقق من الاشتراك الحالي
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                // إنشاء اشتراك جديد
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
                });
                console.log('تم الاشتراك في Push:', subscription);
                
                // إرسال الاشتراك إلى الخادم
                await this.sendSubscriptionToServer(subscription);
            }

            return subscription;
        } catch (error) {
            console.error('خطأ في الاشتراك لـ Push:', error);
            return null;
        }
    }

    // إرسال الاشتراك إلى الخادم
    async sendSubscriptionToServer(subscription) {
        try {
            const response = await fetch(`${this.apiEndpoint}/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subscription })
            });

            if (response.ok) {
                console.log('تم حفظ الاشتراك على الخادم');
            }
        } catch (error) {
            console.error('خطأ في إرسال الاشتراك:', error);
        }
    }

    // تحويل مفتاح VAPID
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // إرسال إشعار عبر WhatsApp
    async sendWhatsApp(phoneNumber, message) {
        // تنسيق رقم الهاتف
        const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
        
        // تشفير الرسالة
        const encodedMessage = encodeURIComponent(message);
        
        // رابط WhatsApp
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        
        try {
            // فتح WhatsApp في نافذة جديدة
            window.open(whatsappUrl, '_blank');
            
            // تسجيل الإرسال
            console.log('تم إرسال رسالة WhatsApp إلى:', phoneNumber);
            
            return { success: true, url: whatsappUrl };
        } catch (error) {
            console.error('خطأ في إرسال WhatsApp:', error);
            return { success: false, error: error.message };
        }
    }

    // إرسال إشعار WhatsApp للعميل
    sendCustomerNotification(customerPhone, orderInfo) {
        const message = `
مرحباً ${orderInfo.customerName || 'عزيزي العميل'}،

📦 تفاصيل الطلب #${orderInfo.orderId}:
━━━━━━━━━━━━━━━━
${orderInfo.items || 'تفاصيل الطلب'}
━━━━━━━━━━━━━━━━
💰 المجموع: ${orderInfo.total} ج.م
📍 العنوان: ${orderInfo.address || 'غير محدد'}
📞 للتواصل: ${orderInfo.phone || customerPhone}

شكراً لثقتكم بالفرات فارما 💙
        `.trim();

        return this.sendWhatsApp(customerPhone, message);
    }

    // إرسال إشعار للمدير عن طلب جديد
    notifyNewOrder(order) {
        const message = `
🔔 طلب جديد!
━━━━━━━━━
رقم الطلب: #${order.id}
العميل: ${order.customer_name}
الهاتف: ${order.customer_phone}
المجموع: ${order.total} ج.م
الحالة: ${order.status}
        `.trim();

        // إشعار محلي
        this.show('طلب جديد تم استلامه!', 'info');

        // إشعار Push إذا كان مسموحاً
        if (Notification.permission === 'granted') {
            new Notification('طلب جديد 🛒', {
                body: message,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: `order-${order.id}`
            });
        }

        return message;
    }

    // إرسال إشعار عن تغيير حالة الطلب
    notifyOrderStatusChange(orderId, oldStatus, newStatus, customerPhone) {
        const statusMessages = {
            'قيد المعالجة': 'جاري تجهيز طلبك',
            'جاري التجهيز': 'جاري تجهيز طلبك',
            'في الطريق': 'طلبك في الطريق إليك',
            'تم التوصيل': 'تم توصيل طلبك بنجاح',
            'ملغي': 'تم إلغاء الطلب'
        };

        const message = `
📢 تحديث حالة الطلب #${orderId}
━━━━━━━━━━━━━━━━
الحالة السابقة: ${oldStatus}
الحالة الجديدة: ${newStatus}

${statusMessages[newStatus] || ''}

شكراً لثقتكم بالفرات فارما 💙
        `.trim();

        // إشعار محلي
        this.show(`تم تحديث حالة الطلب إلى: ${newStatus}`, 'success');

        // إرسال WhatsApp للعميل
        if (customerPhone) {
            this.sendWhatsApp(customerPhone, message);
        }

        return message;
    }

    // عرض إشعارات متعددة
    showBatch(messages) {
        messages.forEach((msg, index) => {
            setTimeout(() => {
                this.show(msg.message, msg.type || 'info', msg.duration || 5000);
            }, index * 300);
        });
    }

    // تنظيف الإشعارات القديمة
    clearAll() {
        const toasts = document.querySelectorAll('.fixed.top-4.left-4');
        toasts.forEach(toast => this.removeToast(toast));
    }
}

// دالة مساعدة للاستخدام السريع
function showNotification(message, type = 'info', duration = 5000) {
    if (!window.notificationManager) {
        window.notificationManager = new NotificationManager();
    }
    return window.notificationManager.show(message, type, duration);
}

// تصدير الفئة
window.NotificationManager = NotificationManager;
window.showNotification = showNotification;

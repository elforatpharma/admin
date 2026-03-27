/**
 * نظام الإشعارات المتقدم - الفرات فارما
 * Advanced Notification System with Push & WhatsApp Integration
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.permission = 'default';
        this.whatsappNumber = null;
        this.init();
    }

    async init() {
        // طلب إذن الإشعارات عند التحميل
        if ('Notification' in window) {
            this.permission = await Notification.requestPermission();
        }
        
        // تحميل الإشعارات من localStorage
        const saved = localStorage.getItem('notifications');
        if (saved) {
            this.notifications = JSON.parse(saved);
        }
    }

    /**
     * إرسال إشعار محلي
     * @param {Object} options - خيارات الإشعار
     * @param {string} options.title - عنوان الإشعار
     * @param {string} options.body - نص الإشعار
     * @param {string} options.icon - أيقونة الإشعار
     * @param {string} options.type - نوع الإشعار (info, success, warning, error)
     */
    async sendLocal(options) {
        const notification = {
            id: Date.now(),
            ...options,
            timestamp: new Date().toISOString(),
            read: false
        };

        // إضافة للقائمة
        this.notifications.unshift(notification);
        this.save();

        // إشعار المتصفح
        if (this.permission === 'granted') {
            new Notification(options.title, {
                body: options.body,
                icon: options.icon || '/logo.png',
                badge: '/logo.png',
                tag: notification.id.toString(),
                requireInteraction: false
            });
        }

        // عرض Toast في الصفحة
        this.showToast(notification);

        return notification;
    }

    /**
     * إرسال إشعار عبر WhatsApp
     * @param {string} phoneNumber - رقم الهاتف مع رمز الدولة
     * @param {string} message - رسالة WhatsApp
     */
    sendWhatsApp(phoneNumber, message) {
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        
        // فتح WhatsApp في نافذة جديدة
        window.open(url, '_blank');
        
        // تسجيل الإرسال
        this.logWhatsAppMessage(phoneNumber, message);
    }

    /**
     * إرسال تذكير لطلب معين عبر WhatsApp
     * @param {Object} order - بيانات الطلب
     */
    sendOrderReminder(order) {
        const message = `
مرحباً ${order.customerName}،

تذكير بالطلب #${order.id}:
📦 ${order.itemsCount} منتجات
💰 المجموع: ${order.total} ل.س
📍 الحالة: ${order.status}

شكراً لتعاملكم مع الفرات فارما 🌹
        `.trim();

        this.sendWhatsApp(order.phone, message);
    }

    /**
     * إنشاء Badge للإشعارات غير المقروءة
     */
    updateBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if ('setAppBadge' in navigator) {
            if (unreadCount > 0) {
                navigator.setAppBadge(unreadCount);
            } else {
                navigator.clearAppBadge();
            }
        }
        
        // تحديث العداد في الواجهة
        const badgeElement = document.getElementById('notification-badge');
        if (badgeElement) {
            badgeElement.textContent = unreadCount;
            badgeElement.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    /**
     * عرض Toast مؤقت
     * @param {Object} notification - الإشعار للعرض
     */
    showToast(notification) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 left-4 z-50 transform transition-all duration-300 translate-x-full opacity-0`;
        toast.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-4 flex items-start gap-3 border-r-4 ${this.getTypeColor(notification.type)} max-w-sm">
                <span class="text-2xl">${this.getTypeIcon(notification.type)}</span>
                <div class="flex-1">
                    <h4 class="font-bold text-slate-800">${notification.title}</h4>
                    <p class="text-sm text-slate-600 mt-1">${notification.body}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-slate-600">
                    ✕
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // إظهار
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 10);

        // إخفاء بعد 5 ثواني
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    getTypeColor(type) {
        const colors = {
            info: 'border-blue-500',
            success: 'border-green-500',
            warning: 'border-yellow-500',
            error: 'border-red-500'
        };
        return colors[type] || colors.info;
    }

    getTypeIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || icons.info;
    }

    /**
     * تحديد إشعار كمقروء
     * @param {number} id - معرف الإشعار
     */
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.save();
            this.updateBadge();
        }
    }

    /**
     * تحديد كل الإشعارات كمقروءة
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.save();
        this.updateBadge();
    }

    /**
     * حذف إشعار
     * @param {number} id - معرف الإشعار
     */
    delete(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.save();
        this.updateBadge();
    }

    /**
     * حفظ الإشعارات في localStorage
     */
    save() {
        // الاحتفاظ بآخر 100 إشعار فقط
        const toSave = this.notifications.slice(0, 100);
        localStorage.setItem('notifications', JSON.stringify(toSave));
    }

    /**
     * تسجيل رسالة WhatsApp المرسلة
     */
    logWhatsAppMessage(phone, message) {
        const log = {
            phone,
            message,
            timestamp: new Date().toISOString()
        };
        
        const logs = JSON.parse(localStorage.getItem('whatsapp_logs') || '[]');
        logs.push(log);
        localStorage.setItem('whatsapp_logs', JSON.stringify(logs.slice(-50)));
    }

    /**
     * الحصول على الإشعارات
     * @param {boolean} unreadOnly - الحصول على الإشعارات غير المقروءة فقط
     */
    getNotifications(unreadOnly = false) {
        if (unreadOnly) {
            return this.notifications.filter(n => !n.read);
        }
        return this.notifications;
    }
}

// إنشاء instance عام
window.notificationManager = new NotificationManager();

/**
 * نظام إدارة الحالة المركزي - الفرات فارما
 * Centralized State Management System
 * 
 * يستخدم نمط Observer Pattern لتحديث الواجهة تلقائياً عند تغير البيانات
 */

class Store {
    constructor(initialState = {}) {
        this.state = {
            // حالة المصادقة
            auth: {
                isAuthenticated: false,
                user: null,
                role: null
            },
            // حالة المخزون
            inventory: {
                items: [],
                loading: false,
                error: null,
                lastUpdated: null
            },
            // حالة الطلبات
            orders: {
                items: [],
                loading: false,
                error: null,
                filters: {},
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0
                }
            },
            // حالة العملاء
            customers: {
                items: [],
                loading: false,
                error: null
            },
            // حالة الإشعارات
            notifications: {
                items: [],
                unreadCount: 0
            },
            // إعدادات التطبيق
            settings: {
                theme: 'light',
                language: 'ar',
                itemsPerPage: 20
            },
            ...initialState
        };

        // قائمة المستمعين للتغييرات
        this.listeners = new Map();
        this.listenerIdCounter = 0;
    }

    /**
     * الحصول على حالة معينة
     * @param {string} path - مسار الحالة (مثال: 'inventory.items')
     * @returns {*} قيمة الحالة
     */
    getState(path) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : undefined;
        }, this.state);
    }

    /**
     * تحديث حالة معينة
     * @param {string} path - مسار الحالة
     * @param {*} value - القيمة الجديدة
     * @param {boolean} merge - دمج الكائنات بدلاً من الاستبدال
     */
    setState(path, value, merge = true) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((obj, key) => {
            if (!(key in obj)) {
                obj[key] = {};
            }
            return obj[key];
        }, this.state);

        if (merge && typeof value === 'object' && typeof target[lastKey] === 'object') {
            target[lastKey] = { ...target[lastKey], ...value };
        } else {
            target[lastKey] = value;
        }

        // إشعار جميع المستمعين بالتغيير
        this.notifyListeners(path, value);
    }

    /**
     * تسجيل مستمع للتغييرات
     * @param {string} path - مسار الحالة للمراقبة
     * @param {Function} callback - الدالة التي تستدعى عند التغيير
     * @returns {number} معرف المستمع لإلغائه لاحقاً
     */
    subscribe(path, callback) {
        const id = ++this.listenerIdCounter;
        
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Map());
        }
        
        this.listeners.get(path).set(id, callback);
        
        return id;
    }

    /**
     * إلغاء اشتراك مستمع
     * @param {string} path - مسار الحالة
     * @param {number} id - معرف المستمع
     */
    unsubscribe(path, id) {
        if (this.listeners.has(path)) {
            this.listeners.get(path).delete(id);
        }
    }

    /**
     * إشعار المستمعين بالتغييرات
     * @private
     */
    notifyListeners(changedPath, newValue) {
        // إشعار المستمعين للمسار المحدد
        if (this.listeners.has(changedPath)) {
            this.listeners.get(changedPath).forEach(callback => {
                try {
                    callback(newValue, changedPath);
                } catch (error) {
                    console.error('Error in store listener:', error);
                }
            });
        }

        // إشعار المستمعين للمسارات الأبوية
        const parts = changedPath.split('.');
        for (let i = parts.length - 1; i > 0; i--) {
            const parentPath = parts.slice(0, i).join('.');
            if (this.listeners.has(parentPath)) {
                this.listeners.get(parentPath).forEach(callback => {
                    try {
                        callback(this.getState(parentPath), parentPath);
                    } catch (error) {
                        console.error('Error in store listener:', error);
                    }
                });
            }
        }
    }

    /**
     * تنفيذ إجراء متزامن مع تحديث الحالة
     * @param {Function} actionFn - دالة الإجراء
     */
    dispatch(actionFn) {
        try {
            actionFn(this.setState.bind(this), this.getState.bind(this), this.state);
        } catch (error) {
            console.error('Error in store action:', error);
            throw error;
        }
    }

    /**
     * إعادة تعيين الحالة إلى القيم الافتراضية
     */
    reset() {
        this.state = {
            auth: { isAuthenticated: false, user: null, role: null },
            inventory: { items: [], loading: false, error: null, lastUpdated: null },
            orders: { items: [], loading: false, error: null, filters: {}, pagination: { page: 1, limit: 20, total: 0 } },
            customers: { items: [], loading: false, error: null },
            notifications: { items: [], unreadCount: 0 },
            settings: { theme: 'light', language: 'ar', itemsPerPage: 20 }
        };
        this.notifyListeners('state', this.state);
    }

    /**
     * تصدير الحالة للحفظ
     * @returns {string} JSON string
     */
    exportState() {
        return JSON.stringify(this.state);
    }

    /**
     * استيراد حالة محفوظة
     * @param {string} jsonString - JSON string
     */
    importState(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.state = { ...this.state, ...imported };
            this.notifyListeners('state', this.state);
        } catch (error) {
            console.error('Failed to import state:', error);
            throw new Error('Invalid state data');
        }
    }
}

// إنشاء instance عام
window.store = new Store();

// تصدير للاستخدام في وحدات ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Store };
}

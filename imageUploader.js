/**
 * مكتبة رفع الصور بالسحب والإفلات مع المعاينة والتعديل البسيط
 * الفرات فارما - Drag & Drop Image Upload with Preview
 */

/**
 * خيارات رفع الصور
 * @typedef {Object} ImageUploaderOptions
 * @property {HTMLElement|null} [dropZone] - منطقة السحب والإفلات
 * @property {HTMLInputElement|null} [fileInput] - حقل إدخال الملفات
 * @property {HTMLElement|null} [previewContainer] - حاوية المعاينة
 * @property {number} [maxSize] - الحد الأقصى لحجم الملف بالبايت (افتراضي: 5MB)
 * @property {number} [maxWidth] - العرض الأقصى للصورة بعد التصغير (افتراضي: 1920)
 * @property {number} [maxHeight] - الطول الأقصى للصورة بعد التصغير (افتراضي: 1920)
 * @property {number} [quality] - جودة الضغط JPEG من 0 إلى 1 (افتراضي: 0.85)
 * @property {boolean} [allowMultiple] - السماح برفع ملفات متعددة (افتراضي: false)
 * @property {Function} [onImageSelect] - دالة تستدعى عند اختيار صورة
 * @property {Function} [onProgress] - دالة تستدعى أثناء معالجة الصورة
 * @property {Function} [onError] - دالة تستدعى عند حدوث خطأ
 */

class ImageUploader {
    /**
     * إنشاء_instance جديد لرافع الصور
     * @param {ImageUploaderOptions} options - خيارات الرافع
     */
    constructor(options = {}) {
        this.dropZone = options.dropZone || null;
        this.fileInput = options.fileInput || null;
        this.previewContainer = options.previewContainer || null;
        this.maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB افتراضي
        this.maxWidth = options.maxWidth || 1920;
        this.maxHeight = options.maxHeight || 1920;
        this.quality = options.quality || 0.85;
        this.allowMultiple = options.allowMultiple || false;
        this.acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        this.onImageSelect = options.onImageSelect || (() => {});
        this.onProgress = options.onProgress || (() => {});
        this.onError = options.onError || this.showError.bind(this);
        this.croppedImage = null;
        this.selectedFiles = [];

        this.init();
    }

    init() {
        if (this.dropZone) {
            this.setupDropZone();
        }
        if (this.fileInput) {
            this.setupFileInput();
        }
    }

    setupDropZone() {
        const dropZone = this.dropZone;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('border-primary', 'bg-primary/5');
                dropZone.classList.remove('border-slate-300');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('border-primary', 'bg-primary/5');
                dropZone.classList.add('border-slate-300');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFiles(files);
            }
        }, false);

        // النقر لاختيار ملف
        dropZone.addEventListener('click', () => {
            if (this.fileInput) {
                this.fileInput.click();
            }
        });
    }

    setupFileInput() {
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
        });
        
        // دعم رفع ملفات متعددة إذا كان مفعلاً
        if (this.allowMultiple) {
            this.fileInput.setAttribute('multiple', 'multiple');
        }
    }

    handleFiles(files) {
        const filesArray = Array.from(files);
        
        if (!this.allowMultiple && filesArray.length > 1) {
            this.onError('يرجى اختيار صورة واحدة فقط');
            return;
        }

        // معالجة جميع الملفات المحددة
        const promises = filesArray.map(file => this.processFile(file));
        
        Promise.all(promises)
            .then(results => {
                this.selectedFiles = results.filter(r => r !== null);
                if (this.previewContainer) {
                    this.showPreviews(this.selectedFiles);
                }
                this.onImageSelect(this.selectedFiles);
            })
            .catch(error => {
                console.error('خطأ في معالجة الصور:', error);
                this.onError('حدث خطأ أثناء معالجة الصور');
            });
    }

    /**
     * معالجة ملف واحد: التحقق، التحجيم، والضغط
     * @param {File} file - الملف المراد معالجته
     * @returns {Promise<{file: File, dataUrl: string, originalSize: number, newSize: number}|null>}
     */
    async processFile(file) {
        // التحقق من نوع الملف
        if (!this.acceptedTypes.includes(file.type)) {
            this.onError(`نوع الملف غير مدعوم: ${file.name}`);
            return null;
        }

        // التحقق من حجم الملف
        if (file.size > this.maxSize) {
            this.onError(`حجم الصورة كبير جداً: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            return null;
        }

        this.onProgress({ file: file.name, stage: 'reading', progress: 0 });

        try {
            const imageDataUrl = await this.readFileAsDataURL(file);
            
            this.onProgress({ file: file.name, stage: 'resizing', progress: 30 });
            
            // تصغير الصورة وضغطها
            const optimizedDataUrl = await resizeImage(imageDataUrl, this.maxWidth, this.maxHeight, this.quality);
            
            this.onProgress({ file: file.name, stage: 'complete', progress: 100 });

            // تحويل DataURL إلى Blob للحصول على الحجم الجديد
            const newBlob = await this.dataURLToBlob(optimizedDataUrl);
            const newFile = new File([newBlob], file.name, { type: 'image/jpeg' });

            return {
                file: newFile,
                dataUrl: optimizedDataUrl,
                originalSize: file.size,
                newSize: newBlob.size,
                compressionRatio: ((1 - newBlob.size / file.size) * 100).toFixed(1)
            };
        } catch (error) {
            console.error('خطأ في معالجة الصورة:', error);
            this.onError(`فشل معالجة الصورة: ${file.name}`);
            return null;
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    dataURLToBlob(dataUrl) {
        return new Promise((resolve) => {
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            resolve(new Blob([u8arr], { type: mime }));
        });
    }

    /**
     * عرض معاينة لصور متعددة
     * @param {Array} files - مصفوفة الصور المعالجة
     */
    showPreviews(files) {
        if (files.length === 0) {
            this.previewContainer.innerHTML = '';
            return;
        }

        const previewsHtml = files.map((item, index) => `
            <div class="relative group bg-white rounded-xl shadow-md overflow-hidden">
                <img src="${item.dataUrl}" alt="معاينة ${index + 1}" class="w-full h-48 object-cover">
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button type="button" onclick="imageUploader.removeImage(${index})" class="px-3 py-1.5 bg-red-500 text-white rounded-lg font-bold text-xs hover:bg-red-600 transition-colors">
                        🗑️ حذف
                    </button>
                </div>
                <div class="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    <div>${(item.newSize / 1024).toFixed(1)} KB</div>
                    <div class="text-green-400">↘ ${item.compressionRatio}%</div>
                </div>
                <div class="absolute top-2 right-2 bg-primary/80 text-white px-2 py-1 rounded text-xs font-bold">
                    ${index + 1}/${files.length}
                </div>
            </div>
        `).join('');

        this.previewContainer.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${previewsHtml}
            </div>
        `;
    }

    showPreview(imageDataUrl, file) {
        // للتوافق مع الإصدارات القديمة - استخدم showPreviews بدلاً من ذلك
        this.showPreviews([{
            dataUrl: imageDataUrl,
            newSize: file.size,
            compressionRatio: '0'
        }]);
    }

    /**
     * عرض رسالة خطأ بطريقة احترافية
     * @param {string} message - رسالة الخطأ
     */
    showError(message) {
        // إنشاء عنصر إشعار إذا لم يكن موجوداً
        let notification = document.getElementById('image-uploader-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'image-uploader-notification';
            notification.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform -translate-y-full opacity-0';
            document.body.appendChild(notification);
        }

        notification.innerHTML = `
            <div class="bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                <span class="text-xl">❌</span>
                <span class="font-bold">${message}</span>
            </div>
        `;

        // إظهار الإشعار
        setTimeout(() => {
            notification.classList.remove('-translate-y-full', 'opacity-0');
        }, 10);

        // إخفاء بعد 3 ثواني
        setTimeout(() => {
            notification.classList.add('-translate-y-full', 'opacity-0');
        }, 3000);

        console.error('[ImageUploader Error]', message);
    }

    /**
     * حذف صورة محددة من القائمة
     * @param {number} index - فهرس الصورة للحذف
     */
    removeImage(index) {
        if (typeof index === 'number' && this.selectedFiles[index]) {
            // حذف صورة محددة من القائمة
            this.selectedFiles.splice(index, 1);
            
            if (this.previewContainer) {
                if (this.selectedFiles.length === 0) {
                    this.previewContainer.innerHTML = '';
                } else {
                    this.showPreviews(this.selectedFiles);
                }
            }
            
            this.onImageSelect(this.selectedFiles);
        } else {
            // حذف الكل (للتوافق مع الإصدارات القديمة)
            if (this.previewContainer) {
                this.previewContainer.innerHTML = '';
            }
            if (this.fileInput) {
                this.fileInput.value = '';
            }
            this.croppedImage = null;
            this.selectedFiles = [];
            this.onImageSelect([]);
        }
    }

    /**
     * تحرير صورة معينة (فتح أداة القص)
     * @param {number} index - فهرس الصورة للتحرير
     */
    editImage(index) {
        alert('ميزة تعديل الصور قيد التطوير - سيتم إضافة أداة قص متقدمة قريباً');
    }

    /**
     * الحصول على جميع الصور المختارة
     * @returns {Array} مصفوفة الصور المعالجة
     */
    getSelectedFiles() {
        return this.selectedFiles;
    }

    getCroppedImage() {
        return this.croppedImage;
    }

    /**
     * ضغط صورة معينة
     * @param {string} imageDataUrl - الصورة بصيغة DataURL
     * @param {number} maxWidth - العرض الأقصى
     * @param {number} maxHeight - الطول الأقصى  
     * @param {number} quality - الجودة من 0 إلى 1
     * @returns {Promise<string>} الصورة المضغوطة بصيغة DataURL
     */
    async compressImage(imageDataUrl, maxWidth = 1920, maxHeight = 1920, quality = 0.85) {
        return await resizeImage(imageDataUrl, maxWidth, maxHeight, quality);
    }
}

// دوال مساعدة لقص الصور باستخدام Canvas
function cropImage(imageDataUrl, cropData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = cropData.width;
            canvas.height = cropData.height;

            ctx.drawImage(
                img,
                cropData.x,
                cropData.y,
                cropData.width,
                cropData.height,
                0,
                0,
                cropData.width,
                cropData.height
            );

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };

        img.onerror = reject;
    });
}

// تصغير الصورة لتقليل الحجم مع الحفاظ على الجودة
/**
 * تصغير وضغط صورة
 * @param {string} imageDataUrl - الصورة بصيغة DataURL
 * @param {number} maxWidth - العرض الأقصى
 * @param {number} maxHeight - الطول الأقصى
 * @param {number} quality - جودة JPEG من 0 إلى 1 (افتراضي: 0.85)
 * @returns {Promise<string>} الصورة المضغوطة بصيغة DataURL
 */
function resizeImage(imageDataUrl, maxWidth = 800, maxHeight = 800, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // حساب الأبعاد الجديدة مع الحفاظ على النسبة
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = width;
            canvas.height = height;

            // تحسين جودة الرسم
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, width, height);

            // تصدير بجودة محددة
            resolve(canvas.toDataURL('image/jpeg', quality));
        };

        img.onerror = reject;
    });
}

// تصدير الدوال للاستخدام العام
window.ImageUploader = ImageUploader;
window.cropImage = cropImage;
window.resizeImage = resizeImage;
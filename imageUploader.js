/**
 * مكتبة رفع الصور بالسحب والإفلات مع المعاينة والتعديل البسيط
 * الفرات فارما - Drag & Drop Image Upload with Preview
 * 
 * الميزات المحسنة:
 * - قص الصور فعلياً باستخدام Canvas
 * - ضغط تلقائي للصور
 * - دعم رفع متعدد
 * - معاينة متعددة مع إمكانية الحذف الفردي
 */

class ImageUploader {
    constructor(options = {}) {
        this.dropZone = options.dropZone || null;
        this.fileInput = options.fileInput || null;
        this.previewContainer = options.previewContainer || null;
        this.maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB افتراضي
        this.maxFiles = options.maxFiles || 10; // الحد الأقصى للصور
        this.acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        this.onImageSelect = options.onImageSelect || (() => {});
        this.onImagesSelect = options.onImagesSelect || (() => {});
        this.quality = options.quality || 0.8; // جودة الضغط (0.8 = 80%)
        this.maxWidth = options.maxWidth || 1920; // العرض الأقصى
        this.maxHeight = options.maxHeight || 1920; // الطول الأقصى
        this.croppedImage = null;
        this.selectedFiles = []; // تخزين الملفات المتعددة
        this.imageDataUrls = []; // تخزين روابط الصور للمعاينة
        this.cropModal = null;
        this.currentCropImage = null;
        this.currentCropIndex = -1;

        this.init();
    }

    init() {
        if (this.dropZone) {
            this.setupDropZone();
        }
        if (this.fileInput) {
            this.setupFileInput();
        }
        this.createCropModal();
    }

    createCropModal() {
        // إنشاء مودال القص إذا لم يكن موجوداً
        const modalHtml = `
            <div id="crop-modal" class="fixed inset-0 bg-black/80 z-50 hidden items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                    <div class="p-6 border-b border-slate-200 flex items-center justify-between">
                        <h3 class="text-xl font-bold text-slate-800">✂️ قص الصورة</h3>
                        <button type="button" onclick="imageUploader.closeCropModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="p-6">
                        <div class="relative bg-slate-100 rounded-xl overflow-hidden" style="max-height: 60vh;">
                            <canvas id="crop-canvas" class="w-full"></canvas>
                        </div>
                        <div class="mt-4 flex gap-2 flex-wrap">
                            <button type="button" onclick="imageUploader.setCropRatio(1)" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold">1:1 مربع</button>
                            <button type="button" onclick="imageUploader.setCropRatio(16/9)" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold">16:9 عرضي</button>
                            <button type="button" onclick="imageUploader.setCropRatio(4/3)" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold">4:3 قياسي</button>
                            <button type="button" onclick="imageUploader.setCropRatio(9/16)" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold">9:16 طولي</button>
                            <button type="button" onclick="imageUploader.resetCrop()" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold">🔄 إعادة تعيين</button>
                        </div>
                    </div>
                    <div class="p-6 border-t border-slate-200 flex gap-3 justify-end">
                        <button type="button" onclick="imageUploader.closeCropModal()" class="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">إلغاء</button>
                        <button type="button" onclick="imageUploader.applyCrop()" class="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">✓ تطبيق القص</button>
                    </div>
                </div>
            </div>
        `;
        
        if (!document.getElementById('crop-modal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        this.cropModal = document.getElementById('crop-modal');
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
        // السماح باختيار ملفات متعددة
        this.fileInput.setAttribute('multiple', 'multiple');
    }

    handleFiles(files) {
        // التحقق من الحد الأقصى للملفات
        if (this.selectedFiles.length + files.length > this.maxFiles) {
            this.showError(`يمكنك رفع ${this.maxFiles} صور كحد أقصى`);
            return;
        }

        // معالجة جميع الملفات
        Array.from(files).forEach(async (file) => {
            // التحقق من نوع الملف
            if (!this.acceptedTypes.includes(file.type)) {
                this.showError('يرجى اختيار صور بصيغة JPG, PNG أو WebP');
                return;
            }

            // التحقق من حجم الملف
            if (file.size > this.maxSize) {
                this.showError('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
                return;
            }

            // ضغط ومعالجة الصورة
            await this.compressAndPreview(file);
        });
    }

    async compressAndPreview(file) {
        try {
            const imageDataUrl = await this.loadImageAsDataURL(file);
            
            // تصغير وضغط الصورة
            const compressedDataUrl = await this.compressImage(imageDataUrl, {
                maxWidth: this.maxWidth,
                maxHeight: this.maxHeight,
                quality: this.quality
            });

            // إنشاء ملف جديد من الصورة المضغوطة
            const compressedFile = await this.dataURLToFile(compressedDataUrl, file.name);
            
            // تخزين البيانات
            const index = this.selectedFiles.length;
            this.selectedFiles.push(compressedFile);
            this.imageDataUrls.push(compressedDataUrl);

            // تحديث المعاينة
            if (this.previewContainer) {
                this.showMultiPreview();
            }

            // استدعاء دالة الاستدعاء
            this.onImageSelect(compressedFile, compressedDataUrl);
            this.onImagesSelect(this.selectedFiles, this.imageDataUrls);

            console.log(`تم ضغط الصورة: ${file.name} - الحجم الأصلي: ${(file.size / 1024).toFixed(1)} KB، الجديد: ${(compressedFile.size / 1024).toFixed(1)} KB`);
        } catch (error) {
            console.error('خطأ في معالجة الصورة:', error);
            this.showError('حدث خطأ أثناء معالجة الصورة');
        }
    }

    loadImageAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    compressImage(imageDataUrl, options = {}) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = imageDataUrl;

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // حساب الأبعاد الجديدة مع الحفاظ على النسبة
                if (width > options.maxWidth || height > options.maxHeight) {
                    const ratio = Math.min(options.maxWidth / width, options.maxHeight / height);
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

                // الضغط باستخدام الجودة المحددة
                resolve(canvas.toDataURL('image/jpeg', options.quality));
            };

            img.onerror = reject;
        });
    }

    dataURLToFile(dataURL, filename) {
        return new Promise((resolve) => {
            fetch(dataURL)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], filename, { type: 'image/jpeg' });
                    resolve(file);
                });
        });
    }

    showMultiPreview() {
        if (!this.previewContainer) return;

        const previewsHtml = this.imageDataUrls.map((dataUrl, index) => {
            const fileSize = this.selectedFiles[index] ? (this.selectedFiles[index].size / 1024).toFixed(1) : '0';
            return `
                <div class="relative group bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200">
                    <img src="${dataUrl}" alt="معاينة ${index + 1}" class="w-full h-48 object-cover">
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button type="button" onclick="imageUploader.editImage(${index})" class="px-3 py-2 bg-white text-slate-800 rounded-lg font-bold text-xs hover:bg-slate-100 transition-colors">
                            ✏️ قص
                        </button>
                        <button type="button" onclick="imageUploader.removeImageAt(${index})" class="px-3 py-2 bg-red-500 text-white rounded-lg font-bold text-xs hover:bg-red-600 transition-colors">
                            🗑️
                        </button>
                    </div>
                    <div class="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        ${fileSize} KB
                    </div>
                    <div class="absolute top-2 left-2 bg-primary/90 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                        ${index + 1}
                    </div>
                </div>
            `;
        }).join('');

        this.previewContainer.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${previewsHtml}
            </div>
            ${this.selectedFiles.length > 0 ? `
                <div class="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-slate-600">عدد الصور: <strong class="text-slate-800">${this.selectedFiles.length}</strong></span>
                        <span class="text-slate-600">الحجم الإجمالي: <strong class="text-slate-800">${(this.selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB</strong></span>
                        <button type="button" onclick="imageUploader.removeAllImages()" class="text-red-500 hover:text-red-600 font-bold text-xs">
                            حذف الكل
                        </button>
                    </div>
                </div>
            ` : ''}
        `;
    }

    showError(message) {
        // استخدام نظام إشعارات محسن إذا كان متاحاً
        if (window.showNotification) {
            showNotification(message, 'error');
        } else {
            alert(message);
        }
        console.error(message);
    }

    removeImage() {
        this.removeAllImages();
    }

    removeImageAt(index) {
        if (index >= 0 && index < this.selectedFiles.length) {
            this.selectedFiles.splice(index, 1);
            this.imageDataUrls.splice(index, 1);
            
            // إعادة بناء المعاينة
            if (this.previewContainer) {
                this.showMultiPreview();
            }
            
            // تحديث دالة الاستدعاء
            this.onImagesSelect(this.selectedFiles, this.imageDataUrls);
        }
    }

    removeAllImages() {
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '';
        }
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        this.selectedFiles = [];
        this.imageDataUrls = [];
        this.croppedImage = null;
        this.onImageSelect(null, null);
        this.onImagesSelect([], []);
    }

    editImage(index = 0) {
        // فتح مودال القص للصورة المحددة
        if (index >= 0 && index < this.imageDataUrls.length) {
            this.currentCropIndex = index;
            this.currentCropImage = this.imageDataUrls[index];
            this.openCropModal();
        }
    }

    openCropModal() {
        if (!this.cropModal || !this.currentCropImage) return;

        const canvas = document.getElementById('crop-canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // ضبط أبعاد الكانفاس لتتناسب مع الصورة
            const maxWidth = canvas.parentElement.offsetWidth;
            const scale = Math.min(1, maxWidth / img.width);
            
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // إظهار المودال
            this.cropModal.classList.remove('hidden');
            this.cropModal.classList.add('flex');
        };

        img.src = this.currentCropImage;
    }

    closeCropModal() {
        if (this.cropModal) {
            this.cropModal.classList.add('hidden');
            this.cropModal.classList.remove('flex');
        }
        this.currentCropImage = null;
        this.currentCropIndex = -1;
    }

    setCropRatio(ratio) {
        // يمكن تطوير هذه الدالة لإضافة إطار قص بالتناسب المحدد
        console.log('نسبة القص:', ratio);
        // هنا يمكن إضافة منطق الرسم لإطار القص على الكانفاس
    }

    resetCrop() {
        if (this.currentCropImage) {
            this.openCropModal();
        }
    }

    applyCrop() {
        const canvas = document.getElementById('crop-canvas');
        if (!canvas || !this.currentCropImage) return;

        // الحصول على الصورة المقصوصة من الكانفاس
        const croppedDataUrl = canvas.toDataURL('image/jpeg', this.quality);

        // تحديث الصورة في القائمة
        if (this.currentCropIndex >= 0 && this.currentCropIndex < this.imageDataUrls.length) {
            this.imageDataUrls[this.currentCropIndex] = croppedDataUrl;
            
            // إنشاء ملف جديد من الصورة المقصوصة
            this.dataURLToFile(croppedDataUrl, `cropped_${this.currentCropIndex}.jpg`).then(file => {
                this.selectedFiles[this.currentCropIndex] = file;
                
                // إعادة بناء المعاينة
                this.showMultiPreview();
                
                // تحديث دالة الاستدعاء
                this.onImagesSelect(this.selectedFiles, this.imageDataUrls);
            });
        }

        this.closeCropModal();
    }

    getCroppedImage() {
        return this.croppedImage;
    }

    // الحصول على جميع الملفات المضغوطة
    getFiles() {
        return this.selectedFiles;
    }

    // الحصول على جميع روابط الصور
    getImageUrls() {
        return this.imageDataUrls;
    }

    // رفع صورة محددة مباشرة
    async uploadSingleFile(file) {
        await this.compressAndPreview(file);
        return this.selectedFiles[this.selectedFiles.length - 1];
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

// تصغير الصورة لتقليل الحجم
function resizeImage(imageDataUrl, maxWidth = 800, maxHeight = 800) {
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

            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };

        img.onerror = reject;
    });
}

// تصدير الدوال للاستخدام العام
window.ImageUploader = ImageUploader;
window.cropImage = cropImage;
window.resizeImage = resizeImage;
/**
 * مكتبة رفع الصور بالسحب والإفلات مع المعاينة والتعديل البسيط
 * الفرات فارما - Drag & Drop Image Upload with Preview
 */

class ImageUploader {
    constructor(options = {}) {
        this.dropZone = options.dropZone || null;
        this.fileInput = options.fileInput || null;
        this.previewContainer = options.previewContainer || null;
        this.maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB افتراضي
        this.acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        this.onImageSelect = options.onImageSelect || (() => {});
        this.croppedImage = null;

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
    }

    handleFiles(files) {
        const file = files[0];

        // التحقق من نوع الملف
        if (!this.acceptedTypes.includes(file.type)) {
            this.showError('يرجى اختيار صورة بصيغة JPG, PNG أو WebP');
            return;
        }

        // التحقق من حجم الملف
        if (file.size > this.maxSize) {
            this.showError('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
            return;
        }

        this.previewImage(file);
    }

    previewImage(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const imageDataUrl = e.target.result;

            if (this.previewContainer) {
                this.showPreview(imageDataUrl, file);
            }

            this.onImageSelect(file, imageDataUrl);
        };

        reader.readAsDataURL(file);
    }

    showPreview(imageDataUrl, file) {
        this.previewContainer.innerHTML = `
            <div class="relative group">
                <img src="${imageDataUrl}" alt="معاينة" class="max-h-64 rounded-xl object-contain mx-auto">
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button type="button" onclick="imageUploader.editImage()" class="px-4 py-2 bg-white text-slate-800 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors">
                        ✏️ تعديل
                    </button>
                    <button type="button" onclick="imageUploader.removeImage()" class="px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600 transition-colors">
                        🗑️ حذف
                    </button>
                </div>
                <div class="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    ${(file.size / 1024).toFixed(1)} KB
                </div>
            </div>
        `;
    }

    showError(message) {
        alert(message);
        console.error(message);
    }

    removeImage() {
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '';
        }
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        this.croppedImage = null;
        this.onImageSelect(null, null);
    }

    editImage() {
        // يمكن تطوير هذه الدالة لفتح محرر صور
        alert('ميزة تعديل الصور قيد التطوير');
    }

    getCroppedImage() {
        return this.croppedImage;
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
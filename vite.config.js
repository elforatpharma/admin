import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  build: {
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },

  server: {
    port: 3000,
    open: true
  },

  // تحسينات SEO والأداء
  appType: 'mpa',
  
  // إعدادات CSS
  css: {
    devSourcemap: false
  },

  // إضافة Plugins مستقبلية
  plugins: []
});

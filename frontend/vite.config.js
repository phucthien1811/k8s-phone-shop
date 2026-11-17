import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Khi chạy "npm run dev" trên máy, /api được chuyển sang backend ở cổng 3000.
// Trong Kubernetes, việc chuyển /api do Nginx đảm nhận (xem nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
  preview: { proxy: { '/api': 'http://localhost:3000' } },
  build: { chunkSizeWarningLimit: 1500 },
});

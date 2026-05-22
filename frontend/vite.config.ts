import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react';
          }

          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) {
            return 'antd';
          }

          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
});

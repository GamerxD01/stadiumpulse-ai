import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  test: {
    globals: true,
    environment: 'jsdom'
  },

  build: {
    // Raise the warning threshold — 563 kB is expected for a React + Recharts + Lucide app
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Split large third-party libraries into separate vendor chunks.
        // This improves caching: vendor code changes rarely, app code changes often.
        manualChunks: {
          // React runtime — changes only on React upgrades
          'vendor-react': ['react', 'react-dom'],
          // Recharts — large charting library, isolated for independent caching
          'vendor-recharts': ['recharts'],
          // Lucide icons — large icon set, isolated for independent caching
          'vendor-lucide': ['lucide-react']
        }
      }
    }
  }
});

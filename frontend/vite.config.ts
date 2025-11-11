import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'solana-vendor': ['@solana/web3.js'],
          'reactflow-vendor': ['reactflow'],
          'ui-vendor': ['lucide-react', 'react-hot-toast', 'recharts'],
          'utils-vendor': ['axios', 'zustand', 'clsx', 'date-fns', '@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['agent.mixas.pro', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

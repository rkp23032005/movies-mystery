import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
      // Optional same-origin image proxy. Inert unless VITE_IMAGE_BASE=/tmdb-img (see .env.example).
      '/tmdb-img': {
        target: 'https://image.tmdb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tmdb-img/, '/t/p'),
      },
    },
  },
});

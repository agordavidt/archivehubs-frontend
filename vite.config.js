import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  envDir: resolve(__dirname),
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index:  resolve(__dirname, 'src/pages/index.html'),
        login:  resolve(__dirname, 'src/pages/login.html'),
        signup: resolve(__dirname, 'src/pages/signup.html'),
        home:   resolve(__dirname, 'src/pages/home.html'),
        connections: resolve(__dirname, 'src/pages/connections.html'),
        messages:    resolve(__dirname, 'src/pages/messages.html'),
        profile: resolve(__dirname, 'src/pages/profile.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api/, ''),
      },
    },
  },
});
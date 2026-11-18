import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        agent: resolve(__dirname, 'agent.html'),
      },
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
          chess: ['chess.js'],
          peerjs: ['peerjs'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});

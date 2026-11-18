import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'node:child_process';

function getCommitHash() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
}

const commitHash = getCommitHash();
const buildTime = new Date().toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'medium',
});

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  define: {
    __APP_COMMIT__: JSON.stringify(commitHash),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
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

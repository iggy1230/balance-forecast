import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages (https://username.github.io/repo-name/) に対応
  base: './',
  define: {
    // APIキーの環境変数を定義
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY || '')
  }
});
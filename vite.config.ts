import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pagesのサブディレクトリ環境に対応するため相対パスを使用します
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 4096,
  },
  // ブラウザ実行環境で process.env.API_KEY を参照可能にするための定義
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY || '')
  }
});
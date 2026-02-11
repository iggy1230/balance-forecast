import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pagesでリポジトリ名がURLに含まれる場合でも、
  // アセット（JS/CSS）を正しく読み込めるように相対パスベースに設定します。
  base: './',
  define: {
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 小さなファイルをインライン化せず、確実にassetsフォルダに書き出す設定
    assetsInlineLimit: 0
  }
});
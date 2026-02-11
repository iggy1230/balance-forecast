import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 相対パスを使用することで、GitHub Pagesのサブディレクトリ（/repo-name/）でも動作するようにします
  base: './', 
  define: {
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 小さなアセットもインライン化せずファイルとして書き出すことで安定性を向上
    assetsInlineLimit: 0
  }
});
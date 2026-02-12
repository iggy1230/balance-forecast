import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // サブディレクトリ（username.github.io/repo-name/）でも動作するように相対パスを基準にします
  base: './',
  define: {
    // 実行時にエラーが出ないよう、空のprocess.envを定義するか、特定の値を注入します
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY || '')
  }
});
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8788",
          changeOrigin: true,
        },
      },
      // 移动端本地验收时，admin 登录页“放着不动也像刷新”很容易被 Vite HMR 的热替换/重连噪音放大；标准 dev 入口因此默认带 DISABLE_HMR=true。
      // 只有显式走 package.json 的 `dev:hmr` 时才重新启用热更新；不要把移动端稳定性回归默认建立在 HMR 长连之上。
      hmr: process.env.DISABLE_HMR !== 'true',
      // DISABLE_HMR=true 时同时关掉 watch，避免文件波动触发整页热替换，让“像刷新”的排查只剩页面自身链路。
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

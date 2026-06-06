import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// i18n 必须先于 App/深层组件初始化：深层模块会在渲染期调用 tAdmin(...)，入口提前注册资源可避免首屏 fallback 抖动。
import './i18n.ts';
import App from './App.tsx';
import { DialogProvider } from './components/DialogProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </StrictMode>,
);

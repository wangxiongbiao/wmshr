import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// i18n 必须先于 App/深层组件初始化：深层模块会在渲染期调用 tAdmin(...)，入口提前注册资源可避免首屏 fallback 抖动。
import './i18n.ts';
import App from './App.tsx';
import { DialogProvider } from './components/DialogProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  // 为排查移动端登录页“像刷新”的观感，这里临时关闭 React.StrictMode：开发期双挂载会让入口、路由 replace 与 auth 初始化各多走一轮，肉眼上非常像整页重进。
  <BrowserRouter>
    <DialogProvider>
      <App />
    </DialogProvider>
  </BrowserRouter>,
);

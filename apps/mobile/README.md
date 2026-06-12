# WMSHR App

Expo React Native 员工端项目。

## 本地启动

```bash
npm install
npm run start
```

常用命令：

```bash
npm run ios
npm run android
npm run web
npm run lint
```

## 说明

- 路由入口：`app/`（Expo Router）
- 全局 Provider 根布局：`app/_layout.tsx`
- 兼容入口文件：`App.tsx`
- 当前仍是演示数据和本地内存状态，没有接真实后端。
- 打卡流程保持原型里的 `未打卡 -> 上班打卡 -> 下班打卡 -> 重置演示` 顺序。

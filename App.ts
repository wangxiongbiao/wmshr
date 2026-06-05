export {default} from './apps/mobile/App';

// Expo Go 在 npm workspaces 下可能仍通过仓库根 node_modules/expo/AppEntry.js 启动，
// 该入口固定解析 ../../App，也就是仓库根目录的 App 文件。
// 这里仅做员工端入口转发，避免 Expo hoist 后找不到 apps/mobile/App.tsx；
// 若后续调整移动端入口，请同步检查 apps/mobile/index.js 和 apps/mobile/package.json。

import 'react-native-gesture-handler';
import {registerRootComponent} from 'expo';
import App from './App';

// Workspaces 会把 expo hoist 到仓库根 node_modules；如果继续使用 expo/AppEntry，
// Expo 会从仓库根目录解析 ../../App，导致手机端 Metro 500 找不到 apps/mobile/App.tsx。
// 保留员工端自己的入口文件，确保 registerRootComponent 始终从 apps/mobile 加载 App。
registerRootComponent(App);

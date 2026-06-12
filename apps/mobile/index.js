import 'react-native-gesture-handler';
import {registerRootComponent} from 'expo';
import App from './App';

// 当前正式入口已切到 package.json 的 expo-router/entry。
// 这里保留独立 registerRootComponent 入口，便于本地工具或历史脚本直接从 apps/mobile 启动时，
// 仍然明确落到员工端自己的 ExpoRoot，而不是误走仓库根的默认 App 解析逻辑。
registerRootComponent(App);

const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

// npm workspaces 会把 expo/react/react-native 提升到仓库根 node_modules。
// Expo Go 仍可能从根 node_modules/expo/AppEntry.js 进入，并解析仓库根 App.ts。
// 因此必须把 workspaceRoot 加入 watchFolders，同时显式声明 nodeModulesPaths，
// 否则 Metro 文件图谱看不到根 App.ts，会报 Unable to resolve ../../App。
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;

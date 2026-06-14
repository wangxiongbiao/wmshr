import {installMobileDebugLogger, mobileDebugLog} from './src/shared/debug/mobileDebugLogger';

installMobileDebugLogger();
mobileDebugLog('index_js_loaded');

import 'react-native-gesture-handler';
mobileDebugLog('gesture_handler_loaded');

import 'expo-router/entry';

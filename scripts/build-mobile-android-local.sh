#!/usr/bin/env bash
set -euo pipefail

# WMSHR 本地 Android Debug 构建脚本。
# 作用：在当前机器上为 Expo prebuild 后的 Android 原生工程执行一次可安装的 debug APK 构建。
# 前提：
#   1. 已在仓库根执行过依赖安装；
#   2. 本机已安装 JDK 17 与 Android SDK/NDK/cmake；
#   3. apps/mobile 允许生成并使用本地 android/ 工程（Expo prebuild 路线）。
# 影响：
#   1. 若 apps/mobile/android 不存在，会先执行 `npx expo prebuild --platform android` 生成原生工程；
#   2. 会在 apps/mobile/android/app/build/outputs/apk/debug 产出 debug APK；
#   3. 首次构建会自动补装当前 Expo/React Native 所需的 Android SDK 组件与 NDK/cmake，耗时会明显更长。
# 失败优先检查：
#   - JAVA_HOME 是否指向 /usr/local/opt/openjdk@17；
#   - ANDROID_SDK_ROOT 下的 cmdline-tools / build-tools / ndk / cmake 是否完整；
#   - 如果在 Hermes 或其他后台 shell 里执行，是否显式注入了 JAVA_HOME / ANDROID_SDK_ROOT，而不是只写在交互式 zsh 配置里。
# 边界：
#   - 这里固定产出本地 debug APK，用于本机验证与真机安装，不替代 EAS 远端发布流程；
#   - 当前首次验证成功依赖 Expo SDK 54 / React Native 0.81 的原生编译链；若升级 SDK 或 New Architecture 行为变化，先重新实跑再改脚本。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/apps/mobile"
ANDROID_DIR="${MOBILE_DIR}/android"
APK_PATH="${ANDROID_DIR}/app/build/outputs/apk/debug/app-debug.apk"

export JAVA_HOME="${JAVA_HOME:-/usr/local/opt/openjdk@17}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}"
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT}}"
export PATH="${JAVA_HOME}/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${PATH}"

run() {
  echo "+ $*"
  "$@"
}

if [[ ! -d "${ANDROID_DIR}" ]]; then
  run bash -lc "cd '${MOBILE_DIR}' && npx expo prebuild --platform android"
fi

run bash -lc "cd '${ANDROID_DIR}' && ./gradlew assembleDebug"

if [[ ! -f "${APK_PATH}" ]]; then
  echo "Expected APK not found: ${APK_PATH}" >&2
  exit 1
fi

echo "APK ready: ${APK_PATH}"

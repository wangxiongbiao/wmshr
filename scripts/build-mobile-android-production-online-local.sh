#!/usr/bin/env bash
set -euo pipefail

# WMSHR 本地 Android Production Online Release 构建脚本。
# 作用：在当前机器上基于 Expo prebuild 后的原生 Android 工程，生成 release APK，
#       但 JS bundle 明确注入 production + 线上 API 地址，避免把“release 形态”误当成“线上环境”。
# 前提：
#   1. 已在仓库根执行过依赖安装；
#   2. 本机已安装 JDK 17 与 Android SDK/NDK/cmake；
#   3. apps/mobile/android 已存在，或允许先通过 Expo prebuild 生成；
#   4. 当前 release 构建仍沿用 apps/mobile/android/app/build.gradle 中的 debug keystore。
# 影响：
#   1. 若 apps/mobile/android 不存在，会先执行 `npx expo prebuild --platform android` 生成原生工程；
#   2. 会产出 release APK，路径在 outputs/apk/release；
#   3. 该入口只改变 JS 打包阶段注入的运行时环境，不改变当前本地签名策略；
#   4. Play / 线上正式 production AAB 仍应走 `build:android:production:online` 对应的 EAS 链路。
# 失败优先检查：
#   - JAVA_HOME 是否指向 /usr/local/opt/openjdk@17；
#   - ANDROID_SDK_ROOT 下的 cmdline-tools / build-tools / ndk / cmake 是否完整；
#   - 若报签名/zipalign 问题，检查 release 变体是否仍保留当前 debug keystore 回退配置；
#   - 若运行后仍命中本地接口，优先核对下面两项 env 是否被后续命令覆盖。
# 边界：
#   - 这里的“online local”表示“本地构建 + 线上运行时环境”，不是 EAS 线上正式产物；
#   - 在正式 keystore 接入前，本地产物适合本机验收/侧载，不应误称为 Play 正式签名包。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/apps/mobile"
ANDROID_DIR="${MOBILE_DIR}/android"
APK_PATH="${ANDROID_DIR}/app/build/outputs/apk/release/app-release.apk"

export JAVA_HOME="${JAVA_HOME:-/usr/local/opt/openjdk@17}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}"
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT}}"
export PATH="${JAVA_HOME}/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${PATH}"
# release APK 当前默认会回退到本地 `http://172.16.11.231:8788`；
# 这里显式注入 production 线上地址，确保本地侧载包与 EAS production_online 使用同一套移动端运行时配置。
export EXPO_PUBLIC_API_BASE_URL="https://admin.dutylix.com"
export EXPO_PUBLIC_APP_ENV="production"
export NODE_ENV="production"

run() {
  echo "+ $*"
  "$@"
}

if [[ ! -d "${ANDROID_DIR}" ]]; then
  run bash -lc "cd '${MOBILE_DIR}' && npx expo prebuild --platform android"
fi

run bash -lc "cd '${ANDROID_DIR}' && ./gradlew assembleRelease"

if [[ ! -f "${APK_PATH}" ]]; then
  echo "Expected release APK not found: ${APK_PATH}" >&2
  exit 1
fi

echo "ONLINE_RELEASE_APK=${APK_PATH}"
echo "ONLINE_RELEASE_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}"
echo "ONLINE_RELEASE_APP_ENV=${EXPO_PUBLIC_APP_ENV}"

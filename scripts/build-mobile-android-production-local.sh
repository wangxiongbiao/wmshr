#!/usr/bin/env bash
set -euo pipefail

# WMSHR 本地 Android Production 构建脚本。
# 作用：在当前机器上基于 Expo prebuild 后的原生 Android 工程，生成 release APK，
#       用于本机验收、侧载分发和与线上 EAS production 构建做结果对照。
# 前提：
#   1. 已在仓库根执行过依赖安装；
#   2. 本机已安装 JDK 17 与 Android SDK/NDK/cmake；
#   3. apps/mobile/android 已存在，或允许先通过 Expo prebuild 生成；
#   4. 当前 release 构建仍沿用 apps/mobile/android/app/build.gradle 中的 debug keystore。
# 影响：
#   1. 若 apps/mobile/android 不存在，会先执行 `npx expo prebuild --platform android` 生成原生工程；
#   2. 会产出 release APK，路径在 outputs/apk/release；
#   3. 这里的“production local”只表示本地 release 构建链路，不代表已经切到正式上架签名；
#   4. Play / 线上正式 production AAB 仍应走 `build:android:production:online` 对应的 EAS 链路。
# 失败优先检查：
#   - JAVA_HOME 是否指向 /usr/local/opt/openjdk@17；
#   - ANDROID_SDK_ROOT 下的 cmdline-tools / build-tools / ndk / cmake 是否完整；
#   - 若报签名/zipalign 问题，检查 release 变体是否仍保留当前 debug keystore 回退配置；
#   - 若将来切换正式 keystore，记得同步复核线上 EAS production profile 与这里的本地脚本。
# 边界：
#   - 本地 production 入口默认只构建 release APK，避免把本地侧载包和线上 AAB / Play 提交链路继续混在一起；
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

echo "RELEASE_APK=${APK_PATH}"

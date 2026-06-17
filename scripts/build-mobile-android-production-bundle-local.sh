#!/usr/bin/env bash
set -euo pipefail

# WMSHR 本地 Android Production AAB 构建脚本。
# 作用：在当前机器上基于 Expo prebuild 后的原生 Android 工程，生成 release AAB，
#       用于在 EAS 线上 production 上传链路受阻时，仍能产出可继续校验 / 提交 Play 的本地 production 形态。
# 前提：
#   1. 已在仓库根执行过依赖安装；
#   2. 本机已安装 JDK 17 与 Android SDK/NDK/cmake；
#   3. apps/mobile/android 已存在，或允许先通过 Expo prebuild 生成；
#   4. 当前 release 构建仍沿用 apps/mobile/android/app/build.gradle 中的 debug keystore。
# 影响：
#   1. 若 apps/mobile/android 不存在，会先执行 `npx expo prebuild --platform android` 生成原生工程；
#   2. 会产出 release AAB，路径在 outputs/bundle/release；
#   3. 这里的“production bundle local”只表示本地 release AAB 构建链路，不代表已经切到正式上架签名；
#   4. 若后续网络恢复，线上 production_online 仍应继续作为 EAS 托管构建入口。
# 失败优先检查：
#   - JAVA_HOME 是否指向 /usr/local/opt/openjdk@17；
#   - ANDROID_SDK_ROOT 下的 cmdline-tools / build-tools / ndk / cmake 是否完整；
#   - 若报签名/zipalign/bundletool 问题，检查 release 变体是否仍保留当前 debug keystore 回退配置；
#   - 若将来切换正式 keystore，记得同步复核线上 EAS production profile 与这里的本地脚本。
# 边界：
#   - 该脚本只负责 AAB，不与本地 release APK 混跑，避免一次命令把两条验收链路绑死；
#   - 在正式 keystore 接入前，本地 AAB 适合校验产物形态和后续提交流程，不应误称为已完成线上 production 发布。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/apps/mobile"
ANDROID_DIR="${MOBILE_DIR}/android"
AAB_PATH="${ANDROID_DIR}/app/build/outputs/bundle/release/app-release.aab"

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

run bash -lc "cd '${ANDROID_DIR}' && ./gradlew bundleRelease"

if [[ ! -f "${AAB_PATH}" ]]; then
  echo "Expected release AAB not found: ${AAB_PATH}" >&2
  exit 1
fi

echo "RELEASE_AAB=${AAB_PATH}"

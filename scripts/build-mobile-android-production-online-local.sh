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
# 可选：
#   - REACT_NATIVE_ARCHITECTURES=arm64-v8a 可只构建真机验证用 ABI；默认不设置时仍构建完整多 ABI 官网包。
# 影响：
#   1. 若 apps/mobile/android 不存在，会先执行 `npx expo prebuild --platform android` 生成原生工程；
#   2. 会产出 release APK，路径在 outputs/apk/release；
#   3. 该入口只改变 JS 打包阶段注入的运行时环境，不改变当前本地签名策略；
#   4. 该入口现在就是 Android 官网更新包的标准构建入口，后续发布默认与官网静态托管脚本配套使用。
# 失败优先检查：
#   - JAVA_HOME 是否指向 /usr/local/opt/openjdk@17；
#   - ANDROID_SDK_ROOT 下的 cmdline-tools / build-tools / ndk / cmake 是否完整；
#   - 若报签名/zipalign 问题，检查 release 变体是否仍保留当前 debug keystore 回退配置；
#   - 若运行后仍命中本地接口，优先核对下面两项 env 是否被后续命令覆盖。
# 边界：
#   - 这里的“online local”表示“本地构建 + 线上运行时环境”，不是远端构建产物；
#   - 在正式 keystore 接入前，本地产物适合本机验收/侧载与官网 APK 分发，不应误称为 Play 正式签名包。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/apps/mobile"
ANDROID_DIR="${MOBILE_DIR}/android"
APK_PATH="${ANDROID_DIR}/app/build/outputs/apk/release/app-release.apk"
GRADLE_ARCH_ARGS=()

export JAVA_HOME="${JAVA_HOME:-/usr/local/opt/openjdk@17}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}"
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT}}"
export PATH="${JAVA_HOME}/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${PATH}"
# release APK 当前默认会回退到本地 `http://172.16.11.231:8788`；
# 这里显式注入 production 线上地址，确保本地侧载包与 EAS production_online 使用同一套移动端运行时配置。
export EXPO_PUBLIC_API_BASE_URL="https://admin.dutylix.com"
export EXPO_PUBLIC_APP_ENV="production"
export NODE_ENV="production"

if [[ -n "${REACT_NATIVE_ARCHITECTURES:-}" ]]; then
  GRADLE_ARCH_ARGS=("-PreactNativeArchitectures=${REACT_NATIVE_ARCHITECTURES}")
fi

run() {
  echo "+ $*"
  "$@"
}

if [[ ! -d "${ANDROID_DIR}" ]]; then
  run bash -lc "cd '${MOBILE_DIR}' && npx expo prebuild --platform android"
fi

# Release 产物必须强制重跑 JS bundle 任务：这条链路会发布给官网更新接口，不能复用旧的
# assets/index.android.bundle，否则会出现 manifest/versionName 已更新但 App 内 JS 仍显示旧版本。
# 不使用全量 `gradlew clean`，因为 React Native 新架构下它会清掉 node_modules 内的 codegen JNI 目录，
# 后续 CMake 配置阶段可能报 react_codegen_* 目标缺失；也不要把 --rerun-tasks 挂到 assembleRelease，
# 否则会全量重编 native 依赖。先只重跑 bundle 任务，再让 assembleRelease 复用其余 up-to-date 产物。
run bash -lc "cd '${ANDROID_DIR}' && ./gradlew :app:createBundleReleaseJsAndAssets --rerun-tasks"
if [[ ${#GRADLE_ARCH_ARGS[@]} -gt 0 ]]; then
  run bash -lc "cd '${ANDROID_DIR}' && ./gradlew assembleRelease ${GRADLE_ARCH_ARGS[*]}"
else
  # macOS bundled Bash runs with `set -u` here; expanding an empty array inside the command string aborts after JS bundle succeeds.
  # Keep the no-architecture path explicit so full public APK builds can continue into assembleRelease and the publish step.
  run bash -lc "cd '${ANDROID_DIR}' && ./gradlew assembleRelease"
fi

if [[ ! -f "${APK_PATH}" ]]; then
  echo "Expected release APK not found: ${APK_PATH}" >&2
  exit 1
fi

echo "ONLINE_RELEASE_APK=${APK_PATH}"
echo "ONLINE_RELEASE_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}"
echo "ONLINE_RELEASE_APP_ENV=${EXPO_PUBLIC_APP_ENV}"

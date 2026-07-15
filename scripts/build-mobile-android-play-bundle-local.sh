#!/usr/bin/env bash
set -euo pipefail

# WMSHR Google Play 专用 AAB 构建脚本。
# 作用：生成提交到 Google Play 的 release AAB；构建期间临时移除 REQUEST_INSTALL_PACKAGES，
#       避免 Play Console 要求敏感权限声明，同时保留主仓库官网/侧载 APK 的自更新权限配置。
# 前提：
#   1. apps/mobile/android/keystore.properties 与 app/wmshr-upload-key.jks 已存在；
#   2. 本机已安装 JDK 17 与 Android SDK；
#   3. 当前 versionCode 129 已上传过 Play，Play 专用包默认使用 130，避免重复 versionCode。
# 影响：
#   1. 构建期间会临时改写 AndroidManifest.xml，脚本退出时自动恢复；
#   2. 会生成 Play 专用 AAB：apps/mobile/android/app/build/outputs/bundle/release/app-play-release-v<code>.aab；
#   3. 不改官网 APK 发布链路，不移除侧载包所需的 REQUEST_INSTALL_PACKAGES。
# 失败优先检查：
#   - keystore.properties 是否存在且被 .gitignore 忽略；
#   - Play Console 是否已接受更高 versionCode；
#   - 若 Google 仍提示敏感权限，检查 manifest 临时移除逻辑是否失效。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/apps/mobile"
ANDROID_DIR="${MOBILE_DIR}/android"
MANIFEST_PATH="${ANDROID_DIR}/app/src/main/AndroidManifest.xml"
KEYSTORE_PROPERTIES="${ANDROID_DIR}/keystore.properties"
VERSION_CODE="${WMSHR_PLAY_VERSION_CODE:-130}"
VERSION_NAME="${WMSHR_PLAY_VERSION_NAME:-0.1.29}"
AAB_PATH="${ANDROID_DIR}/app/build/outputs/bundle/release/app-release.aab"
PLAY_AAB_PATH="${ANDROID_DIR}/app/build/outputs/bundle/release/app-play-release-v${VERSION_CODE}.aab"
MANIFEST_BACKUP="$(mktemp -t wmshr-play-manifest.XXXXXX.xml)"

export JAVA_HOME="${JAVA_HOME:-/usr/local/opt/openjdk@17}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}"
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT}}"
export PATH="${JAVA_HOME}/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${PATH}"

cleanup() {
  if [[ -f "${MANIFEST_BACKUP}" ]]; then
    cp "${MANIFEST_BACKUP}" "${MANIFEST_PATH}"
    rm -f "${MANIFEST_BACKUP}"
  fi
}
trap cleanup EXIT

run() {
  echo "+ $*"
  "$@"
}

if [[ ! "${VERSION_CODE}" =~ ^[0-9]+$ ]]; then
  echo "Invalid WMSHR_PLAY_VERSION_CODE: ${VERSION_CODE}" >&2
  exit 2
fi

if [[ ! -f "${KEYSTORE_PROPERTIES}" ]]; then
  echo "Missing Play upload keystore properties: ${KEYSTORE_PROPERTIES}" >&2
  exit 1
fi

cp "${MANIFEST_PATH}" "${MANIFEST_BACKUP}"
python3 - "${MANIFEST_PATH}" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
text = re.sub(
    r'\n\s*<!--[^\n]*REQUEST_INSTALL_PACKAGES[^\n]*-->\s*\n\s*<uses-permission\s+android:name="android\.permission\.REQUEST_INSTALL_PACKAGES"\s*/>\s*',
    '\n',
    text,
)
text = re.sub(
    r'\n\s*<!-- 应用内更新会下载 APK 后拉起系统安装器；Android 8\+ 需要显式声明该权限，否则安装器可能瞬间返回而不展示安装流程。 -->\s*\n\s*<uses-permission\s+android:name="android\.permission\.REQUEST_INSTALL_PACKAGES"\s*/>\s*',
    '\n',
    text,
)
text = re.sub(
    r'\n\s*<uses-permission\s+android:name="android\.permission\.REQUEST_INSTALL_PACKAGES"\s*/>\s*',
    '\n',
    text,
)
if 'REQUEST_INSTALL_PACKAGES' in text:
    raise SystemExit('REQUEST_INSTALL_PACKAGES still present after manifest transform')
path.write_text(text)
PY

run bash -lc "cd '${ANDROID_DIR}' && ./gradlew bundleRelease -PwmshrVersionCodeOverride='${VERSION_CODE}' -PwmshrVersionNameOverride='${VERSION_NAME}'"

if [[ ! -f "${AAB_PATH}" ]]; then
  echo "Expected release AAB not found: ${AAB_PATH}" >&2
  exit 1
fi

cp "${AAB_PATH}" "${PLAY_AAB_PATH}"

# 复核构建产物对应的 merged manifest，避免只看源码临时改写结果。
MERGED_MANIFEST="${ANDROID_DIR}/app/build/intermediates/merged_manifest/release/processReleaseManifest/AndroidManifest.xml"
if [[ -f "${MERGED_MANIFEST}" ]] && grep -q 'REQUEST_INSTALL_PACKAGES' "${MERGED_MANIFEST}"; then
  echo "Play merged manifest still contains REQUEST_INSTALL_PACKAGES: ${MERGED_MANIFEST}" >&2
  exit 1
fi

echo "PLAY_RELEASE_AAB=${PLAY_AAB_PATH}"
echo "PLAY_VERSION_CODE=${VERSION_CODE}"

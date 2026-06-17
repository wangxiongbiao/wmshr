#!/usr/bin/env bash
set -euo pipefail

# WMSHR 本地 Android Release APK 安装脚本。
# 作用：把 apps/mobile 本地构建出来的 release APK 安装到当前已连接的安卓设备；可优先配合无线 ADB 目标使用。
# 前提：
#   1. `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` 已存在；
#   2. 目标设备已通过 USB 或 Wi‑Fi 出现在 `adb devices` 中，并处于 `device` 状态；
#   3. 若手机上存在同包名但不同签名的版本，需先手动卸载旧包。
# 影响：
#   1. 默认使用 `adb install -r` 覆盖安装同签名旧版本；
#   2. 若指定 `--target <ip:port>`，脚本只会向该设备安装，避免多设备环境误装；
#   3. 安装成功后会输出实际使用的 target 和 APK 路径。
# 失败优先检查：
#   - `adb devices -l` 里目标是否为 `device` 而非 `offline` / `unauthorized`；
#   - APK 是否已经通过 `npm run mobile:build:android:production:local` 产出；
#   - 若报 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`，先卸载手机上旧的 `com.wmshr.app`。
# 边界：
#   - 这里固定安装 release APK，不处理 AAB 或 Play 提交；
#   - 多设备同时连接时，必须显式传 `--target`，避免按自动选择规则误装到错误设备。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APK_PATH="${REPO_ROOT}/apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}"
export PATH="${ANDROID_SDK_ROOT}/platform-tools:${PATH}"

TARGET=""

usage() {
  cat <<'EOF'
Usage: bash scripts/adb-install-mobile-release.sh [options]

Options:
  --target <serial|ip:port>   指定安装目标；多设备连接时建议显式传入
  -h, --help                  显示帮助
EOF
}

trim_cr() {
  tr -d '\r'
}

run() {
  echo "+ $*"
  "$@"
}

pick_single_device_target() {
  adb devices -l | awk 'NR>1 && $2=="device" {print $1}'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found: $APK_PATH" >&2
  echo "Build it first with: npm run mobile:build:android:production:local" >&2
  exit 1
fi

if [[ -z "$TARGET" ]]; then
  device_targets=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && device_targets+=("$line")
  done < <(pick_single_device_target)
  if [[ "${#device_targets[@]}" -eq 0 ]]; then
    echo "No ready ADB device found. Run adb-connect-wifi.sh or plug in a USB device first." >&2
    exit 1
  fi
  if [[ "${#device_targets[@]}" -gt 1 ]]; then
    echo "Multiple ready ADB devices found. Re-run with --target <serial|ip:port>." >&2
    printf '%s\n' "${device_targets[@]}" >&2
    exit 1
  fi
  TARGET="${device_targets[0]}"
fi

state="$(adb -s "$TARGET" get-state 2>/dev/null || true)"
if [[ "$state" != "device" ]]; then
  echo "ADB target is not ready: $TARGET (state=${state:-unknown})" >&2
  adb devices -l >&2 || true
  exit 1
fi

run adb -s "$TARGET" install -r "$APK_PATH"
model="$(adb -s "$TARGET" shell getprop ro.product.model | trim_cr)"
echo "ADB_INSTALL_TARGET=$TARGET"
echo "ADB_INSTALL_MODEL=$model"
echo "ADB_INSTALL_APK=$APK_PATH"

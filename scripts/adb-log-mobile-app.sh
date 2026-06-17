#!/usr/bin/env bash
set -euo pipefail

# WMSHR 移动端 App 日志脚本。
# 作用：抓取或持续跟随 `com.wmshr.app` 进程日志，便于无线 ADB 调试安装后的真实运行状态。
# 前提：
#   1. 目标设备已在 `adb devices` 中处于 `device` 状态；
#   2. 目标 App 已安装，且最好先启动一次，这样能按当前 pid 精确过滤；
#   3. 若需要持续跟随，请在前台保留当前终端。
# 影响：
#   1. 默认读取最近 120 行当前进程日志；
#   2. 传 `--follow` 时会改为持续输出该进程日志，直到人工中断；
#   3. 若应用当前未运行，脚本会直接失败，避免误把整机噪音日志当成应用日志。
# 失败优先检查：
#   - 先执行移动端启动脚本，确保 `com.wmshr.app` 已运行；
#   - 若目标是 Wi‑Fi 设备，必要时先执行 `npm run mobile:adb:wifi` 重连；
#   - 如果 App 重启，pid 会变化，需要重新执行本脚本。
# 边界：
#   - 这里按当前 pid 过滤日志，适合“看本次运行”；不做历史多进程聚合；
#   - `--follow` 是长驻前台命令，不适合作为一次性静态检查结果。

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}"
export PATH="${ANDROID_SDK_ROOT}/platform-tools:${PATH}"

TARGET=""
PACKAGE_NAME="com.wmshr.app"
LINES=120
FOLLOW=0

usage() {
  cat <<'EOF'
Usage: bash scripts/adb-log-mobile-app.sh [options]

Options:
  --target <serial|ip:port>   指定日志目标；多设备连接时建议显式传入
  --package <package>         目标包名，默认 com.wmshr.app
  --lines <count>             读取最近多少行，默认 120
  --follow                    持续跟随日志（前台长驻）
  -h, --help                  显示帮助
EOF
}

run() {
  echo "+ $*" >&2
  "$@"
}

trim_cr() {
  tr -d '\r'
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
    --package)
      PACKAGE_NAME="${2:-}"
      shift 2
      ;;
    --lines)
      LINES="${2:-}"
      shift 2
      ;;
    --follow)
      FOLLOW=1
      shift
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

PID="$(adb -s "$TARGET" shell pidof "$PACKAGE_NAME" 2>/dev/null | trim_cr | awk '{print $1}')"
if [[ -z "$PID" ]]; then
  echo "Package $PACKAGE_NAME is not running on $TARGET. Launch it first." >&2
  exit 1
fi

echo "ADB_LOG_TARGET=$TARGET"
echo "ADB_LOG_PACKAGE=$PACKAGE_NAME"
echo "ADB_LOG_PID=$PID"

if [[ "$FOLLOW" == "1" ]]; then
  exec adb -s "$TARGET" logcat --pid="$PID"
fi

run adb -s "$TARGET" logcat -d --pid="$PID" -t "$LINES"

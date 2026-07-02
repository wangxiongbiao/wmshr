#!/usr/bin/env bash
set -euo pipefail

# WMSHR 移动端 App 启动脚本。
# 作用：通过 ADB 在已连接安卓设备上启动 `com.wmshr.app` 的主界面，适合 USB / Wi‑Fi 两种连接方式。
# 前提：
#   1. 目标设备已在 `adb devices` 中处于 `device` 状态；
#   2. 手机上已经安装 `com.wmshr.app`；
#   3. 多设备场景下应显式传 `--target`，避免误启动到错误设备。
# 影响：
#   1. 默认会先检查本机 Metro 8081 是否可用，并为目标设备建立 `adb reverse tcp:8081 tcp:8081`；
#   2. 若传入 `--skip-metro`，则按 release / 内嵌 JS bundle 测试路径直接启动，不要求 Metro；
#   3. 随后向目标设备发送标准 LAUNCHER 启动事件；
#   4. 默认使用项目当前包名 `com.wmshr.app`，必要时可通过参数覆盖；
#   5. 成功后会输出实际 target 与 package，便于后续串联日志脚本。
# 失败优先检查：
#   - `adb devices -l` 里目标是否为 `device`；
#   - 若目标是 Wi‑Fi 设备，必要时先执行 `npm run mobile:adb:wifi` 重新连上；
#   - 真机安装的是 debug 包时，本机需先有 Metro 在 8081 监听，否则 App 会白屏；
#   - 真机安装的是 release / 内嵌 bundle 包时，传 `--skip-metro`，避免把 release 验证误绑到 Expo/Metro；
#   - 若报包不存在，先重新安装 debug APK。
# 边界：
#   - 这里按 LAUNCHER 入口启动应用，不负责登录、导航或页面级自动化；
#   - 当前脚本默认服务本地 debug 包链路，因此会为 Metro 8081 建立 reverse；release / 内嵌 bundle 验证必须显式跳过，避免误判“本地包还在跑 Expo”；
#   - 若后续修改了 Android applicationId / launcher activity，应同步更新这里的默认包名或调用参数。

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}"
export PATH="${ANDROID_SDK_ROOT}/platform-tools:${PATH}"

TARGET=""
PACKAGE_NAME="com.wmshr.app"
SKIP_METRO=0

usage() {
  cat <<'EOF'
Usage: bash scripts/adb-launch-mobile-app.sh [options]

Options:
  --target <serial|ip:port>   指定启动目标；多设备连接时建议显式传入
  --package <package>         要启动的包名，默认 com.wmshr.app
  --skip-metro                跳过 Metro 8081 检查和 adb reverse，用于 release / 内嵌 bundle 包
  -h, --help                  显示帮助
EOF
}

run() {
  echo "+ $*"
  "$@"
}

ensure_local_metro_ready() {
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
    return 0
  fi
  if command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 8081 >/dev/null 2>&1; then
    return 0
  fi
  echo "Metro dev server is not listening on localhost:8081. Start it first (for example: npm run dev:mobile or the project's dev-service restart entry), then re-run this launch script." >&2
  exit 1
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
    --skip-metro)
      SKIP_METRO=1
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

# Debug APK 需要 Metro；release / 内嵌 bundle APK 不需要。这个分支保持默认 debug 体验不变，同时让版本更新真机验证可以走纯本地 release 包。
if [[ "$SKIP_METRO" != "1" ]]; then
  ensure_local_metro_ready
  run adb -s "$TARGET" reverse tcp:8081 tcp:8081
fi
run adb -s "$TARGET" shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1

echo "ADB_LAUNCH_TARGET=$TARGET"
echo "ADB_LAUNCH_PACKAGE=$PACKAGE_NAME"
echo "ADB_LAUNCH_SKIP_METRO=$SKIP_METRO"

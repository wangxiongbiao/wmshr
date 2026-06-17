#!/usr/bin/env bash
set -euo pipefail

# WMSHR Android 无线 ADB 连接脚本。
# 作用：优先通过 Android 11+「无线调试 / Wireless debugging」的 mDNS TLS 服务自动连接；
#       若当前只有 USB 调试，则回退为传统 `adb tcpip <port>` 模式，把 USB 设备切到 ADB over Wi‑Fi。
# 前提：
#   1. 本机已安装 Android platform-tools，且能执行 adb；
#   2. 手机与电脑位于同一局域网；
#   3. 若使用传统回退模式，首次切换到 Wi‑Fi 时手机仍需先通过 USB 授权一次 ADB。
# 影响：
#   1. 若检测到无线调试 mDNS 服务，脚本会直接连接系统广播出来的 TLS 端口；
#   2. 若没有 mDNS 服务但有 USB 设备，脚本会执行 `adb tcpip <port>` 并重连；
#   3. 脚本会主动断开同目标的旧无线连接并重连，避免 lingering offline session 误导后续安装与日志命令；
#   4. 成功后会输出 `ADB_WIFI_TARGET=<ip:port>`，供其他脚本或人工复制使用。
# 失败优先检查：
#   - 手机是否开启“无线调试 / Wireless debugging”或至少保持 USB 调试授权；
#   - 手机和电脑是否在同一 Wi‑Fi / 网段；
#   - 手机切到 Wi‑Fi 后的 IP / 连接端口是否变化；
#   - `adb mdns services` 是否已发现 `_adb-tls-connect._tcp` 服务；
#   - `adb devices -l` 是否只剩 offline 设备而没有可用 USB 设备。
# 边界：
#   - Android 重启、切网、关闭无线调试后，通常需要重新执行一次本脚本；
#   - 传统回退模式默认使用 5555 端口，若设备 ROM 对端口有限制，可通过 `--port` 覆盖。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}"
export PATH="${ANDROID_SDK_ROOT}/platform-tools:${PATH}"

PORT=5555
DEVICE_IP=""
USB_SERIAL=""

usage() {
  cat <<'EOF'
Usage: bash scripts/adb-connect-wifi.sh [options]

Options:
  --ip <ipv4>        已知手机 Wi‑Fi IP；传入后可在无 USB 的情况下直接重连
  --serial <serial>  指定 USB 设备 serial；默认自动选择唯一的 USB device
  --port <port>      ADB TCP 端口，默认 5555
  -h, --help         显示帮助
EOF
}

run() {
  echo "+ $*"
  "$@"
}

trim_cr() {
  tr -d '\r'
}

get_single_usb_serial() {
  adb devices -l | awk 'NR>1 && $2=="device" && $0 ~ /usb:/ {print $1}'
}

get_mdns_tls_target() {
  adb mdns services 2>/dev/null \
    | awk '$2=="_adb-tls-connect._tcp" {print $3; exit}'
}

get_device_ip_over_usb() {
  local serial="$1"
  adb -s "$serial" shell ip -f inet addr show wlan0 \
    | trim_cr \
    | awk '/inet / {print $2}' \
    | cut -d/ -f1 \
    | head -n1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip)
      DEVICE_IP="${2:-}"
      shift 2
      ;;
    --serial)
      USB_SERIAL="${2:-}"
      shift 2
      ;;
    --port)
      PORT="${2:-}"
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

TARGET=""

if [[ -z "$DEVICE_IP" && -z "$USB_SERIAL" ]]; then
  TARGET="$(get_mdns_tls_target)"
fi

if [[ -z "$TARGET" ]]; then
  if [[ -z "$DEVICE_IP" ]]; then
    if [[ -z "$USB_SERIAL" ]]; then
      usb_serials=()
      while IFS= read -r line; do
        [[ -n "$line" ]] && usb_serials+=("$line")
      done < <(get_single_usb_serial)
      if [[ "${#usb_serials[@]}" -eq 0 ]]; then
        echo "No wireless-debugging mDNS target or USB-connected ADB device found. Enable Wireless debugging, or reconnect USB once, or pass --ip to reconnect an existing Wi‑Fi target." >&2
        exit 1
      fi
      if [[ "${#usb_serials[@]}" -gt 1 ]]; then
        echo "Multiple USB ADB devices found. Re-run with --serial <serial>." >&2
        printf '%s\n' "${usb_serials[@]}" >&2
        exit 1
      fi
      USB_SERIAL="${usb_serials[0]}"
    fi

    DEVICE_IP="$(get_device_ip_over_usb "$USB_SERIAL")"
    if [[ -z "$DEVICE_IP" ]]; then
      echo "Failed to detect wlan0 IPv4 from USB device $USB_SERIAL. Ensure the phone is on Wi‑Fi." >&2
      exit 1
    fi

    run adb -s "$USB_SERIAL" tcpip "$PORT"
    sleep 2
  fi

  TARGET="${DEVICE_IP}:${PORT}"
fi
# 先断开旧连接，避免已有 offline 记录继续占位，让后续 get-state 误判。
run adb disconnect "$TARGET" >/dev/null 2>&1 || true
run adb connect "$TARGET"

for _ in 1 2 3 4 5; do
  state="$(adb -s "$TARGET" get-state 2>/dev/null || true)"
  if [[ "$state" == "device" ]]; then
    model="$(adb -s "$TARGET" shell getprop ro.product.model | trim_cr)"
    echo "ADB_WIFI_TARGET=$TARGET"
    echo "ADB_WIFI_MODEL=$model"
    exit 0
  fi
  sleep 1
done

echo "ADB Wi‑Fi connect did not reach device state for $TARGET." >&2
if [[ -z "$USB_SERIAL" ]]; then
  echo "Hint: the phone is reachable by IP but is not currently listening on ADB TCP. Reconnect USB once and rerun this script without --ip, or re-enable wireless debugging / adb tcpip on the phone first." >&2
fi
adb devices -l >&2 || true
exit 1

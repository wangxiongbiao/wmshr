#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.dev-logs"
PID_DIR="$LOG_DIR/pids"
TMUX_ADMIN_API_SESSION="wmshr-admin-api"
TMUX_ADMIN_WEB_SESSION="wmshr-admin-web"
TMUX_HOME_WEB_SESSION="wmshr-home-web"
TMUX_EXPO_SESSION="wmshr-mobile-expo"
mkdir -p "$LOG_DIR" "$PID_DIR"

# 这个脚本只管理 WMSHR 本地开发服务；端口来自各 workspace 的固定启动入口。
# 如需调整端口，先同步对应 package/server/vite 配置，再改这里的 PORTS 和启动命令，避免误杀其他项目进程。
PORTS=(3000 3001 8788 8081 19000 19001 19002)

echo "[restart] project: $ROOT_DIR"

stop_pid_files() {
  for pid_file in "$PID_DIR"/*.pid; do
    [[ -e "$pid_file" ]] || continue
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "[stop] pid $pid from $(basename "$pid_file")"
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  done

  if command -v tmux >/dev/null 2>&1; then
    tmux kill-session -t "$TMUX_ADMIN_API_SESSION" 2>/dev/null || true
    tmux kill-session -t "$TMUX_ADMIN_WEB_SESSION" 2>/dev/null || true
    tmux kill-session -t "$TMUX_HOME_WEB_SESSION" 2>/dev/null || true
    tmux kill-session -t "$TMUX_EXPO_SESSION" 2>/dev/null || true
  fi
}

stop_ports() {
  for port in "${PORTS[@]}"; do
    local pids
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    [[ -n "$pids" ]] || continue
    echo "[stop] port $port -> $pids"
    # 端口占用是开发服务重启的唯一外部清理依据；不按 node 进程名批量杀，避免误伤编辑器 LSP/CodeGraph。
    kill $pids 2>/dev/null || true
  done
}

wait_stopped() {
  sleep 1
  for port in "${PORTS[@]}"; do
    local pids
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    [[ -n "$pids" ]] || continue
    echo "[stop] force port $port -> $pids"
    kill -9 $pids 2>/dev/null || true
  done
}

start_service() {
  local name="$1"
  local command="$2"
  local log_file="$LOG_DIR/$name.log"
  echo "[start] $name -> $log_file"
  nohup bash -lc "
    cd \"$ROOT_DIR\"
    exec bash -lc \"$command\"
  " >"$log_file" 2>&1 < /dev/null &
  echo $! >"$PID_DIR/$name.pid"
}

start_tmux_service() {
  local name="$1"
  local session_name="$2"
  local command="$3"
  local log_file="$LOG_DIR/$name.log"

  if ! command -v tmux >/dev/null 2>&1; then
    echo "[error] tmux is required for $name but was not found"
    return 1
  fi

  echo "[start] $name (tmux:$session_name) -> $log_file"
  : >"$log_file"
  tmux kill-session -t "$session_name" 2>/dev/null || true
  tmux new-session -d -s "$session_name" "cd \"$ROOT_DIR\" && exec bash -lc '$command'"
}

tmux_session_for_service() {
  case "$1" in
    admin-api) echo "$TMUX_ADMIN_API_SESSION" ;;
    admin-web) echo "$TMUX_ADMIN_WEB_SESSION" ;;
    home-web) echo "$TMUX_HOME_WEB_SESSION" ;;
    mobile-expo) echo "$TMUX_EXPO_SESSION" ;;
    *) echo "" ;;
  esac
}

wait_port() {
  local name="$1"
  local port="$2"
  local log_file="$LOG_DIR/$name.log"
  local tmux_session
  tmux_session="$(tmux_session_for_service "$name")"
  for _ in {1..60}; do
    if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "[ready] $name listening on $port"
      return 0
    fi
    if [[ -n "$tmux_session" ]] && command -v tmux >/dev/null 2>&1 && ! tmux has-session -t "$tmux_session" 2>/dev/null; then
      echo "[error] $name exited early; tail log:"
      tail -n 60 "$log_file" || true
      return 1
    fi
    if [[ -f "$PID_DIR/$name.pid" ]] && ! kill -0 "$(cat "$PID_DIR/$name.pid")" 2>/dev/null; then
      echo "[error] $name exited early; tail log:"
      tail -n 60 "$log_file" || true
      return 1
    fi
    sleep 1
  done
  echo "[error] $name not listening on $port; tail log:"
  tail -n 60 "$log_file" || true
  return 1
}

wait_http_local() {
  local name="$1"
  local host="$2"
  local port="$3"
  local path="$4"
  local log_file="$LOG_DIR/$name.log"

  wait_port "$name" "$port"

  for _ in {1..60}; do
    if python3 - "$host" "$port" "$path" <<'PY' >/dev/null 2>&1
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])
path = sys.argv[3]

with socket.create_connection((host, port), timeout=2) as sock:
    request = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host}:{port}\r\n"
        "Connection: close\r\n\r\n"
    ).encode()
    sock.sendall(request)
    response = sock.recv(4096)

if b" 200 " not in response.split(b"\r\n", 1)[0]:
    raise SystemExit(1)
PY
    then
      echo "[ready] $name http://$host:$port$path"
      return 0
    fi

    if [[ -f "$PID_DIR/$name.pid" ]] && ! kill -0 "$(cat "$PID_DIR/$name.pid")" 2>/dev/null; then
      echo "[error] $name exited before http check passed; tail log:"
      tail -n 60 "$log_file" || true
      return 1
    fi

    sleep 1
  done

  echo "[error] $name http://$host:$port$path not ready; tail log:"
  tail -n 60 "$log_file" || true
  return 1
}

stop_pid_files
stop_ports
wait_stopped

# Admin API、Admin Web、门户和员工移动端分别独立启动，便于单独看日志和定位端口冲突。
# Vite、Admin API 与 Expo CLI 都需要稳定驻留；在当前桌面环境里，nohup 后台托管会出现“短暂可用后静默退出”，统一改用 tmux 托管避免验证窗口内服务消失。
start_tmux_service "admin-api" "$TMUX_ADMIN_API_SESSION" "npm --workspace @wmshr/admin run start:api | tee \"$LOG_DIR/admin-api.log\""
start_tmux_service "admin-web" "$TMUX_ADMIN_WEB_SESSION" "npm run dev:admin | tee \"$LOG_DIR/admin-web.log\""
start_tmux_service "home-web" "$TMUX_HOME_WEB_SESSION" "npm run dev:home | tee \"$LOG_DIR/home-web.log\""
# Expo CLI 在 nohup/无 TTY 场景下经常“看起来启动成功、随后静默退出”；改用独立 tmux session 托管，避免改完代码后员工端调试服务反复断开。
start_tmux_service "mobile-expo" "$TMUX_EXPO_SESSION" "cd apps/mobile && EXPO_NO_TELEMETRY=1 npx expo start --host lan --clear | tee \"$LOG_DIR/mobile-expo.log\""

wait_http_local "admin-api" "127.0.0.1" "8788" "/api/health"
wait_http_local "admin-web" "127.0.0.1" "3000" "/"
wait_http_local "home-web" "127.0.0.1" "3001" "/"

# Expo/Metro 没有稳定的 HTTP 健康端点；以 8081 监听作为本地员工端调试服务已启动的验收标准。
wait_port "mobile-expo" 8081

echo "[done] logs: $LOG_DIR"

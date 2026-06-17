#!/usr/bin/env bash
set -euo pipefail

# 这个脚本用于启动 admin-v3 的本地 Vite 开发服务。
# 前提：当前机器已安装 Node.js / npm；首次运行会在缺少 node_modules 时自动执行 npm install。
# 影响：会启动一个长期运行的前端开发进程；若 3000 端口已被占用，Vite 会自动尝试 3001+。
# 失败时优先检查：1) Node/npm 是否可用；2) admin-v3/package.json 是否存在；3) 端口是否被其它服务长期占用。
# 边界：这里保持与本次已验证成功的真实命令一致，继续复用 package.json 中的 npm run dev，不在脚本里改写 Vite 参数。

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/admin-v3"

cd "$APP_DIR"

if [ ! -d node_modules ]; then
  npm install
fi

exec npm run dev

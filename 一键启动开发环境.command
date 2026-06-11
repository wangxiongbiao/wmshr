#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR"

echo "== WMSHR 一键启动开发环境 =="
echo "项目目录: $ROOT_DIR"
echo

npm run restart:dev

echo
echo "启动完成，按回车关闭窗口..."
read -r

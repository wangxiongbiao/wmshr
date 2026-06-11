#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR"

echo "== WMSHR 一键发布生产环境 =="
echo "项目目录: $ROOT_DIR"
echo

npm run deploy:prod "$@"

echo
echo "发布完成，按回车关闭窗口..."
read -r

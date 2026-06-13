#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_PATH="${REPO_ROOT}/apps/mobile/google-service-account.json"

SOURCE_FILE=""
BASE64_VALUE="${GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64:-}"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: npm run mobile:setup:google-play-key -- [options]

Options:
  --file <path>         从现有 JSON 文件安装 Google Play service account key
  --base64 <value>      直接传入 base64 编码后的 JSON 内容
  --dry-run             只检查输入，不写入目标文件
  -h, --help            显示帮助

也支持直接通过环境变量提供：
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64
EOF
}

validate_json_file() {
  local json_path="$1"
  python3 - "$json_path" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
data = json.loads(path.read_text())

required = ["type", "client_email", "private_key"]
missing = [key for key in required if not data.get(key)]
if missing:
    raise SystemExit(f"Missing required keys: {', '.join(missing)}")

if data.get("type") != "service_account":
    raise SystemExit("JSON is not a Google service account key")

print(data["client_email"])
PY
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      SOURCE_FILE="${2:-}"
      shift 2
      ;;
    --base64)
      BASE64_VALUE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
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

if [[ -z "${SOURCE_FILE}" && -z "${BASE64_VALUE}" ]]; then
  echo "Please provide --file, --base64, or GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64." >&2
  exit 2
fi

tmp_file="$(mktemp -t wmshr-google-play-key.XXXXXX.json)"
trap 'rm -f "$tmp_file"' EXIT

if [[ -n "${SOURCE_FILE}" ]]; then
  if [[ ! -f "${SOURCE_FILE}" ]]; then
    echo "File not found: ${SOURCE_FILE}" >&2
    exit 2
  fi
  cp "${SOURCE_FILE}" "${tmp_file}"
else
  printf '%s' "${BASE64_VALUE}" | base64 --decode >"${tmp_file}"
fi

client_email="$(validate_json_file "${tmp_file}")"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "[dry-run] validated Google Play service account key"
  echo "[dry-run] client_email=${client_email}"
  echo "[dry-run] target=${TARGET_PATH}"
  exit 0
fi

install -m 600 "${tmp_file}" "${TARGET_PATH}"

echo "Installed Google Play service account key:"
echo "  client_email: ${client_email}"
echo "  target: ${TARGET_PATH}"

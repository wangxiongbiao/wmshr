#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/apps/mobile"
KEY_PATH="${MOBILE_DIR}/google-service-account.json"

TRACK="production"
SKIP_LINT=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: npm run mobile:release:android:play -- [options]

Options:
  --track <production|internal>
                        指定提交轨道，默认 production
  --skip-lint           跳过移动端 TypeScript 校验
  --dry-run             只检查环境并输出将执行的命令
  -h, --help            显示帮助

前提：
  1. 已执行 npm run mobile:setup:google-play-key 或手动放置 key 文件
  2. 已登录 Expo / EAS
  3. Google Play Console 已给 service account 邮箱授予应用发布权限
EOF
}

validate_key() {
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
    --track)
      TRACK="${2:-}"
      shift 2
      ;;
    --skip-lint)
      SKIP_LINT=1
      shift
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

if [[ "${TRACK}" != "production" && "${TRACK}" != "internal" ]]; then
  echo "Unsupported --track: ${TRACK}. Expected production or internal." >&2
  exit 2
fi

if [[ ! -f "${KEY_PATH}" ]]; then
  echo "Missing ${KEY_PATH}" >&2
  echo "Run: npm run mobile:setup:google-play-key -- --file /path/to/your-service-account.json" >&2
  exit 1
fi

client_email="$(validate_key "${KEY_PATH}")"

if [[ "${TRACK}" == "internal" ]]; then
  release_script="release:android:internal"
else
  release_script="release:android:production"
fi

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "[dry-run] track=${TRACK}"
  echo "[dry-run] client_email=${client_email}"
  echo "[dry-run] key=${KEY_PATH}"
  if [[ "${SKIP_LINT}" != "1" ]]; then
    echo "[dry-run] would run: npm --workspace @wmshr/mobile run lint"
  fi
  echo "[dry-run] would run: npm --workspace @wmshr/mobile run ${release_script}"
  exit 0
fi

(
  cd "${MOBILE_DIR}"
  HOME="${HOME}" npx eas-cli whoami >/dev/null
)

if [[ "${SKIP_LINT}" != "1" ]]; then
  npm --workspace @wmshr/mobile run lint
fi

echo "Using Google Play service account: ${client_email}"
echo "Submitting Android build to Play track: ${TRACK}"

npm --workspace @wmshr/mobile run "${release_script}"

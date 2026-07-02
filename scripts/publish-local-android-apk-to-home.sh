#!/usr/bin/env bash
set -euo pipefail

# Publish a locally-built Android APK through the portal's static hosting so the
# mobile update API can point at a first-party anonymous download URL published by
# the portal's own static hosting.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOME_VERCEL_PROJECT="dutylix"
HOME_CUSTOM_DOMAIN="dutylix.com"
HOME_CUSTOM_ORIGIN="https://${HOME_CUSTOM_DOMAIN}"
DEFAULT_CONTENT="例行更新，修复已知问题并优化使用体验"
APK_PATH=""
VERSION=""
CONTENT="$DEFAULT_CONTENT"

usage() {
  cat <<'EOF'
Usage: npm run mobile:publish:android:local-to-home -- --apk <path> --version <version> [--content <text>]

Required:
  --apk <path>         Absolute or relative path to the local APK file.
  --version <version>  App version to publish, e.g. 0.1.25.

Optional:
  --content <text>     Release notes shown by the update API.

What this does:
  1. Stages the APK under apps/home/public/downloads/
  2. Builds the portal locally to verify the static file is emitted
  3. Deploys only the portal to the dutylix Vercel project
  4. Verifies https://dutylix.com/downloads/<apk> is publicly reachable
  5. Updates public.mobile_app_releases to point at that first-party URL
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apk)
      APK_PATH="${2:-}"
      shift 2
      ;;
    --version)
      VERSION="${2:-}"
      shift 2
      ;;
    --content)
      CONTENT="${2:-}"
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

if [[ -z "$APK_PATH" || -z "$VERSION" ]]; then
  usage >&2
  exit 2
fi

if ! command -v vercel >/dev/null 2>&1 && [[ -x "$HOME/.npm-global/bin/vercel" ]]; then
  export PATH="$HOME/.npm-global/bin:$PATH"
fi

for cmd in npm node python3 curl vercel; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: $cmd" >&2
    exit 127
  fi
done

assert_apk_response() {
  local url="$1"
  local label="$2"
  local expected_size="${3:-}"
  local expected_disposition_substring="${4:-}"
  local header_file body_file
  header_file="$(mktemp -t wmshr-apk-head.XXXXXX)"
  body_file="$(mktemp -t wmshr-apk-body.XXXXXX)"

  curl -sI -L --connect-timeout 10 --max-time 30 "$url" > "$header_file"
  python3 - "$header_file" "$label" "$expected_size" "$expected_disposition_substring" <<'PY'
import sys
from pathlib import Path

header_path, label, expected_size_raw, expected_disposition = sys.argv[1:5]
text = Path(header_path).read_text(errors="ignore").replace("\r\n", "\n")
blocks = [block.strip() for block in text.split("\n\n") if block.strip()]
if not blocks:
    raise SystemExit(f"{label}: missing response headers")
lines = blocks[-1].split("\n")
status_line = lines[0].strip()
parts = status_line.split()
if len(parts) < 2 or not parts[1].isdigit():
    raise SystemExit(f"{label}: unexpected status line {status_line!r}")
status = int(parts[1])
if status != 200:
    raise SystemExit(f"{label}: expected HTTP 200, got {status}")
headers = {}
for line in lines[1:]:
    if ":" not in line:
        continue
    key, value = line.split(":", 1)
    headers[key.strip().lower()] = value.strip()
content_type = headers.get("content-type", "")
if "text/html" in content_type.lower():
    raise SystemExit(f"{label}: upstream returned HTML instead of APK ({content_type})")
content_length = headers.get("content-length", "")
if expected_size_raw:
    expected_size = int(expected_size_raw)
    if not content_length:
        raise SystemExit(f"{label}: missing content-length, expected {expected_size}")
    if int(content_length) != expected_size:
        raise SystemExit(f"{label}: content-length mismatch, got {content_length}, expected {expected_size}")
elif content_length and int(content_length) < 1024 * 1024:
    raise SystemExit(f"{label}: content-length too small for APK ({content_length})")
if expected_disposition and expected_disposition not in headers.get("content-disposition", ""):
    raise SystemExit(
        f"{label}: content-disposition {headers.get('content-disposition', '')!r} missing {expected_disposition!r}"
    )
PY

  curl -L -s --connect-timeout 10 --max-time 30 --range 0-3 -o "$body_file" "$url"
  python3 - "$body_file" "$label" <<'PY'
import sys
from pathlib import Path

body_path, label = sys.argv[1:3]
data = Path(body_path).read_bytes()
if data[:4] != b"PK\x03\x04":
    raise SystemExit(f"{label}: first four bytes are {data[:4]!r}, expected APK/ZIP signature PK\\x03\\x04")
PY

  rm -f "$header_file" "$body_file"
}

APK_ABS="$(python3 - "$APK_PATH" <<'PY'
import sys
from pathlib import Path
print(Path(sys.argv[1]).expanduser().resolve())
PY
)"

if [[ ! -f "$APK_ABS" ]]; then
  echo "APK file not found: $APK_ABS" >&2
  exit 1
fi

APK_NAME="wmshr-android-${VERSION}.apk"
STAGED_APK="${REPO_ROOT}/apps/home/public/downloads/${APK_NAME}"
DIST_APK="${REPO_ROOT}/apps/home/dist/downloads/${APK_NAME}"
LOCAL_APK_SIZE="$(stat -f '%z' "$APK_ABS")"
DEPLOY_LOG="$(mktemp -t wmshr-home-apk-deploy.XXXXXX.log)"
VERCEL_BACKUP="$(mktemp -t wmshr-home-vercel-config.XXXXXX.json)"

cleanup() {
  rm -f "$STAGED_APK"
  if [[ -f "$VERCEL_BACKUP" ]]; then
    cp "$VERCEL_BACKUP" "${REPO_ROOT}/vercel.json"
    rm -f "$VERCEL_BACKUP"
  fi
}
trap cleanup EXIT

mkdir -p "$(dirname "$STAGED_APK")"
cp "$APK_ABS" "$STAGED_APK"

pushd "$REPO_ROOT" >/dev/null
npm --workspace @wmshr/home run build
if [[ ! -f "$DIST_APK" ]]; then
  echo "Portal build did not emit expected APK asset: $DIST_APK" >&2
  exit 1
fi

cp "${REPO_ROOT}/vercel.json" "$VERCEL_BACKUP"
cat >"${REPO_ROOT}/vercel.json" <<'JSON'
{
  "buildCommand": "npm --workspace @wmshr/home run build",
  "outputDirectory": "apps/home/dist",
  "installCommand": "npm install --include=optional",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/[...path].js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
JSON

# Deploy from the monorepo root so the portal keeps resolving @wmshr/i18n as a
# workspace package; only vercel.json is swapped temporarily.
vercel deploy "$REPO_ROOT" --prod --yes --project "$HOME_VERCEL_PROJECT" | tee "$DEPLOY_LOG"
cp "$VERCEL_BACKUP" "${REPO_ROOT}/vercel.json"
rm -f "$VERCEL_BACKUP"

APK_URL="${HOME_CUSTOM_ORIGIN}/downloads/${APK_NAME}"
# 门户静态 APK 如果只校验 200，会把 Vercel SPA fallback 的 index.html 当成“发布成功”；
# 这里必须同时校验头部与 ZIP magic，避免后续官网下载重新回成 html 还继续写入数据库版本记录。
assert_apk_response "$APK_URL" "Published portal APK URL" "$LOCAL_APK_SIZE"

node "${REPO_ROOT}/scripts/update-mobile-android-release.mjs" \
  --version "$VERSION" \
  --content "$CONTENT" \
  --url "$APK_URL"

API_JSON="$(curl -fsS --connect-timeout 10 --max-time 30 https://admin.dutylix.com/api/public/mobile-app-update)"
if [[ -z "$API_JSON" ]]; then
  echo "Update API returned empty body." >&2
  exit 1
fi
python3 - "$VERSION" "$APK_URL" "$API_JSON" <<'PY'
import json, sys
payload = json.loads(sys.argv[3])
expected_version, expected_url = sys.argv[1], sys.argv[2]
if payload.get('version') != expected_version or payload.get('url') != expected_url:
    raise SystemExit(f"Update API mismatch: {payload}")
PY

assert_apk_response \
  "${HOME_CUSTOM_ORIGIN}/api/public/mobile-app-download" \
  "Published portal download proxy" \
  "$LOCAL_APK_SIZE" \
  "wms-${VERSION}.apk"

popd >/dev/null

echo "Published APK URL: $APK_URL"
echo "Update API JSON: $API_JSON"

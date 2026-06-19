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
HTTP_STATUS="$(curl -I -L -s -o /tmp/wmshr-home-apk-head.txt -w '%{http_code}' "$APK_URL")"
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "Published APK URL did not return HTTP 200: $APK_URL (got $HTTP_STATUS)" >&2
  exit 1
fi

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

popd >/dev/null

echo "Published APK URL: $APK_URL"
echo "Update API JSON: $API_JSON"

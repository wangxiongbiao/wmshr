#!/usr/bin/env bash
set -euo pipefail

# Publish a locally-built Android APK to GitHub Releases and point the public
# mobile update record at that release asset. GitHub is now the durable APK host;
# Vercel only serves the website and may redirect download requests to GitHub.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEFAULT_CONTENT="例行更新，修复已知问题并优化使用体验"
DEFAULT_REPO="wangxiongbiao/wmshr"
APK_PATH=""
VERSION=""
CONTENT="$DEFAULT_CONTENT"
GITHUB_REPO="$DEFAULT_REPO"
TAG_PREFIX="android-"

usage() {
  cat <<'EOF'
Usage: npm run mobile:publish:android:github -- --apk <path> --version <version> [--content <text>]

Required:
  --apk <path>         Absolute or relative path to the local APK file.
  --version <version>  App version to publish, e.g. 0.1.29.

Optional:
  --content <text>     Release notes shown by the update API.
  --repo <owner/repo>  GitHub repo for the release asset. Default: wangxiongbiao/wmshr.

What this does:
  1. Verifies the local file is an APK/ZIP payload.
  2. Creates or updates GitHub Release android-<version>.
  3. Uploads wmshr-android-<version>.apk as the release asset.
  4. Updates public.mobile_app_releases to the GitHub asset URL.
  5. Verifies GitHub, admin proxy, portal proxy, and update API responses.
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
    --repo)
      GITHUB_REPO="${2:-}"
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

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid --version: ${VERSION}. Expected x.y.z" >&2
  exit 2
fi

for cmd in node python3 curl gh shasum; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: $cmd" >&2
    exit 127
  fi
done

if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated for github.com. Run: gh auth login" >&2
  exit 1
fi

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
RELEASE_TAG="${TAG_PREFIX}${VERSION}"
RELEASE_URL="https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${APK_NAME}"
TMP_APK="$(mktemp -t "wmshr-android-${VERSION}.XXXXXX.apk")"
LOCAL_APK_SIZE="$(stat -f '%z' "$APK_ABS")"
LOCAL_APK_SHA256="$(shasum -a 256 "$APK_ABS" | awk '{print $1}')"

cleanup() {
  rm -f "$TMP_APK"
}
trap cleanup EXIT

cp "$APK_ABS" "$TMP_APK"

python3 - "$TMP_APK" <<'PY'
import sys
from pathlib import Path

apk_path = Path(sys.argv[1])
if apk_path.read_bytes()[:4] != b"PK\x03\x04":
    raise SystemExit(f"{apk_path}: first four bytes are not APK/ZIP signature PK\\x03\\x04")
PY

assert_apk_response() {
  local url="$1"
  local label="$2"
  local expected_size="${3:-}"
  local header_file body_file
  header_file="$(mktemp -t wmshr-apk-head.XXXXXX)"
  body_file="$(mktemp -t wmshr-apk-body.XXXXXX)"

  curl --noproxy '*' -sI -L --connect-timeout 10 --max-time 30 "$url" > "$header_file"
  python3 - "$header_file" "$label" "$expected_size" <<'PY'
import sys
from pathlib import Path

header_path, label, expected_size_raw = sys.argv[1:4]
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
PY

  curl --noproxy '*' -L -s --connect-timeout 10 --max-time 30 --range 0-3 -o "$body_file" "$url"
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

assert_update_api() {
  local url="$1"
  local label="$2"
  local payload
  payload="$(curl --noproxy '*' -fsS --connect-timeout 10 --max-time 30 "$url")"
  python3 - "$VERSION" "$RELEASE_URL" "$payload" "$label" <<'PY'
import json
import sys

expected_version, expected_url, payload_raw, label = sys.argv[1:5]
payload = json.loads(payload_raw)
if payload.get("version") != expected_version or payload.get("url") != expected_url:
    raise SystemExit(f"{label}: update API mismatch: {payload}")
PY
}

cd "$REPO_ROOT"

if gh release view "$RELEASE_TAG" --repo "$GITHUB_REPO" >/dev/null 2>&1; then
  gh release upload "$RELEASE_TAG" "$TMP_APK#${APK_NAME}" --repo "$GITHUB_REPO" --clobber
else
  gh release create "$RELEASE_TAG" "$TMP_APK#${APK_NAME}" \
    --repo "$GITHUB_REPO" \
    --target main \
    --title "WMSHR Android ${VERSION}" \
    --notes "Android APK ${VERSION}

SHA-256: ${LOCAL_APK_SHA256}"
fi

assert_apk_response "$RELEASE_URL" "GitHub release APK" "$LOCAL_APK_SIZE"

node "${REPO_ROOT}/scripts/update-mobile-android-release.mjs" \
  --version "$VERSION" \
  --content "$CONTENT" \
  --url "$RELEASE_URL"

assert_update_api "https://admin.dutylix.com/api/public/mobile-app-update" "Admin update API"
assert_apk_response "https://admin.dutylix.com/api/public/mobile-app-download" "Admin download proxy" "$LOCAL_APK_SIZE"
assert_update_api "https://dutylix.com/api/public/mobile-app-update" "Portal update API"
assert_apk_response "https://dutylix.com/api/public/mobile-app-download" "Portal download proxy" "$LOCAL_APK_SIZE"

echo "Published APK URL: $RELEASE_URL"
echo "APK size: $LOCAL_APK_SIZE"
echo "SHA-256: $LOCAL_APK_SHA256"

#!/usr/bin/env bash
set -euo pipefail

# WMSHR Android 一键本地发布脚本。
# 作用：统一完成移动端版本号落盘、TypeScript 校验、本地 production-online release APK 构建，
#       并把 APK 通过 dutylix.com 静态托管发布到官网更新接口。
# 前提：
#   1. 当前仓库依赖 apps/mobile 的 Expo prebuild + 原生 Android 工程；
#   2. 本机已具备 JDK 17 与 Android SDK/NDK/cmake；
#   3. apps/admin/.env 中已配置可写 mobile_app_releases 的 Supabase service role；
#   4. 当前环境已具备 Vercel CLI 登录态，且可发布 dutylix 门户项目。
# 影响：
#   1. 会修改 apps/mobile/app.json、apps/mobile/package.json 与 android/app/build.gradle 中的版本号；
#   2. 会在当前机器执行 release APK 构建；
#   3. 构建成功后会重新部署官网门户，并把数据库中的最新 Android 版本记录更新为本次 APK 地址。
# 失败优先检查：
#   - JAVA_HOME 是否指向 /usr/local/opt/openjdk@17；
#   - ANDROID_SDK_ROOT 下的 cmdline-tools / build-tools / ndk / cmake 是否完整；
#   - `HOME=/Users/admin npm --workspace @wmshr/mobile run lint` 是否通过；
#   - `HOME=/Users/admin bash -lc 'vercel whoami'` 是否已登录；
#   - apps/admin/.env 的 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 是否可用。
# 边界：
#   - 门户与 App 更新弹窗共用数据库里的“当前最新 Android 包”单条记录；不要在这里扩展成历史版本列表，除非先同步前后端数据模型；
#   - 这里默认发布的是“本地构建 + 官网静态托管”的匿名可下载 APK，不再依赖 EAS artifact 或 private GitHub release 资产。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/apps/mobile"
APP_JSON_PATH="${MOBILE_DIR}/app.json"
MOBILE_PACKAGE_JSON_PATH="${MOBILE_DIR}/package.json"
ANDROID_BUILD_GRADLE_PATH="${MOBILE_DIR}/android/app/build.gradle"
LOCAL_APK_PATH="${MOBILE_DIR}/android/app/build/outputs/apk/release/app-release.apk"

VERSION=""
CONTENT=""
DRY_RUN=0
SKIP_LINT=0
CURRENT_VERSION=""

usage() {
  cat <<'EOF'
Usage: npm run mobile:release:android -- [options]

Auto defaults when omitted:
  --version              默认读取当前 apps/mobile 版本号并自动补丁位 +1
  --content              默认生成通用版本介绍：例行更新，修复已知问题并优化使用体验

Options:
  --version <value>      新版本号；会同步写入 apps/mobile/app.json、apps/mobile/package.json、android/app/build.gradle
  --content <value>      版本介绍；发布成功后写入 public.mobile_app_releases.content
  --skip-lint            跳过移动端 TypeScript 校验
  --dry-run              只输出即将执行的步骤，不改文件、不构建、不发布官网
  -h, --help             显示帮助
EOF
}

validate_version() {
  local value="$1"
  if [[ ! "${value}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Invalid --version: ${value}. Expected x.y.z" >&2
    exit 2
  fi
}

read_current_mobile_version() {
  python3 - "$APP_JSON_PATH" <<'PY'
import json
import sys
from pathlib import Path

app_json = json.loads(Path(sys.argv[1]).read_text())
expo = app_json.get("expo") or {}
version = expo.get("version", "") if isinstance(expo, dict) else ""
print(version)
PY
}

bump_patch_version() {
  local value="$1"
  python3 - "$value" <<'PY'
import re
import sys

value = sys.argv[1]
match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", value)
if not match:
    raise SystemExit(f"Invalid current version: {value}")
major, minor, patch = map(int, match.groups())
print(f"{major}.{minor}.{patch + 1}")
PY
}

build_default_content() {
  printf '%s' '例行更新，修复已知问题并优化使用体验'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="${2:-}"
      shift 2
      ;;
    --content)
      CONTENT="${2:-}"
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

CURRENT_VERSION="$(read_current_mobile_version)"
validate_version "${CURRENT_VERSION}"

if [[ -z "${VERSION}" ]]; then
  VERSION="$(bump_patch_version "${CURRENT_VERSION}")"
fi

if [[ -z "${CONTENT}" ]]; then
  CONTENT="$(build_default_content)"
fi

validate_version "${VERSION}"

run() {
  echo "+ $*"
  "$@"
}

update_mobile_version_files() {
  local next_version="$1"
  python3 - "$APP_JSON_PATH" "$MOBILE_PACKAGE_JSON_PATH" "$ANDROID_BUILD_GRADLE_PATH" "$next_version" <<'PY'
import json
import re
import sys
from pathlib import Path

app_json_path = Path(sys.argv[1])
package_json_path = Path(sys.argv[2])
build_gradle_path = Path(sys.argv[3])
next_version = sys.argv[4]

app_json = json.loads(app_json_path.read_text())
package_json = json.loads(package_json_path.read_text())
build_gradle = build_gradle_path.read_text()

major, minor, patch = [int(part) for part in next_version.split('.')]
version_code = major * 10000 + minor * 100 + patch

expo = app_json.get("expo") or {}
if not isinstance(expo, dict):
    raise SystemExit("apps/mobile/app.json missing expo object")
expo["version"] = next_version
app_json["expo"] = expo
package_json["version"] = next_version

if not re.search(r'^\s*versionCode\s+\d+\s*$', build_gradle, flags=re.MULTILINE):
    raise SystemExit("apps/mobile/android/app/build.gradle missing versionCode")
if not re.search(r'^\s*versionName\s+"[^"]+"\s*$', build_gradle, flags=re.MULTILINE):
    raise SystemExit("apps/mobile/android/app/build.gradle missing versionName")

build_gradle = re.sub(
    r'^(\s*versionCode\s+)\d+(\s*)$',
    rf'\g<1>{version_code}\2',
    build_gradle,
    count=1,
    flags=re.MULTILINE,
)
build_gradle = re.sub(
    r'^(\s*versionName\s+")[^"]+("\s*)$',
    rf'\g<1>{next_version}\2',
    build_gradle,
    count=1,
    flags=re.MULTILINE,
)

app_json_path.write_text(json.dumps(app_json, ensure_ascii=False, indent=2) + "\n")
package_json_path.write_text(json.dumps(package_json, ensure_ascii=False, indent=2) + "\n")
build_gradle_path.write_text(build_gradle)
PY
}

main() {
  cd "${REPO_ROOT}"

  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] current_version=${CURRENT_VERSION}"
    echo "[dry-run] version=${VERSION}"
    echo "[dry-run] content=${CONTENT}"
    echo "[dry-run] would update: ${APP_JSON_PATH}"
    echo "[dry-run] would update: ${MOBILE_PACKAGE_JSON_PATH}"
    echo "[dry-run] would update: ${ANDROID_BUILD_GRADLE_PATH}"
    if [[ "${SKIP_LINT}" != "1" ]]; then
      echo "[dry-run] would run: npm --workspace @wmshr/mobile run lint"
    fi
    echo "[dry-run] would run: npm --workspace @wmshr/mobile run build:android:production:online:local"
    echo "[dry-run] would run: bash scripts/publish-local-android-apk-to-home.sh --apk '${LOCAL_APK_PATH}' --version '${VERSION}' --content '${CONTENT}'"
    exit 0
  fi

  update_mobile_version_files "${VERSION}"

  if [[ "${SKIP_LINT}" != "1" ]]; then
    run npm --workspace @wmshr/mobile run lint
  fi

  run npm --workspace @wmshr/mobile run build:android:production:online:local

  if [[ ! -f "${LOCAL_APK_PATH}" ]]; then
    echo "Expected local release APK not found: ${LOCAL_APK_PATH}" >&2
    exit 1
  fi

  run bash "${REPO_ROOT}/scripts/publish-local-android-apk-to-home.sh" \
    --apk "${LOCAL_APK_PATH}" \
    --version "${VERSION}" \
    --content "${CONTENT}"

  echo "== Android local release completed =="
  echo "Version: ${VERSION}"
  echo "APK: ${LOCAL_APK_PATH}"
  echo "Published URL: https://dutylix.com/downloads/wmshr-android-${VERSION}.apk"
}

main "$@"

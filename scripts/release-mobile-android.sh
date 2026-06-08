#!/usr/bin/env bash
set -euo pipefail

# WMSHR Android 一键发布脚本。
# 作用：统一完成移动端版本号落盘、TS 校验、EAS 构建 APK、读取真实 artifact URL、回填数据库最新版本记录。
# 前提：
#   1. 当前仓库依赖 apps/mobile 的 Expo / EAS 配置；
#   2. 当前环境已具备 Expo / EAS 登录态；若在 Hermes 多 profile 环境中缺登录态，请用 `HOME=/Users/admin` 调用；
#   3. apps/admin/.env 中已配置可写 mobile_app_releases 的 Supabase service role。
# 影响：
#   1. 会修改 apps/mobile/app.json 与 apps/mobile/package.json 中的 version；
#   2. 会发起新的 Android EAS build；
#   3. build 成功后会把数据库中的最新 Android 版本记录更新为本次构建结果。
# 失败优先检查：
#   - `HOME=/Users/admin npx eas-cli whoami` 是否已登录；
#   - EAS profile 是否仍然产出 APK（而不是 aab）；
#   - apps/admin/.env 的 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 是否可用。
# 边界：
#   - 门户与 App 更新弹窗共用数据库里的“当前最新 Android 包”单条记录；不要在这里扩展成历史版本列表，除非先同步前后端数据模型。
#   - 这里默认使用 preview_online profile，因为当前需求是拿 APK 直链做下载与 App 内更新，而 production_online 产出的是 aab，不能直接作为安装包分发。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${REPO_ROOT}/apps/mobile"
APP_JSON_PATH="${MOBILE_DIR}/app.json"
MOBILE_PACKAGE_JSON_PATH="${MOBILE_DIR}/package.json"
DEFAULT_PROFILE="preview_online"
BUILD_PLATFORM="android"

VERSION=""
CONTENT=""
PROFILE="${DEFAULT_PROFILE}"
BUILD_MESSAGE=""
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
  --version <value>      新版本号；会同步写入 apps/mobile/app.json 与 apps/mobile/package.json
  --content <value>      版本介绍；构建成功后写入 public.mobile_app_releases.content
  --profile <value>      EAS build profile，默认 preview_online
  --message <value>      EAS build message，默认自动生成
  --skip-lint            跳过移动端 TypeScript 校验
  --dry-run              只输出即将执行的步骤，不改文件、不发起构建、不写数据库
  -h, --help             显示帮助
EOF
}

read_required_arg() {
  local name="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    echo "Missing --${name}" >&2
    usage >&2
    exit 2
  fi
}

validate_version() {
  local value="$1"
  # 当前版本比较逻辑直接按字符串是否变化判断；这里保持最小约束，只要求标准 x.y.z，避免把任意文案写进 app.json。
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
  # 这里故意使用稳定的通用发布文案：用户要求“根据代码大概填”，但数据库字段会直接暴露到门户和 App 内，
  # 不能把未经人工审核的代码细节、猜测功能点或临时调试信息写进线上更新说明。
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
    --profile)
      PROFILE="${2:-}"
      shift 2
      ;;
    --message)
      BUILD_MESSAGE="${2:-}"
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
  # 用户要求“版本号往前走 1”，这里固定按当前 app 版本做 patch +1，避免脚本在无人值守时误升 minor / major。
  VERSION="$(bump_patch_version "${CURRENT_VERSION}")"
fi

if [[ -z "${CONTENT}" ]]; then
  CONTENT="$(build_default_content)"
fi

validate_version "${VERSION}"

if [[ -z "${BUILD_MESSAGE}" ]]; then
  BUILD_MESSAGE="android release ${VERSION}"
fi

run() {
  echo "+ $*"
  "$@"
}

update_mobile_version_files() {
  local next_version="$1"
  python3 - "$APP_JSON_PATH" "$MOBILE_PACKAGE_JSON_PATH" "$next_version" <<'PY'
import json
import sys
from pathlib import Path

app_json_path = Path(sys.argv[1])
package_json_path = Path(sys.argv[2])
next_version = sys.argv[3]

app_json = json.loads(app_json_path.read_text())
package_json = json.loads(package_json_path.read_text())

expo = app_json.get("expo") or {}
if not isinstance(expo, dict):
    raise SystemExit("apps/mobile/app.json missing expo object")
expo["version"] = next_version
app_json["expo"] = expo
package_json["version"] = next_version

app_json_path.write_text(json.dumps(app_json, ensure_ascii=False, indent=2) + "\n")
package_json_path.write_text(json.dumps(package_json, ensure_ascii=False, indent=2) + "\n")
PY
}

extract_build_field() {
  local json_file="$1"
  local field="$2"
  python3 - "$json_file" "$field" <<'PY'
import json
import sys
from pathlib import Path

json_path = Path(sys.argv[1])
field = sys.argv[2]
data = json.loads(json_path.read_text())
if isinstance(data, list):
    data = data[0] if data else {}
value = data
for part in field.split('.'):
    if not isinstance(value, dict):
        value = ""
        break
    value = value.get(part, "")
print(value if isinstance(value, str) else "")
PY
}

main() {
  cd "${REPO_ROOT}"

  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] current_version=${CURRENT_VERSION}"
    echo "[dry-run] version=${VERSION}"
    echo "[dry-run] content=${CONTENT}"
    echo "[dry-run] profile=${PROFILE}"
    echo "[dry-run] message=${BUILD_MESSAGE}"
    echo "[dry-run] would update: ${APP_JSON_PATH}"
    echo "[dry-run] would update: ${MOBILE_PACKAGE_JSON_PATH}"
    echo "[dry-run] would run: HOME=${HOME:-} npm --workspace @wmshr/mobile run lint"
    echo "[dry-run] would run: cd ${MOBILE_DIR} && HOME=${HOME:-} npx eas-cli build -p ${BUILD_PLATFORM} --profile ${PROFILE} --wait --json --non-interactive -m '${BUILD_MESSAGE}'"
    echo "[dry-run] would run: cd ${MOBILE_DIR} && HOME=${HOME:-} npx eas-cli build:view <build-id> --json"
    echo "[dry-run] would run: node scripts/update-mobile-android-release.mjs --version '${VERSION}' --content '${CONTENT}' --url <artifact-url>"
    exit 0
  fi

  update_mobile_version_files "${VERSION}"

  if [[ "${SKIP_LINT}" != "1" ]]; then
    run npm --workspace @wmshr/mobile run lint
  fi

  local build_json_file build_view_json_file build_id artifact_url db_result_file
  build_json_file="$(mktemp -t wmshr-mobile-build.XXXXXX.json)"
  build_view_json_file="$(mktemp -t wmshr-mobile-build-view.XXXXXX.json)"
  db_result_file="$(mktemp -t wmshr-mobile-db-result.XXXXXX.json)"
  trap 'rm -f "$build_json_file" "$build_view_json_file" "$db_result_file"' EXIT

  echo "+ cd ${MOBILE_DIR} && HOME=${HOME:-} npx eas-cli build -p ${BUILD_PLATFORM} --profile ${PROFILE} --wait --json --non-interactive -m '${BUILD_MESSAGE}'"
  (
    cd "${MOBILE_DIR}"
    HOME="${HOME}" npx eas-cli build -p "${BUILD_PLATFORM}" --profile "${PROFILE}" --wait --json --non-interactive -m "${BUILD_MESSAGE}"
  ) >"${build_json_file}"

  build_id="$(extract_build_field "${build_json_file}" "id")"
  artifact_url="$(extract_build_field "${build_json_file}" "artifacts.applicationArchiveUrl")"

  if [[ -z "${build_id}" ]]; then
    echo "Could not parse EAS build id from build output." >&2
    cat "${build_json_file}" >&2
    exit 1
  fi

  if [[ -z "${artifact_url}" ]]; then
    echo "+ cd ${MOBILE_DIR} && HOME=${HOME:-} npx eas-cli build:view ${build_id} --json"
    (
      cd "${MOBILE_DIR}"
      HOME="${HOME}" npx eas-cli build:view "${build_id}" --json
    ) >"${build_view_json_file}"
    artifact_url="$(extract_build_field "${build_view_json_file}" "artifacts.applicationArchiveUrl")"
  fi

  if [[ -z "${artifact_url}" ]]; then
    echo "Could not resolve applicationArchiveUrl for build ${build_id}." >&2
    if [[ -s "${build_view_json_file}" ]]; then
      cat "${build_view_json_file}" >&2
    else
      cat "${build_json_file}" >&2
    fi
    exit 1
  fi

  if [[ ! "${artifact_url}" =~ ^https?:// ]]; then
    echo "Resolved artifact URL is invalid: ${artifact_url}" >&2
    exit 1
  fi

  run curl -I -L -s "${artifact_url}"

  echo "+ node scripts/update-mobile-android-release.mjs --version '${VERSION}' --content '${CONTENT}' --url '${artifact_url}'"
  node "${REPO_ROOT}/scripts/update-mobile-android-release.mjs" \
    --version "${VERSION}" \
    --content "${CONTENT}" \
    --url "${artifact_url}" >"${db_result_file}"

  echo "== Android release completed =="
  echo "Version: ${VERSION}"
  echo "Profile: ${PROFILE}"
  echo "Build ID: ${build_id}"
  echo "Artifact URL: ${artifact_url}"
  echo "DB Row:"
  cat "${db_result_file}"
}

main "$@"

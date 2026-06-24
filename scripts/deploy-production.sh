#!/usr/bin/env bash
set -euo pipefail

# WMSHR / Dutylix production release script.
# Keep this file aligned with the deployment runbook in the Hermes github-operations skill:
# root vercel.json builds apps/admin. The portal must still be deployed from the
# monorepo root because it imports the private workspace package @wmshr/i18n; use
# a temporary portal Vercel config during that one step so dutylix.com never gets
# the admin build.
#
# Vercel upload context guard:
# a real production incident showed that deploying the monorepo root without a
# maintained `.vercelignore` can upload local-only heavy directories (`.git`,
# `node_modules`, `release`, `.vercel`, `.dev-logs`, `.codegraph`, etc.), which
# pushed the upload context to 2.4GB and failed with `File size limit exceeded`.
# When this script changes deploy inputs, keep `.vercelignore` in sync so root
# deploys stay small and production release failures do not recur.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_MANAGER_DIR="/Users/admin/Desktop/GitHub-Project-Manager"
PROJECT_RECORD="${PROJECT_MANAGER_DIR}/public/data/projects/wangxiongbiao-wmshr.json"
PROJECT_INDEX="${PROJECT_MANAGER_DIR}/public/data/project-index.json"
CUSTOM_DOMAIN="admin.dutylix.com"
CUSTOM_ORIGIN="https://${CUSTOM_DOMAIN}"
HOME_APP_DIR="${REPO_ROOT}/apps/home"
HOME_VERCEL_PROJECT="dutylix"
HOME_CUSTOM_DOMAIN="dutylix.com"
HOME_CUSTOM_ORIGIN="https://${HOME_CUSTOM_DOMAIN}"
PROTECTED_CHECK_URL="${CUSTOM_ORIGIN}/api/admin/employees"
HEALTH_URL="${CUSTOM_ORIGIN}/api/health"
GOOGLE_AUTH_URL="${CUSTOM_ORIGIN}/api/public/google-auth-url?redirectTo=https%3A%2F%2Fadmin.dutylix.com"
RUN_DB_PUSH=1
RUN_PROJECT_MANAGER_LOG=1
COMMIT_MESSAGE="release production $(date -u +%Y-%m-%dT%H:%M:%SZ)"
# Production verification talks to freshly-updated custom domains over the public
# internet. Keep a small retry budget here so one transient TLS/connect failure
# does not force a full re-deploy after the actual release already succeeded.
HTTP_CHECK_MAX_ATTEMPTS=3
HTTP_CHECK_RETRY_DELAY_SECONDS=2
VERCEL_BIN=""

usage() {
  cat <<'EOF'
Usage: npm run deploy:prod -- [options]

Options:
  -m, --message <text>   Commit message used when the working tree has changes.
  --no-db                Skip `supabase db push`.
  --no-project-log       Skip GitHub-Project-Manager usage log update.
  -h, --help             Show this help.

Default flow:
  lint/build/diff-check/test -> optional Supabase db push -> commit if dirty -> push main ->
  Vercel prod deploy admin + portal -> alias custom domains -> verify production endpoints/assets -> update project log.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      COMMIT_MESSAGE="${2:-}"
      if [[ -z "${COMMIT_MESSAGE}" ]]; then
        echo "Missing value for $1" >&2
        exit 2
      fi
      shift 2
      ;;
    --no-db)
      RUN_DB_PUSH=0
      shift
      ;;
    --no-project-log)
      RUN_PROJECT_MANAGER_LOG=0
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

run() {
  echo "+ $*"
  "$@"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 127
  fi
}

resolve_vercel_bin() {
  # Hermes/local shells do not always inherit the user's global npm bin in PATH.
  # Prefer the machine-verified CLI location first so one-key release keeps working
  # even when `command -v vercel` would fail in the current session.
  local candidate
  for candidate in \
    "/Users/admin/.npm-global/bin/vercel" \
    "${HOME:-}/.npm-global/bin/vercel"
  do
    if [[ -x "$candidate" ]]; then
      VERCEL_BIN="$candidate"
      return 0
    fi
  done

  if command -v vercel >/dev/null 2>&1; then
    VERCEL_BIN="$(command -v vercel)"
    return 0
  fi

  echo "Vercel CLI not found. Expected /Users/admin/.npm-global/bin/vercel or a vercel binary on PATH." >&2
  exit 127
}

run_vercel() {
  echo "+ ${VERCEL_BIN} $*"
  "$VERCEL_BIN" "$@"
}

assert_vercel_auth() {
  # Fail early with an actionable auth message before git push / deploy / alias steps.
  # This avoids half-finished release attempts when the CLI binary exists but the
  # cached access token has expired and must be refreshed or re-logged.
  local whoami_output
  set +e
  whoami_output="$($VERCEL_BIN whoami 2>&1)"
  local whoami_status=$?
  set -e
  if [[ "$whoami_status" != "0" ]]; then
    echo "Vercel CLI authentication check failed via ${VERCEL_BIN}." >&2
    echo "$whoami_output" >&2
    echo "If the CLI path is correct but auth expired, refresh the local auth file or run '${VERCEL_BIN} login' under HOME=/Users/admin before retrying release." >&2
    exit "$whoami_status"
  fi
  echo "Vercel authenticated as: $whoami_output"
}

download_with_retry() {
  local url="$1"
  local output_file="$2"
  local curl_exit=0
  local attempt

  for ((attempt=1; attempt<=HTTP_CHECK_MAX_ATTEMPTS; attempt++)); do
    if curl -L -s --connect-timeout 10 --max-time 30 -o "$output_file" "$url"; then
      return 0
    fi
    curl_exit=$?
    if (( attempt == HTTP_CHECK_MAX_ATTEMPTS )); then
      echo "curl failed for $url after ${HTTP_CHECK_MAX_ATTEMPTS} attempts (last exit: $curl_exit)." >&2
      return "$curl_exit"
    fi
    echo "Transient curl failure for $url (attempt ${attempt}/${HTTP_CHECK_MAX_ATTEMPTS}, exit $curl_exit); retrying in ${HTTP_CHECK_RETRY_DELAY_SECONDS}s." >&2
    sleep "$HTTP_CHECK_RETRY_DELAY_SECONDS"
  done
}


assert_vercel_config() {
  local config_path="$1"
  local expected_app="$2"

  # This is the release script's hard stop against the previous incident: the
  # repository root is normally an admin Vercel project, while portal deploys use
  # a temporary root config. Never deploy until the active config matches the app.
  python3 - "$config_path" "$expected_app" <<'PY'
import json
import sys
from pathlib import Path

config_path = Path(sys.argv[1])
expected_app = sys.argv[2]
config = json.loads(config_path.read_text())
build = config.get("buildCommand", "")
output = config.get("outputDirectory", "")

expected = {
    "admin": ("@wmshr/admin", "apps/admin/dist"),
    "home": ("@wmshr/home", "apps/home/dist"),
}[expected_app]

if expected[0] not in build or output != expected[1]:
    raise SystemExit(
        f"Unsafe Vercel config for {expected_app}: "
        f"buildCommand={build!r}, outputDirectory={output!r}. "
        "Stop before this can alias the wrong app to a production domain."
    )
PY
}

assert_deployment_url() {
  local app="$1"
  local deployment_url="$2"

  # Alias safety is intentionally based on the generated deployment hostname,
  # not on Vercel's Ready status or shared page title. dutylix.com must never be
  # pointed at a dutylix-admin-* deployment, and admin must never be pointed at a
  # plain dutylix-* portal deployment.
  case "$app:$deployment_url" in
    admin:https://dutylix-admin-*-wang-lins-projects.vercel.app)
      return 0
      ;;
    home:https://dutylix-admin-*)
      echo "Refusing to alias admin deployment to portal domain: $deployment_url" >&2
      exit 1
      ;;
    home:https://dutylix-*-wang-lins-projects.vercel.app)
      return 0
      ;;
    *)
      echo "Unexpected $app deployment URL: $deployment_url" >&2
      exit 1
      ;;
  esac
}

extract_deployment_url() {
  # Vercel CLI prints several URLs; the generated production URL is the one under wang-lins-projects.vercel.app.
  # Keep this parser narrow so we never alias the Inspect URL or the custom domain by mistake.
  grep -Eo 'https://dutylix-admin-[^[:space:]]+-wang-lins-projects\.vercel\.app' "$1" | tail -n 1
}

extract_home_deployment_url() {
  # The monorepo root is linked to dutylix-admin, so the portal deploy is parsed separately
  # from the explicit apps/home Vercel project to avoid aliasing the admin deployment to dutylix.com.
  grep -Eo 'https://dutylix-[^[:space:]]+-wang-lins-projects\.vercel\.app' "$1" | tail -n 1
}

verify_http_status() {
  local url="$1"
  local expected="$2"
  local actual
  local curl_exit=0
  local attempt

  for ((attempt=1; attempt<=HTTP_CHECK_MAX_ATTEMPTS; attempt++)); do
    set +e
    actual="$(curl -L -s --connect-timeout 10 --max-time 30 -o /tmp/wmshr_deploy_check_body.txt -w '%{http_code}' "$url")"
    curl_exit=$?
    set -e

    if [[ "$curl_exit" == "0" ]]; then
      if [[ "$actual" == "$expected" ]]; then
        return 0
      fi
      echo "Unexpected HTTP status for $url: got $actual, expected $expected" >&2
      echo "Response body:" >&2
      sed -n '1,40p' /tmp/wmshr_deploy_check_body.txt >&2
      exit 1
    fi

    if (( attempt == HTTP_CHECK_MAX_ATTEMPTS )); then
      echo "curl failed for $url after ${HTTP_CHECK_MAX_ATTEMPTS} attempts (last exit: $curl_exit)." >&2
      exit "$curl_exit"
    fi

    echo "Transient curl failure for $url (attempt ${attempt}/${HTTP_CHECK_MAX_ATTEMPTS}, exit $curl_exit); retrying in ${HTTP_CHECK_RETRY_DELAY_SECONDS}s." >&2
    sleep "$HTTP_CHECK_RETRY_DELAY_SECONDS"
  done
}

verify_home_production() {
  local html_file bundle_path bundle_file
  html_file="$(mktemp -t wmshr-home-html.XXXXXX)"
  bundle_file="$(mktemp -t wmshr-home-bundle.XXXXXX.js)"

  echo "== Portal production verification =="
  verify_http_status "$HOME_CUSTOM_ORIGIN" "200"
  verify_http_status "${HOME_CUSTOM_ORIGIN}/favicon.ico" "200"
  verify_http_status "${HOME_CUSTOM_ORIGIN}/dutylix-icon.svg" "200"
  # 门户生产环境同样通过根目录 /api/[...path].js 暴露 JSON 健康接口；这里只校验该地址可用，
  # 真正区分门户/后台仍依赖首页 HTML 和实际静态 bundle 内容，避免把当前部署结构误判为后台站点。
  verify_http_status "${HOME_CUSTOM_ORIGIN}/api/health" "200"

  download_with_retry "$HOME_CUSTOM_ORIGIN" "$html_file"
  # The portal is a SPA; visible CTA text lives in the emitted JS bundle rather than index.html.
  # Keep this verification tied to the real production asset so a stale custom-domain alias fails the release.
  bundle_path="$(python3 - "$html_file" <<'PY'
import re
import sys
from pathlib import Path

html = Path(sys.argv[1]).read_text(errors="ignore")
matches = re.findall(r'src="([^"]*/assets/index-[^"]+\.js)"', html)
if not matches:
    raise SystemExit("Could not find portal JS bundle in production HTML")
print(matches[-1])
PY
)"
  download_with_retry "${HOME_CUSTOM_ORIGIN}${bundle_path}" "$bundle_file"
  if ! grep -q 'Use Now' "$bundle_file" || ! grep -q '立即使用' "$bundle_file"; then
    echo "Portal bundle did not contain expected CTA text." >&2
    exit 1
  fi
  if grep -Eq 'Login with Google|谷歌登录' "$bundle_file"; then
    echo "Portal bundle still contains removed Google-login CTA text." >&2
    exit 1
  fi
}

deploy_home_production() {
  local home_deploy_log="$1"
  local admin_config_backup deploy_status
  admin_config_backup="$(mktemp -t wmshr-admin-vercel-config.XXXXXX.json)"

  # Vercel only receives one root vercel.json during a monorepo root deploy.
  # The admin config is restored through a RETURN trap even when the portal deploy
  # fails; leaving a portal config at the root would make the next admin release
  # publish the wrong app.
  # Keep `.vercelignore` aligned with the root deploy inputs here: the portal
  # deploy intentionally runs from REPO_ROOT, so any large local artifact not
  # excluded by `.vercelignore` will be uploaded before Vercel even starts the
  # remote build, and can fail the release on upload size alone.
  assert_vercel_config "${REPO_ROOT}/vercel.json" admin
  cp "${REPO_ROOT}/vercel.json" "$admin_config_backup"
  trap 'cp "$admin_config_backup" "${REPO_ROOT}/vercel.json"; rm -f "$admin_config_backup"; trap - RETURN' RETURN

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
  assert_vercel_config "${REPO_ROOT}/vercel.json" home

  echo "+ ${VERCEL_BIN} deploy ${REPO_ROOT} --prod --yes --project ${HOME_VERCEL_PROJECT}"
  # Deploy from the monorepo root so @wmshr/i18n resolves as a workspace package.
  # The temporary root config above forces this deploy to build apps/home, not admin.
  set +e
  "$VERCEL_BIN" deploy "$REPO_ROOT" --prod --yes --project "$HOME_VERCEL_PROJECT" | tee "$home_deploy_log"
  deploy_status=${PIPESTATUS[0]}
  set -e

  cp "$admin_config_backup" "${REPO_ROOT}/vercel.json"
  rm -f "$admin_config_backup"
  trap - RETURN
  assert_vercel_config "${REPO_ROOT}/vercel.json" admin
  return "$deploy_status"
}

update_project_manager_log() {
  local head_sha="$1"
  local deployment_url="$2"
  local home_deployment_url="$3"
  local now
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  if [[ ! -f "$PROJECT_RECORD" || ! -f "$PROJECT_INDEX" ]]; then
    echo "Project manager files not found; skip usage log update." >&2
    return 0
  fi

  # GitHub 项目发布属于实际使用记录；这里同步项目详情和索引，避免下次复盘时只看到 Git/Vercel 状态却缺少发布过程。
  python3 - "$PROJECT_RECORD" "$PROJECT_INDEX" "$now" "$head_sha" "$deployment_url" "$home_deployment_url" <<'PY'
import json
import sys
from pathlib import Path

project_path = Path(sys.argv[1])
index_path = Path(sys.argv[2])
now = sys.argv[3]
head_sha = sys.argv[4]
deployment_url = sys.argv[5]
home_deployment_url = sys.argv[6]

project = json.loads(project_path.read_text())
log = {
    "usedAt": now,
    "task": "一键发布 WMSHR / Dutylix admin 与门户到正式环境",
    "usageType": "自动化发布、数据库迁移、GitHub 推送、Vercel 生产部署、自定义域名验证、门户资源验证",
    "process": "通过 scripts/deploy-production.sh 执行 lint/build/diff check/考勤测试、可选 Supabase db push、git commit/push、admin Vercel 生产部署、apps/home 显式部署到 dutylix 项目、两个正式域名 alias 与线上验证。",
    "result": f"发布脚本执行成功。GitHub main HEAD 为 {head_sha}；admin 部署 URL 为 {deployment_url}；门户部署 URL 为 {home_deployment_url}；admin.dutylix.com 与 dutylix.com 已完成线上验证。",
    "extractedOrIntegrated": "使用仓库根 vercel.json 的 apps/admin 构建配置、apps/home 门户构建配置、Supabase 迁移目录、Vercel dutylix-admin/dutylix 项目以及 admin.dutylix.com/dutylix.com 生产域名。",
    "successCriteria": "lint/build/diff check/考勤测试通过；GitHub main 推送成功；两个 Vercel Production Ready；admin.dutylix.com 页面、health、未登录保护接口和 Google auth URL 验证通过；dutylix.com 首页、favicon、dutylix-icon.svg 与 SPA CTA bundle 验证通过。",
    "pitfalls": "Vercel CLI 默认 alias 可能不是目标自定义域名，脚本必须显式 vercel alias set；仓库根绑定 dutylix-admin，门户必须在 apps/home 中显式 --project dutylix 发布；发布脚本默认提交当前工作树全部改动，执行前应确认 git status 中没有无关文件。",
    "nextActions": "如需业务端到端验收，打开 dutylix.com 检查门户按钮跳转，再登录 admin.dutylix.com 检查薪资列表、工资条生成和员工端账号登录。",
}
project.setdefault("usageLogs", []).append(log)
project["usageLogCount"] = len(project["usageLogs"])
project["updatedAt"] = now
project["notes"] = "本机实际业务项目；apps/admin 部署到 Vercel 项目 dutylix-admin / admin.dutylix.com；apps/home 门户部署到 Vercel 项目 dutylix / dutylix.com；支持 scripts/deploy-production.sh 一键发布 admin 与门户。"
project_path.write_text(json.dumps(project, ensure_ascii=False, indent=2) + "\n")

index = json.loads(index_path.read_text())
for item in index:
    if item.get("slug") == "wangxiongbiao-wmshr":
        item["notes"] = project["notes"]
        item["usageLogCount"] = project["usageLogCount"]
        item["updatedAt"] = now
        break
else:
    raise SystemExit("wmshr index entry not found")
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
PY

  run python3 -m json.tool "$PROJECT_RECORD" >/dev/null
  run python3 -m json.tool "$PROJECT_INDEX" >/dev/null
  if [[ -d "$PROJECT_MANAGER_DIR" ]]; then
    # 项目管理系统记录更新后必须构建一次，确保 JSON 结构仍能被前端正常加载。
    run npm --prefix "$PROJECT_MANAGER_DIR" run build
  fi
}

main() {
  cd "$REPO_ROOT"

  require_command git
  require_command npm
  require_command node
  require_command curl
  if [[ "$RUN_DB_PUSH" == "1" ]]; then
    require_command supabase
  fi

  resolve_vercel_bin
  assert_vercel_auth

  local branch
  branch="$(git branch --show-current)"
  if [[ "$branch" != "main" ]]; then
    echo "Release must run on main, current branch: $branch" >&2
    exit 1
  fi

  assert_vercel_config "${REPO_ROOT}/vercel.json" admin

  echo "== WMSHR production release =="
  echo "Repo: $REPO_ROOT"
  echo "Domain: $CUSTOM_ORIGIN"
  echo
  run git status --short --branch

  run npm run lint
  run npm run build
  run git diff --check
  if [[ -f apps/admin/server/attendance-v2.test.mjs ]]; then
    run node apps/admin/server/attendance-v2.test.mjs
  fi

  if [[ "$RUN_DB_PUSH" == "1" ]]; then
    # Use the Supabase CLI's own non-interactive flag instead of piping `yes`.
    # With `set -o pipefail`, `yes | supabase db push` can exit 141 after Supabase
    # closes stdin successfully, which must not abort an otherwise successful release.
    echo "+ supabase db push --yes"
    supabase db push --yes
    run supabase migration list --linked
  else
    echo "Skip Supabase db push (--no-db)."
  fi

  run git fetch origin main
  local local_head remote_head
  local_head="$(git rev-parse HEAD)"
  remote_head="$(git rev-parse origin/main)"
  if ! git merge-base --is-ancestor "$remote_head" "$local_head"; then
    echo "origin/main is not an ancestor of local HEAD; pull/rebase before release." >&2
    echo "local HEAD:  $local_head" >&2
    echo "origin/main: $remote_head" >&2
    exit 1
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    # One-key release intentionally commits the current working tree. Check the status printed above before running the script.
    run git add -A
    run git commit -m "$COMMIT_MESSAGE"
  else
    echo "No local changes to commit."
  fi

  run git push origin main
  local head_sha
  head_sha="$(git rev-parse HEAD)"

  local deploy_log deployment_url
  deploy_log="$(mktemp -t wmshr-vercel-deploy.XXXXXX.log)"
  echo "+ ${VERCEL_BIN} deploy --prod --yes"
  "$VERCEL_BIN" deploy --prod --yes | tee "$deploy_log"
  deployment_url="$(extract_deployment_url "$deploy_log")"
  if [[ -z "$deployment_url" ]]; then
    echo "Could not parse Vercel production deployment URL from $deploy_log" >&2
    exit 1
  fi
  assert_deployment_url admin "$deployment_url"

  run_vercel alias set "$deployment_url" "$CUSTOM_DOMAIN"

  echo "== Production verification =="
  verify_http_status "$CUSTOM_ORIGIN" "200"
  local admin_html_file
  admin_html_file="$(mktemp -t wmshr-admin-html.XXXXXX)"
  download_with_retry "$CUSTOM_ORIGIN" "$admin_html_file"
  if ! grep -Eq 'Dutylix Admin|DUTYLIX考勤与薪资自动运行' "$admin_html_file"; then
    echo "Production page did not contain expected Dutylix marker." >&2
    exit 1
  fi
  verify_http_status "$HEALTH_URL" "200"
  if ! curl -s "$HEALTH_URL" | grep -q '"ok":true'; then
    echo "Health endpoint did not return ok:true." >&2
    exit 1
  fi
  verify_http_status "$PROTECTED_CHECK_URL" "401"
  verify_http_status "$GOOGLE_AUTH_URL" "200"

  local home_deploy_log home_deployment_url
  home_deploy_log="$(mktemp -t wmshr-home-vercel-deploy.XXXXXX.log)"
  deploy_home_production "$home_deploy_log"
  home_deployment_url="$(extract_home_deployment_url "$home_deploy_log")"
  if [[ -z "$home_deployment_url" ]]; then
    echo "Could not parse portal Vercel production deployment URL from $home_deploy_log" >&2
    exit 1
  fi
  assert_deployment_url home "$home_deployment_url"
  run_vercel alias set "$home_deployment_url" "$HOME_CUSTOM_DOMAIN"
  verify_home_production

  if [[ "$RUN_PROJECT_MANAGER_LOG" == "1" ]]; then
    update_project_manager_log "$head_sha" "$deployment_url" "$home_deployment_url"
  else
    echo "Skip GitHub-Project-Manager usage log (--no-project-log)."
  fi

  echo
  echo "Release completed."
  echo "HEAD: $head_sha"
  echo "Admin deployment: $deployment_url"
  echo "Admin production: $CUSTOM_ORIGIN"
  echo "Portal deployment: $home_deployment_url"
  echo "Portal production: $HOME_CUSTOM_ORIGIN"
}

main "$@"

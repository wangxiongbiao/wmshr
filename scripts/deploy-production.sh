#!/usr/bin/env bash
set -euo pipefail

# WMSHR / Dutylix admin production release script.
# Keep this file aligned with the deployment runbook in the Hermes github-operations skill:
# root vercel.json builds apps/admin, production custom domain is admin.dutylix.com,
# and post-release verification must test the custom domain instead of only the generated Vercel URL.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_MANAGER_DIR="/Users/admin/Desktop/GitHub-Project-Manager"
PROJECT_RECORD="${PROJECT_MANAGER_DIR}/public/data/projects/wangxiongbiao-wmshr.json"
PROJECT_INDEX="${PROJECT_MANAGER_DIR}/public/data/project-index.json"
CUSTOM_DOMAIN="admin.dutylix.com"
CUSTOM_ORIGIN="https://${CUSTOM_DOMAIN}"
PROTECTED_CHECK_URL="${CUSTOM_ORIGIN}/api/admin/employees"
HEALTH_URL="${CUSTOM_ORIGIN}/api/health"
GOOGLE_AUTH_URL="${CUSTOM_ORIGIN}/api/public/google-auth-url?redirectTo=https%3A%2F%2Fadmin.dutylix.com"
RUN_DB_PUSH=1
RUN_PROJECT_MANAGER_LOG=1
COMMIT_MESSAGE="release production $(date -u +%Y-%m-%dT%H:%M:%SZ)"

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
  Vercel prod deploy -> alias admin.dutylix.com -> verify production endpoints -> update project log.
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

extract_deployment_url() {
  # Vercel CLI prints several URLs; the generated production URL is the one under wang-lins-projects.vercel.app.
  # Keep this parser narrow so we never alias the Inspect URL or the custom domain by mistake.
  grep -Eo 'https://dutylix-admin-[^[:space:]]+-wang-lins-projects\.vercel\.app' "$1" | tail -n 1
}

verify_http_status() {
  local url="$1"
  local expected="$2"
  local actual
  actual="$(curl -L -s -o /tmp/wmshr_deploy_check_body.txt -w '%{http_code}' "$url")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Unexpected HTTP status for $url: got $actual, expected $expected" >&2
    echo "Response body:" >&2
    sed -n '1,40p' /tmp/wmshr_deploy_check_body.txt >&2
    exit 1
  fi
}

update_project_manager_log() {
  local head_sha="$1"
  local deployment_url="$2"
  local now
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  if [[ ! -f "$PROJECT_RECORD" || ! -f "$PROJECT_INDEX" ]]; then
    echo "Project manager files not found; skip usage log update." >&2
    return 0
  fi

  # GitHub 项目发布属于实际使用记录；这里同步项目详情和索引，避免下次复盘时只看到 Git/Vercel 状态却缺少发布过程。
  python3 - "$PROJECT_RECORD" "$PROJECT_INDEX" "$now" "$head_sha" "$deployment_url" <<'PY'
import json
import sys
from pathlib import Path

project_path = Path(sys.argv[1])
index_path = Path(sys.argv[2])
now = sys.argv[3]
head_sha = sys.argv[4]
deployment_url = sys.argv[5]

project = json.loads(project_path.read_text())
log = {
    "usedAt": now,
    "task": "一键发布 WMSHR / Dutylix admin 到正式环境",
    "usageType": "自动化发布、数据库迁移、GitHub 推送、Vercel 生产部署、自定义域名验证",
    "process": "通过 scripts/deploy-production.sh 执行 lint/build/diff check/考勤测试、可选 Supabase db push、git commit/push、vercel deploy --prod、admin.dutylix.com alias 与线上接口验证。",
    "result": f"发布脚本执行成功。GitHub main HEAD 为 {head_sha}；Vercel 部署 URL 为 {deployment_url}；admin.dutylix.com 已完成线上验证。",
    "extractedOrIntegrated": "使用仓库根 vercel.json 的 apps/admin 构建配置、Supabase 迁移目录、Vercel dutylix-admin 项目和 admin.dutylix.com 生产域名。",
    "successCriteria": "lint/build/diff check/考勤测试通过；GitHub main 推送成功；Vercel Production Ready；admin.dutylix.com 页面、health、未登录保护接口和 Google auth URL 验证通过。",
    "pitfalls": "Vercel CLI 默认 alias 可能不是 admin.dutylix.com，脚本必须显式 vercel alias set；发布脚本默认提交当前工作树全部改动，执行前应确认 git status 中没有无关文件。",
    "nextActions": "如需业务端到端验收，登录 admin.dutylix.com 检查薪资列表、工资条生成和员工端账号登录。",
}
project.setdefault("usageLogs", []).append(log)
project["usageLogCount"] = len(project["usageLogs"])
project["updatedAt"] = now
project["notes"] = "本机实际业务项目；apps/admin 已部署到 Vercel 项目 dutylix-admin，并通过 Cloudflare/Vercel 绑定 admin.dutylix.com；支持 scripts/deploy-production.sh 一键发布。"
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
  require_command vercel
  if [[ "$RUN_DB_PUSH" == "1" ]]; then
    require_command supabase
  fi

  local branch
  branch="$(git branch --show-current)"
  if [[ "$branch" != "main" ]]; then
    echo "Release must run on main, current branch: $branch" >&2
    exit 1
  fi

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
    # Supabase CLI may prompt when migrations are pending; `yes` keeps the release one-command while the previous checks guard obvious mistakes.
    echo "+ yes | supabase db push"
    yes | supabase db push
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
  echo "+ vercel deploy --prod --yes"
  vercel deploy --prod --yes | tee "$deploy_log"
  deployment_url="$(extract_deployment_url "$deploy_log")"
  if [[ -z "$deployment_url" ]]; then
    echo "Could not parse Vercel production deployment URL from $deploy_log" >&2
    exit 1
  fi

  run vercel alias set "$deployment_url" "$CUSTOM_DOMAIN"

  echo "== Production verification =="
  verify_http_status "$CUSTOM_ORIGIN" "200"
  if ! curl -L -s "$CUSTOM_ORIGIN" | grep -Eq 'Dutylix Admin|DUTYLIX考勤与薪资自动运行'; then
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

  if [[ "$RUN_PROJECT_MANAGER_LOG" == "1" ]]; then
    update_project_manager_log "$head_sha" "$deployment_url"
  else
    echo "Skip GitHub-Project-Manager usage log (--no-project-log)."
  fi

  echo
  echo "Release completed."
  echo "HEAD: $head_sha"
  echo "Deployment: $deployment_url"
  echo "Production: $CUSTOM_ORIGIN"
}

main "$@"

#!/usr/bin/env node

/**
 * WMSHR / Dutylix Admin V4 Production Release Script
 * Cross-platform (Windows / macOS / Linux)
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const PRODUCTION_DOMAINS = ["https://v4.dutylix.com", "https://admin-v4.dutylix.com"];
const HEALTH_URL = "https://v4.dutylix.com/api/v4/health";

function run(cmd, options = {}) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      NO_UPDATE_NOTIFIER: "1",
      VERCEL_TELEMETRY_DISABLED: "1",
    },
    ...options,
  });
}

function runCapture(cmd, options = {}) {
  return execSync(cmd, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    shell: true,
    env: {
      ...process.env,
      NO_UPDATE_NOTIFIER: "1",
      VERCEL_TELEMETRY_DISABLED: "1",
    },
    ...options,
  }).trim();
}

async function verifyUrl(url, expectedStatus = 200, retries = 5, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`[验证] 正在检查 (${i}/${retries}): ${url}`);
      const res = await fetch(url, { headers: { "User-Agent": "WMSHR-Deploy-Verifier/1.0" } });
      if (res.status === expectedStatus) {
        console.log(`✓ 验证通过: ${url} -> HTTP ${res.status}`);
        return true;
      }
      console.warn(`[待重试] HTTP 状态码为 ${res.status} (预期 ${expectedStatus})`);
    } catch (err) {
      console.warn(`[待重试] 请求失败: ${err.message}`);
    }
    if (i < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`验证失败: ${url} 未返回预期状态 ${expectedStatus}`);
}

async function main() {
  const args = process.argv.slice(2);
  let commitMessage = "";
  let skipPush = false;
  let skipCheck = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-m" || args[i] === "--message") {
      commitMessage = args[++i];
    } else if (args[i] === "--no-push") {
      skipPush = true;
    } else if (args[i] === "--no-check") {
      skipCheck = true;
    }
  }

  console.log("====================================================");
  console.log("       WMSHR / Dutylix Admin V4 一键发布生产环境      ");
  console.log("====================================================");
  console.log(`仓库目录: ${REPO_ROOT}`);
  console.log(`目标生产域名: https://v4.dutylix.com`);

  // 1. 检查分支
  let currentBranch = "";
  try {
    currentBranch = runCapture("git branch --show-current");
  } catch (e) {
    currentBranch = "unknown";
  }
  console.log(`当前 Git 分支: ${currentBranch}`);

  // 2. 本地类型检查与编译构建
  if (!skipCheck) {
    console.log("\n[步骤 1/4] 执行代码检查与构建验证...");
    run("npm --prefix admin-v4 run lint");
    run("npm --prefix admin-v4 run build");
    console.log("✓ 本地 Lint 和编译构建全部通过！");
  } else {
    console.log("\n[步骤 1/4] 跳过本地检查与构建验证 (--no-check)");
  }

  // 3. Git 状态与提交推送
  console.log("\n[步骤 2/4] 检查并提交 Git 变更...");
  const statusOutput = runCapture("git status --porcelain");
  if (statusOutput) {
    const defaultMsg = `release(admin-v4): production release ${new Date().toISOString()}`;
    const msg = commitMessage || defaultMsg;
    console.log(`检测到未提交变更，正在提交: "${msg}"`);
    run("git add -A");
    run(`git commit -m "${msg.replace(/"/g, '\\"')}"`);
  } else {
    console.log("工作区无未提交变更。");
  }

  if (!skipPush) {
    console.log("正在推送到 GitHub 远程仓库 (origin/main)...");
    run("git push origin main");
    console.log("✓ GitHub 推送完成！");
  } else {
    console.log("跳过 Git 推送 (--no-push)。");
  }

  const headSha = runCapture("git rev-parse --short HEAD");
  console.log(`当前发布 Commit SHA: ${headSha}`);

  // 4. Vercel 生产部署 (内置重试机制应对跨国网络波动)
  console.log("\n[步骤 3/4] 执行 Vercel 生产环境部署 (dutylix-admin-v4)...");
  let deploySuccess = false;
  let deployAttempts = 0;
  const maxDeployAttempts = 3;

  while (!deploySuccess && deployAttempts < maxDeployAttempts) {
    deployAttempts++;
    try {
      if (deployAttempts > 1) {
        console.log(`\n[重试 ${deployAttempts}/${maxDeployAttempts}] 重新执行 Vercel 部署...`);
      }
      run("vercel deploy --prod --yes");
      deploySuccess = true;
    } catch (err) {
      if (deployAttempts >= maxDeployAttempts) {
        throw err;
      }
      console.warn(`\n[警告] Vercel 部署遇到网络波动，5秒后自动重试 (${deployAttempts}/${maxDeployAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  console.log("✓ Vercel 生产发布部署完成！");

  // 5. 线上验证
  console.log("\n[步骤 4/4] 验证线上生产环境服务状态...");
  await verifyUrl("https://v4.dutylix.com/", 200);
  await verifyUrl(HEALTH_URL, 200);

  console.log("\n====================================================");
  console.log("🎉 发布全部完成！");
  console.log(`  Commit SHA:    ${headSha}`);
  console.log(`  管理端入口:    https://v4.dutylix.com`);
  console.log(`  备用管理端:    https://admin-v4.dutylix.com`);
  console.log(`  健康检查端点:  ${HEALTH_URL}`);
  console.log("====================================================\n");
}

main().catch((err) => {
  console.error("\n❌ 发布过程出现错误:", err.message || err);
  process.exit(1);
});

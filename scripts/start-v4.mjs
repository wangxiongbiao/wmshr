#!/usr/bin/env node

/**
 * WMSHR Admin V4 Startup Manager
 * Starts both the V4 API backend (port 8789) and V4 Web frontend (port 3004).
 * Supports foreground (interactive), --background (detached daemon), --stop, and --status.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const LOG_DIR = path.join(REPO_ROOT, ".temp");
const PID_FILE = path.join(LOG_DIR, "v4-pids.json");

const API_PORT = 8789;
const WEB_PORT = 3004;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function checkHttp(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + u.search,
          method: "GET",
          timeout: timeoutMs,
        },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        }
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function waitForService(url, name, maxRetries = 25, intervalMs = 500) {
  for (let i = 1; i <= maxRetries; i++) {
    const ok = await checkHttp(url);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopRunning() {
  if (fs.existsSync(PID_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PID_FILE, "utf-8"));
      for (const [name, pid] of Object.entries(data)) {
        if (typeof pid === "number" && isPidAlive(pid)) {
          console.log(`[停止] 正在终止 ${name} (PID: ${pid})...`);
          try {
            process.kill(pid, "SIGTERM");
          } catch {}
        }
      }
      fs.unlinkSync(PID_FILE);
      console.log("[完成] 已停止所有 V4 后台服务。");
    } catch (err) {
      console.error("[错误] 读取或清理 PID 文件失败:", err.message);
    }
  } else {
    console.log("[提示] 未发现运行中的 V4 后台服务记录。");
  }
}

async function checkStatus() {
  const apiHealthy = await checkHttp(`http://127.0.0.1:${API_PORT}/api/v4/health`);
  const webHealthy = await checkHttp(`http://127.0.0.1:${WEB_PORT}/`);

  console.log(`\n=== 版本 4 服务运行状态 ===`);
  console.log(`- V4 后端 API (http://127.0.0.1:${API_PORT}): ${apiHealthy ? "🟢 正常运行中" : "🔴 未运行"}`);
  console.log(`- V4 前端 Web (http://127.0.0.1:${WEB_PORT}): ${webHealthy ? "🟢 正常运行中" : "🔴 未运行"}`);
  console.log("");
}

async function startBackground() {
  ensureDir(LOG_DIR);

  const apiAlready = await checkHttp(`http://127.0.0.1:${API_PORT}/api/v4/health`);
  const webAlready = await checkHttp(`http://127.0.0.1:${WEB_PORT}/`);

  if (apiAlready && webAlready) {
    console.log("[提示] 版本 4 服务均已在后台运行中：");
    console.log(`- 前端访问地址: http://localhost:${WEB_PORT}`);
    console.log(`- 后端 API 地址: http://localhost:${API_PORT}/api/v4/health`);
    return;
  }

  const apiLogStream = fs.openSync(path.join(LOG_DIR, "v4-api.log"), "a");
  const webLogStream = fs.openSync(path.join(LOG_DIR, "v4-web.log"), "a");

  let apiChild = null;
  let webChild = null;
  const pids = {};

  if (!apiAlready) {
    console.log(`[启动] 正在后台启动 V4 API 服务 (端口 ${API_PORT})...`);
    apiChild = spawn(process.execPath, [path.join(REPO_ROOT, "apps/admin/server-v4/index.js")], {
      cwd: REPO_ROOT,
      detached: true,
      stdio: ["ignore", apiLogStream, apiLogStream],
      env: { ...process.env, ADMIN_V4_API_PORT: String(API_PORT) },
    });
    apiChild.unref();
    pids.api = apiChild.pid;
  } else {
    console.log(`[提示] V4 API 服务已在端口 ${API_PORT} 运行。`);
  }

  if (!webAlready) {
    console.log(`[启动] 正在后台启动 V4 前端 Web 服务 (端口 ${WEB_PORT})...`);
    const viteBin = path.join(REPO_ROOT, "admin-v4/node_modules/vite/bin/vite.js");
    webChild = spawn(process.execPath, [viteBin, "--port", String(WEB_PORT), "--host", "0.0.0.0"], {
      cwd: path.join(REPO_ROOT, "admin-v4"),
      detached: true,
      stdio: ["ignore", webLogStream, webLogStream],
      env: { ...process.env },
    });
    webChild.unref();
    pids.web = webChild.pid;
  } else {
    console.log(`[提示] V4 前端 Web 服务已在端口 ${WEB_PORT} 运行。`);
  }

  fs.writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));

  console.log("[检查] 正在等待服务就绪...");
  const [apiOk, webOk] = await Promise.all([
    waitForService(`http://127.0.0.1:${API_PORT}/api/v4/health`, "V4 API"),
    waitForService(`http://127.0.0.1:${WEB_PORT}/`, "V4 Web"),
  ]);

  if (apiOk && webOk) {
    console.log("\n========================================");
    console.log("   🎉 版本 4 已成功启动！");
    console.log("========================================");
    console.log(`👉 前端访问页面: http://localhost:${WEB_PORT}`);
    console.log(`👉 后端接口地址: http://localhost:${API_PORT}/api/v4/health`);
    console.log(`👉 日志输出目录: ${LOG_DIR}`);
    console.log("========================================\n");
  } else {
    console.error("[警告] 服务启动未能及时响应，请检查日志:");
    console.error(`- API 日志: ${path.join(LOG_DIR, "v4-api.log")}`);
    console.error(`- 前端日志: ${path.join(LOG_DIR, "v4-web.log")}`);
    process.exit(1);
  }
}

async function startForeground() {
  console.log("\n========================================");
  console.log("   🚀 正在启动 版本 4 服务 (前台模式)");
  console.log("========================================");

  const apiChild = spawn(process.execPath, [path.join(REPO_ROOT, "apps/admin/server-v4/index.js")], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ADMIN_V4_API_PORT: String(API_PORT) },
  });

  apiChild.stdout.on("data", (data) => {
    process.stdout.write(`[v4-api] ${data}`);
  });
  apiChild.stderr.on("data", (data) => {
    process.stderr.write(`[v4-api error] ${data}`);
  });

  const viteBin = path.join(REPO_ROOT, "admin-v4/node_modules/vite/bin/vite.js");
  const webChild = spawn(process.execPath, [viteBin, "--port", String(WEB_PORT), "--host", "0.0.0.0"], {
    cwd: path.join(REPO_ROOT, "admin-v4"),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  webChild.stdout.on("data", (data) => {
    process.stdout.write(`[v4-web] ${data}`);
  });
  webChild.stderr.on("data", (data) => {
    process.stderr.write(`[v4-web error] ${data}`);
  });

  const cleanup = () => {
    console.log("\n[退出] 正在关闭服务...");
    try { apiChild.kill(); } catch {}
    try { webChild.kill(); } catch {}
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  await Promise.all([
    waitForService(`http://127.0.0.1:${API_PORT}/api/v4/health`, "V4 API"),
    waitForService(`http://127.0.0.1:${WEB_PORT}/`, "V4 Web"),
  ]);

  console.log("\n========================================");
  console.log("   🎉 版本 4 已成功就绪！");
  console.log(`   👉 前端页面: http://localhost:${WEB_PORT}`);
  console.log(`   👉 后端 API: http://localhost:${API_PORT}/api/v4/health`);
  console.log("   (按 Ctrl+C 可停止运行)");
  console.log("========================================\n");
}

const args = process.argv.slice(2);
if (args.includes("--stop")) {
  stopRunning();
} else if (args.includes("--status")) {
  await checkStatus();
} else if (args.includes("--background") || args.includes("--daemon")) {
  await startBackground();
} else {
  await startForeground();
}

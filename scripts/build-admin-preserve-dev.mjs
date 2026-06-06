#!/usr/bin/env node

import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const adminDir = path.join(repoRoot, "apps", "admin");
const logDir = path.join(repoRoot, ".dev");

const services = [
  {
    name: "admin-api",
    port: Number(process.env.ADMIN_API_PORT || 8788),
    args: ["run", "dev:admin:api"],
    logFile: path.join(logDir, "admin-api.log")
  },
  {
    name: "admin-web",
    port: 3000,
    args: ["run", "dev:admin"],
    logFile: path.join(logDir, "admin-web.log")
  }
];

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port, timeout: 800 }, () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

function startDetachedService(service) {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const output = createWriteStream(service.logFile, { flags: "a" });
  output.write(`\n[${new Date().toISOString()}] restarting ${service.name} after build\n`);

  // 构建脚本不能把 dev 服务作为子进程挂在当前 build 进程组里；否则 build 结束或终端会话回收时，刚拉起的服务仍可能被一起清掉。
  // detached + unref 让补拉起的本地 dev 服务独立存活，日志固定写入 .dev/，后续排查先看对应 log 文件。
  const child = spawn("npm", service.args, {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", output, output]
  });
  child.unref();
}

async function restoreServicesIfNeeded(beforeState) {
  for (const service of services) {
    if (!beforeState.get(service.name)) {
      continue;
    }

    const stillRunning = await isPortOpen(service.port);
    if (stillRunning) {
      continue;
    }

    console.log(`[build-admin-preserve-dev] ${service.name} was running before build but port ${service.port} is down; restarting it.`);
    startDetachedService(service);
  }
}

const beforeState = new Map();
for (const service of services) {
  beforeState.set(service.name, await isPortOpen(service.port));
}

const buildResult = spawnSync("npm", ["run", "build:raw"], {
  cwd: adminDir,
  stdio: "inherit",
  env: process.env
});

await restoreServicesIfNeeded(beforeState);

process.exit(buildResult.status ?? 1);

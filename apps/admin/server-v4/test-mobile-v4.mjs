import assert from "node:assert/strict";
import http from "node:http";
import app from "./index.js";
import { signToken } from "../server/auth-v4.js";

async function runTests() {
  console.log("=== 开始测试 Server-V4 移动端接口 ===");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  try {
    // 1. 测试健康检查
    console.log("1. 测试 V4 健康检查...");
    const health = await request("/api/v4/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);
    console.log("   -> 健康检查通过: ", health.body);

    // 2. 测试移动端登录空参数验证
    console.log("2. 测试移动端登录空参数校验...");
    const emptyLogin = await request("/api/v4/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify({})
    });
    assert.equal(emptyLogin.status, 400);
    assert.equal(emptyLogin.body.success, false);
    console.log("   -> 空参数校验通过: ", emptyLogin.body.error);

    // 3. 测试移动端不存在用户登录
    console.log("3. 测试移动端不存在账号校验...");
    const notFoundLogin = await request("/api/v4/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify({ account: "non_existent_user_9999", password: "123" })
    });
    assert.equal(notFoundLogin.status, 401);
    assert.equal(notFoundLogin.body.success, false);
    console.log("   -> 不存在账号拦截通过: ", notFoundLogin.body.error);

    // 4. 测试无 Token 访问受保护的考勤记录
    console.log("4. 测试未鉴权访问受保护路由...");
    const noTokenRecs = await request("/api/v4/mobile/attendance/records");
    assert.equal(noTokenRecs.status, 401);
    assert.equal(noTokenRecs.body.success, false);
    console.log("   -> 未鉴权拦截通过: ", noTokenRecs.body.error);

    // 5. 测试伪造非法 Token 访问
    console.log("5. 测试非法 Token 校验...");
    const badToken = await request("/api/v4/mobile/auth/me", {
      headers: { Authorization: "Bearer bad.token.here" }
    });
    assert.equal(badToken.status, 401);
    assert.equal(badToken.body.success, false);
    console.log("   -> 非法 Token 拦截通过: ", badToken.body.error);

    // 6. 测试 /api/mobile 别名路由映射一致性
    console.log("6. 测试 /api/mobile 别名映射...");
    const aliasRecs = await request("/api/mobile/attendance/records");
    assert.equal(aliasRecs.status, 401);
    assert.equal(aliasRecs.body.success, false);
    console.log("   -> 别名路由正常响应: ", aliasRecs.body.error);

    console.log("=== 全部 6 项核心测试通过 ===");
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("测试异常失败:", err);
  process.exit(1);
});

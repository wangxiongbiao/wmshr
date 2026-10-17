import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  ShopeeApiError,
  createShopeeClient,
  decryptToken,
  encryptToken,
  loadShopeeConfig,
  signAuthState,
  verifyAuthState,
} from "./shopee.js";
import { normalizeShopeeOrder } from "./shopee-routes.js";
import { HttpError } from "./commerce-common.js";

const ENV = {
  SHOPEE_PARTNER_ID: "1001",
  SHOPEE_PARTNER_KEY: "shpk-test-key",
  SHOPEE_API_HOST: "https://shopee.test",
  SHOPEE_TOKEN_ENC_KEY: crypto.randomBytes(32).toString("base64"),
  SHOPEE_REDIRECT_BASE: "https://v4.example.com",
};

const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("Shopee 配置", () => {
  it("缺少任一变量或加密密钥不是 32 字节时视为未配置，调用时返回 503", async () => {
    assert.equal(loadShopeeConfig({ ...ENV, SHOPEE_PARTNER_KEY: "" }), null);
    assert.equal(loadShopeeConfig({ ...ENV, SHOPEE_TOKEN_ENC_KEY: Buffer.alloc(16).toString("base64") }), null);
    const client = createShopeeClient(null);
    await assert.rejects(client.getShopInfo("t", "1"), (err) => err instanceof HttpError && err.status === 503);
  });
});

describe("授权 state", () => {
  const secret = "state-secret";
  const scope = { ownerUserId: "u1", warehouseCode: "MY", customerCode: "CUST-1" };

  it("签名可还原发起授权的作用域", () => {
    assert.deepEqual(verifyAuthState(secret, signAuthState(secret, scope)), scope);
  });

  it("篡改负载、错误密钥、格式错误均被拒绝", () => {
    const state = signAuthState(secret, scope);
    const [, mac] = state.split(".");
    const forged = Buffer.from(JSON.stringify({ o: "attacker", w: "MY", c: "CUST-1", e: Date.now() + 60000 })).toString("base64url");
    assert.equal(verifyAuthState(secret, `${forged}.${mac}`), null);
    assert.equal(verifyAuthState("other-secret", state), null);
    assert.equal(verifyAuthState(secret, "garbage"), null);
  });

  it("超过有效期被拒绝", (t) => {
    const state = signAuthState(secret, scope);
    t.mock.timers.enable({ apis: ["Date"], now: Date.now() + 16 * 60 * 1000 });
    assert.equal(verifyAuthState(secret, state), null);
  });
});

describe("令牌加密", () => {
  const key = crypto.randomBytes(32);

  it("加密后可还原，且同一明文每次密文不同", () => {
    const a = encryptToken(key, "token-abc");
    assert.notEqual(a, encryptToken(key, "token-abc"));
    assert.equal(decryptToken(key, a), "token-abc");
  });

  it("密文被篡改时解密失败", () => {
    const [iv, tag, data] = encryptToken(key, "token-abc").split(".");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 0xff;
    assert.throws(() => decryptToken(key, [iv, tag, flipped.toString("base64")].join(".")));
  });
});

describe("Shopee 请求", () => {
  const config = loadShopeeConfig(ENV);

  it("店铺级接口签名包含 access_token 与 shop_id", async () => {
    let url;
    const client = createShopeeClient(config, { fetchImpl: async (u) => { url = new URL(u); return jsonResponse(200, { shop_name: "S", region: "MY" }); } });
    assert.deepEqual(await client.getShopInfo("tok", "42"), { shopName: "S", region: "MY" });
    const ts = url.searchParams.get("timestamp");
    const expected = crypto.createHmac("sha256", ENV.SHOPEE_PARTNER_KEY).update(`1001/api/v2/shop/get_shop_info${ts}tok42`).digest("hex");
    assert.equal(url.searchParams.get("sign"), expected);
  });

  it("GET 遇到 5xx 重试后成功；业务错误抛出 ShopeeApiError", async () => {
    let calls = 0;
    const flaky = createShopeeClient(config, { fetchImpl: async () => (++calls < 3 ? jsonResponse(503, {}) : jsonResponse(200, { shop_name: "S" })) });
    assert.equal((await flaky.getShopInfo("t", "1")).shopName, "S");
    assert.equal(calls, 3);

    const rejecting = createShopeeClient(config, { fetchImpl: async () => jsonResponse(403, { error: "error_auth", message: "Invalid access_token." }) });
    await assert.rejects(rejecting.getShopInfo("t", "1"), (err) => err instanceof ShopeeApiError && err.code === "error_auth");
  });

  it("授权码换令牌（POST）失败不重试，避免重复消费一次性授权码", async () => {
    let calls = 0;
    const client = createShopeeClient(config, { fetchImpl: async () => { calls += 1; return jsonResponse(503, {}); } });
    await assert.rejects(client.exchangeCode("code", "1"));
    assert.equal(calls, 1);
  });

  it("订单号自动翻页", async () => {
    const pages = [
      { response: { order_list: [{ order_sn: "A" }], more: true, next_cursor: "c1" } },
      { response: { order_list: [{ order_sn: "B" }], more: false } },
    ];
    const cursors = [];
    const client = createShopeeClient(config, { fetchImpl: async (u) => { cursors.push(new URL(u).searchParams.get("cursor")); return jsonResponse(200, pages.shift()); } });
    assert.deepEqual(await client.listOrderSns("t", "1", { timeFrom: 1, timeTo: 2 }), ["A", "B"]);
    assert.deepEqual(cursors, ["", "c1"]);
  });
});

describe("订单转换", () => {
  it("映射 Shopee 订单详情，过滤数量为 0 的商品", () => {
    const order = normalizeShopeeOrder({
      order_sn: "SN1", order_status: "READY_TO_SHIP", currency: "MYR", total_amount: 1.49,
      shipping_carrier: "SPX", create_time: 1_792_227_564,
      recipient_address: { name: "N", phone: "P", full_address: "ADDR" },
      item_list: [
        { item_id: 53069360047, model_id: 371621311406, item_sku: "", model_sku: "M-1", item_name: "Towel", model_name: "1-piece", image_info: { image_url: "img" }, model_quantity_purchased: 2, model_discounted_price: 1.49 },
        { item_id: 1, model_id: 0, model_quantity_purchased: 0 },
      ],
    });
    assert.equal(order.items.length, 1);
    assert.deepEqual(order.items[0], {
      platformItemId: "53069360047", platformModelId: "371621311406", modelSku: "M-1", itemSku: "",
      itemName: "Towel", modelName: "1-piece", imageUrl: "img", qty: 2, unitPrice: 1.49,
    });
    assert.equal(order.createdAt, new Date(1_792_227_564 * 1000).toISOString());
    assert.equal(order.receiverAddress, "ADDR");
  });
});

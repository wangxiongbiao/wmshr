/**
 * 客户 / 商品 / 订单 / Shopee 同步的数据库集成测试。
 * 全部写操作在一个外层事务内执行并在结束时回滚：被测代码中的 BEGIN/COMMIT/ROLLBACK 映射为保存点，不在数据库留下数据。
 * Shopee 接口以桩函数模拟。运行：node --test apps/admin/server-v4/test-commerce-db.mjs（需 apps/admin/.env 中的 DATABASE_URL）
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import dotenv from "dotenv";
import express from "express";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { createCustomerRouter } from "./customers.js";
import { createProductRouter } from "./products.js";
import { createOrderRouter } from "./orders.js";
import { createShopeeRouter } from "./shopee-routes.js";
import { encryptToken } from "./shopee.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const WAREHOUSE = "ZZ";
const OTHER_WAREHOUSE = "YY";
const ENC_KEY = crypto.randomBytes(32);

let realPool;
let client;
let server;
let baseUrl;
let ownerUserId;
const shopeeOrders = new Map();

/** 单连接伪连接池：外层事务内，嵌套事务转为保存点 */
function createRollbackPool(conn) {
  const stack = [];
  const wrapped = {
    query(text, params) {
      if (text === "BEGIN") {
        const name = `tx_${stack.length + 1}`;
        stack.push(name);
        return conn.query(`SAVEPOINT ${name}`);
      }
      if (text === "COMMIT") return conn.query(`RELEASE SAVEPOINT ${stack.pop()}`);
      if (text === "ROLLBACK") return conn.query(`ROLLBACK TO SAVEPOINT ${stack.pop()}`);
      return conn.query(text, params);
    },
    release() {},
  };
  // 事务外的单条语句模拟自动提交：各自包一层保存点，失败只回滚自身而不中止外层事务；串行执行避免保存点交错
  let chain = Promise.resolve();
  let seq = 0;
  const autocommitQuery = (text, params) => {
    const run = async () => {
      const name = `stmt_${++seq}`;
      await conn.query(`SAVEPOINT ${name}`);
      try {
        const result = await conn.query(text, params);
        await conn.query(`RELEASE SAVEPOINT ${name}`);
        return result;
      } catch (error) {
        await conn.query(`ROLLBACK TO SAVEPOINT ${name}`);
        throw error;
      }
    };
    const result = chain.then(run);
    chain = result.catch(() => {});
    return result;
  };
  return { query: autocommitQuery, connect: async () => wrapped };
}

const stubShopee = {
  isConfigured: () => true,
  buildAuthUrl: (state) => `https://shopee.test/auth?state=${state}`,
  refreshAccessToken: async () => { throw new Error("测试中不应刷新令牌"); },
  listOrderSns: async () => [...shopeeOrders.keys()],
  getOrderDetails: async (_token, _shop, sns) => sns.map((sn) => shopeeOrders.get(sn)),
};

const shopeeOrder = (sn, status, items) => ({
  order_sn: sn, order_status: status, currency: "MYR", total_amount: 10, shipping_carrier: "SPX Express",
  create_time: Math.floor(Date.now() / 1000), recipient_address: { name: "Buyer", phone: "0123", full_address: "KL" },
  item_list: items.map(([itemId, modelSku, qty]) => ({
    item_id: itemId, model_id: 0, item_sku: "", model_sku: modelSku, item_name: `Item ${itemId}`, model_name: "",
    model_quantity_purchased: qty, model_discounted_price: 5,
  })),
});

async function api(method, path, body, warehouse = WAREHOUSE) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-test-warehouse": warehouse },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

const inventoryOf = async (sku) =>
  (await client.query(
    `SELECT p.inventory FROM public.workspace_products p JOIN public.workspace_customers c ON c.id = p.customer_id
     WHERE c.owner_user_id = $1 AND c.warehouse_code = $2 AND p.sku = $3`,
    [ownerUserId, WAREHOUSE, sku]
  )).rows[0].inventory;

const ordersIn = async (status) => (await api("GET", `/orders?status=${status}&pageSize=100`)).body;

before(async () => {
  realPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
  client = await realPool.connect();
  await client.query("BEGIN");
  // 迁移尚未上线时在测试事务内执行（DDL 同样随回滚撤销），同时校验迁移脚本本身
  const { rows: existing } = await client.query("SELECT to_regclass('public.workspace_orders') AS t");
  if (!existing[0].t) {
    const migration = new URL("../../../supabase/migrations/20261017120000_v4_customers_products_orders.sql", import.meta.url);
    await client.query(fs.readFileSync(migration, "utf8"));
  }
  ownerUserId = (await client.query("SELECT id FROM auth.users ORDER BY created_at LIMIT 1")).rows[0].id;
  const pool = createRollbackPool(client);

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUser = { adminOwnerUserId: ownerUserId, countryCode: req.headers["x-test-warehouse"], permissions: ["*"], name: "测试员" };
    next();
  });
  app.use(createCustomerRouter({ express, directDbPool: pool }));
  app.use(createProductRouter({ express, directDbPool: pool }));
  app.use(createOrderRouter({ express, directDbPool: pool }));
  app.use(createShopeeRouter({ express, directDbPool: pool, shopee: stubShopee, encKey: ENC_KEY, authSecret: "s", frontendBase: "https://x" }).router);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await client?.query("ROLLBACK");
  client?.release();
  await realPool?.end();
});

describe("客户", () => {
  it("新建、重复ID 409、充值写流水并更新余额、仓库隔离", async () => {
    const created = await api("POST", "/customers", { id: "T-CUST", name: "测试客户", contact: "张三", currency: "MYR", availableLimit: 100, creditLimit: 500 });
    assert.equal(created.status, 201);
    assert.equal((await api("POST", "/customers", { id: "T-CUST", name: "重复", contact: "x" })).status, 409);

    const recharged = await api("POST", "/customers/T-CUST/credit-logs", { type: "recharge", amount: 50, note: "线下打款", operator: "" });
    assert.equal(recharged.body.customer.availableLimit, 150);
    assert.equal(recharged.body.customer.creditLogs[0].balanceAfter, 150);
    assert.equal(recharged.body.customer.creditLogs[0].operator, "测试员");

    assert.equal((await api("GET", "/customers", null, OTHER_WAREHOUSE)).body.customers.length, 0);
  });
});

describe("商品与入库导入", () => {
  it("新建商品、盘点、入库单只导入一次、未匹配客户的入库单被跳过", async () => {
    assert.equal((await api("POST", "/products", { id: "SKU-A", name: "A", customerId: "T-CUST", inventory: 5 })).status, 201);
    assert.equal((await api("POST", "/products", { id: "SKU-B", name: "B", customerId: "T-CUST", inventory: 1 })).status, 201);
    assert.equal((await api("POST", "/products", { id: "SKU-A", name: "A2", customerId: "T-CUST", inventory: 1 })).status, 409);

    const entries = [
      { entryNo: "IN-1", customerName: "测试客户", skus: [{ sku: "SKU-A", qty: 3 }, { sku: "SKU-NEW", qty: 2 }] },
      { entryNo: "IN-2", customerName: "不存在的客户", skus: [{ sku: "SKU-A", qty: 99 }] },
    ];
    const first = (await api("POST", "/products/inbound-imports", { entries })).body;
    assert.deepEqual([first.created, first.updated, first.unmatchedCustomers], [1, 1, ["IN-2"]]);
    const second = (await api("POST", "/products/inbound-imports", { entries })).body;
    assert.deepEqual([second.created, second.updated, second.alreadyImported], [0, 0, ["IN-1"]]);
    assert.equal(await inventoryOf("SKU-A"), 8);

    const { products } = (await api("GET", "/products")).body;
    const skuA = products.find((p) => p.id === "SKU-A");
    const counted = await api("POST", `/products/${skuA.recordId}/stocktake`, { qty: 10, shelfLocation: "A-01", note: "复盘" });
    assert.equal(counted.body.product.inventory, 10);
    assert.equal(counted.body.product.lastStocktakeQty, 8);
  });

  it("有商品的客户不能删除", async () => {
    assert.equal((await api("DELETE", "/customers/T-CUST")).status, 409);
  });
});

describe("Shopee 同步、配对与订单流转", () => {
  let shopRecordId;

  before(async () => {
    const { rows } = await client.query(
      `INSERT INTO public.workspace_shops (customer_id, platform, platform_shop_id, shop_name, access_token_enc, refresh_token_enc, access_expires_at)
       SELECT id, 'Shopee', '990001', '测试店', $3, $3, now() + interval '1 day'
       FROM public.workspace_customers WHERE owner_user_id = $1 AND warehouse_code = $2 AND customer_code = 'T-CUST'
       RETURNING id`,
      [ownerUserId, WAREHOUSE, encryptToken(ENC_KEY, "token")]
    );
    shopRecordId = rows[0].id;
    shopeeOrders.set("SN-AUTO", shopeeOrder("SN-AUTO", "READY_TO_SHIP", [[1, "SKU-A", 2]]));
    shopeeOrders.set("SN-UNPAIRED", shopeeOrder("SN-UNPAIRED", "READY_TO_SHIP", [[2, "PLATFORM-ONLY", 1]]));
    shopeeOrders.set("SN-SHORT", shopeeOrder("SN-SHORT", "READY_TO_SHIP", [[3, "SKU-B", 4]]));
    shopeeOrders.set("SN-UNPAID", shopeeOrder("SN-UNPAID", "UNPAID", [[1, "SKU-A", 1]]));
  });

  it("同步：SKU 一致自动配对并锁库存、未匹配进待配对、库存不足进异常、未付款不入库", async () => {
    const result = (await api("POST", `/shops/${shopRecordId}/sync`)).body;
    assert.deepEqual(result, { fetched: 4, imported: 3, pendingPrint: 1, pendingPair: 1, outOfStock: 1, canceled: 0 });
    assert.equal(await inventoryOf("SKU-A"), 8);
    assert.equal(await inventoryOf("SKU-B"), 1);

    const again = (await api("POST", `/shops/${shopRecordId}/sync`)).body;
    assert.equal(again.imported, 0, "重复同步不应重复入库");
  });

  it("人工配对后待配对订单锁库存进入待打单", async () => {
    const pending = (await api("GET", "/pairings/pending")).body.items;
    assert.equal(pending.length, 1);
    const { products } = (await api("GET", "/products")).body;
    const skuA = products.find((p) => p.id === "SKU-A");

    const paired = await api("POST", "/pairings", { ...pending[0], productRecordId: skuA.recordId, qty: 2 });
    assert.deepEqual(paired.body, { pendingPrint: 1, outOfStock: 0, stillPending: 0 });
    assert.equal(await inventoryOf("SKU-A"), 6, "1 件平台商品 × 每件 2 件本仓");
    assert.equal((await ordersIn("pending_pair")).total, 0);
  });

  it("异常单补货后可重新处理；打单 → 扫码发货，重复扫码被拒绝", async () => {
    const [short] = (await ordersIn("anomaly")).items;
    assert.equal((await api("POST", `/orders/${short.id}/actions/resolveAnomaly`)).status, 409, "库存仍不足");
    const { products } = (await api("GET", "/products")).body;
    const skuB = products.find((p) => p.id === "SKU-B");
    await api("POST", `/products/${skuB.recordId}/stocktake`, { qty: 4, shelfLocation: "", note: "" });
    assert.equal((await api("POST", `/orders/${short.id}/actions/resolveAnomaly`)).status, 200);
    assert.equal(await inventoryOf("SKU-B"), 0);

    const printed = await api("POST", `/orders/${short.id}/actions/print`, { carrier: "", trackingNo: "TRK-1" });
    assert.equal(printed.body.order.carrier, "SPX Express", "未填写承运商时沿用平台指定");
    assert.equal((await api("POST", "/orders/ship-by-code", { code: "TRK-1" })).status, 200);
    assert.equal((await api("POST", "/orders/ship-by-code", { code: "TRK-1" })).status, 409);
    assert.equal((await api("POST", `/orders/${short.id}/actions/void`)).status, 409, "已发货不可作废");
  });

  it("平台取消同步作废并回补库存；批量作废中非法订单单独失败", async () => {
    const [auto] = (await ordersIn("pending_print")).items.filter((o) => o.orderNo === "SN-AUTO");
    const before = await inventoryOf("SKU-A");
    shopeeOrders.set("SN-AUTO", shopeeOrder("SN-AUTO", "CANCELLED", [[1, "SKU-A", 2]]));
    const result = (await api("POST", `/shops/${shopRecordId}/sync`)).body;
    assert.equal(result.canceled, 1);
    assert.equal(await inventoryOf("SKU-A"), before + 2);

    const [unpairedNowPrintable] = (await ordersIn("pending_print")).items;
    const [shipped] = (await ordersIn("shipped")).items;
    const batch = (await api("POST", "/orders/batch", { action: "void", orderIds: [unpairedNowPrintable.id, shipped.id] })).body;
    assert.deepEqual(batch.succeeded, [unpairedNowPrintable.id]);
    assert.equal(batch.failed[0].orderId, shipped.id);

    const logs = (await api("GET", `/orders/${auto.id}/logs`)).body.logs;
    assert.deepEqual(logs.map((l) => l.action), ["void", "lock", "pull"]);
  });

  it("列表：Tab 计数、关键字检索、其他仓库不可见", async () => {
    const list = (await api("GET", "/orders?status=canceled&keyword=SN-AUTO")).body;
    assert.equal(list.total, 1);
    assert.equal(list.tabCounts.canceled, 2);
    assert.equal(list.tabCounts.shipped, 1);
    assert.equal((await api("GET", "/orders?status=canceled", null, OTHER_WAREHOUSE)).body.total, 0);
  });
});

import {
  HttpError,
  getScope,
  handle,
  requirePermission,
  requiredText,
  text,
  withTransaction,
} from "./commerce-common.js";
import {
  ACTION_RULES,
  advancePendingPairOrder,
  insertOrderLog,
  releaseInventory,
  tryLockInventory,
} from "./order-core.js";

const TAB_STATUSES = ["pending_pair", "pending_print", "printed", "shipped", "anomaly", "canceled"];
const MAX_PAGE_SIZE = 500;
const MAX_BATCH = 200;
const VOID_REASON = "操作员手动作废，库存已回补";

const ORDER_SELECT = `
  SELECT o.*, c.customer_code, c.name AS customer_name, s.platform, s.shop_name, s.platform_shop_id,
    COALESCE((
      SELECT json_agg(json_build_object(
        'platformItemId', i.platform_item_id, 'platformModelId', i.platform_model_id, 'platformSku', i.platform_sku,
        'itemName', i.item_name, 'modelName', i.model_name, 'imageUrl', i.image_url, 'qty', i.qty,
        'unitPrice', i.unit_price, 'sku', p.sku, 'productName', p.name, 'deductQty', i.deduct_qty
      ) ORDER BY i.id)
      FROM public.workspace_order_items i LEFT JOIN public.workspace_products p ON p.id = i.product_id
      WHERE i.order_id = o.id
    ), '[]'::json) AS items
  FROM public.workspace_orders o
  JOIN public.workspace_customers c ON c.id = o.customer_id
  JOIN public.workspace_shops s ON s.id = o.shop_id`;

const utcText = (value) => (value ? new Date(value).toISOString().replace("T", " ").slice(0, 19) : "");

export function mapOrderRow(row) {
  return {
    id: String(row.id),
    orderNo: row.platform_order_no,
    customerId: row.customer_code,
    customerName: row.customer_name,
    platform: row.platform,
    shopName: row.shop_name,
    shopId: row.platform_shop_id,
    items: row.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice), sku: item.sku ?? undefined, productName: item.productName ?? undefined, deductQty: item.deductQty ?? undefined })),
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    receiverName: row.receiver_name,
    receiverPhone: row.receiver_phone,
    receiverAddress: row.receiver_address,
    status: row.status,
    inventoryLocked: row.inventory_locked,
    platformStatus: row.platform_status,
    createdAt: utcText(row.platform_created_at || row.created_at),
    carrier: row.carrier ?? undefined,
    trackingNo: row.tracking_no ?? undefined,
    reason: row.reason ?? undefined,
  };
}

const escapeLike = (value) => value.replace(/[\\%_]/g, (ch) => `\\${ch}`);

function buildListFilter(scope, query) {
  const params = [scope.ownerUserId, scope.warehouseCode];
  const where = ["o.owner_user_id = $1", "o.warehouse_code = $2"];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };

  const status = String(query.status || "pending_print");
  if (!TAB_STATUSES.includes(status)) throw new HttpError(400, "无效的订单状态");
  add("o.status = ?", status);
  if (query.customerId && query.customerId !== "all") add("c.customer_code = ?", String(query.customerId));
  if (query.shopId && query.shopId !== "all") add("s.platform_shop_id = ?", String(query.shopId));
  if (query.platform && query.platform !== "all") add("s.platform = ?", String(query.platform));
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.dateFrom || "")) add("(COALESCE(o.platform_created_at, o.created_at) AT TIME ZONE 'UTC')::date >= ?::date", query.dateFrom);
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.dateTo || "")) add("(COALESCE(o.platform_created_at, o.created_at) AT TIME ZONE 'UTC')::date <= ?::date", query.dateTo);

  const keyword = text(query.keyword, 100);
  if (keyword) {
    params.push(`%${escapeLike(keyword)}%`);
    const p = `$${params.length}`;
    where.push(`(o.id::text ILIKE ${p} OR o.platform_order_no ILIKE ${p} OR o.receiver_name ILIKE ${p}
      OR o.tracking_no ILIKE ${p} OR c.name ILIKE ${p}
      OR EXISTS (SELECT 1 FROM public.workspace_order_items i LEFT JOIN public.workspace_products p ON p.id = i.product_id
                 WHERE i.order_id = o.id AND (i.platform_sku ILIKE ${p} OR i.item_name ILIKE ${p} OR p.sku ILIKE ${p})))`);
  }
  return { where: where.join(" AND "), params };
}

/** 在当前作用域内锁定订单行并执行状态动作；失败抛出 HttpError，由调用方决定整体回滚或按单记录失败 */
async function applyOrderAction(client, scope, orderId, action, payload = {}) {
  const rule = ACTION_RULES[action];
  if (!rule) throw new HttpError(400, "无效的订单操作");
  const { rows } = await client.query(
    `SELECT id, status, inventory_locked, carrier FROM public.workspace_orders
     WHERE id = $1 AND owner_user_id = $2 AND warehouse_code = $3 FOR UPDATE`,
    [orderId, scope.ownerUserId, scope.warehouseCode]
  );
  const order = rows[0];
  if (!order) throw new HttpError(404, `订单 ${orderId} 不存在`);
  if (!rule.from.includes(order.status)) throw new HttpError(409, `订单 ${orderId} 当前状态不允许【${rule.label}】`);

  const sets = ["status = $2", "updated_at = now()"];
  const values = [order.id, rule.to];
  const set = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  let note = "";

  switch (action) {
    case "print": {
      const carrier = text(payload.carrier, 100) || order.carrier;
      if (!carrier) throw new HttpError(400, "请填写物流承运商");
      set("carrier", carrier);
      const trackingNo = text(payload.trackingNo, 100);
      if (trackingNo) set("tracking_no", trackingNo);
      note = [carrier, trackingNo].filter(Boolean).join(" ");
      break;
    }
    case "markAnomaly":
      note = requiredText(payload.reason, "异常原因", 500);
      set("reason", note);
      break;
    case "resolveAnomaly":
      if (!order.inventory_locked && !(await tryLockInventory(client, order.id))) {
        throw new HttpError(409, `订单 ${orderId} 库存仍不足，请补货后再处理`);
      }
      set("reason", null);
      break;
    case "void":
      if (order.inventory_locked) await releaseInventory(client, order.id);
      note = order.inventory_locked ? "库存已回补" : "";
      set("reason", VOID_REASON);
      break;
  }

  try {
    await client.query(`UPDATE public.workspace_orders SET ${sets.join(", ")} WHERE id = $1`, values);
  } catch (error) {
    if (error.code === "23505") throw new HttpError(409, "该快递单号已被其他订单使用");
    throw error;
  }
  await insertOrderLog(client, order.id, action, order.status, rule.to, scope.operator, note);
}

export function createOrderRouter({ express, directDbPool }) {
  const router = express.Router();
  const canView = requirePermission("orders_view", "orders_edit");
  const canEdit = requirePermission("orders_edit");

  const loadOrder = async (db, orderId) => {
    const { rows } = await db.query(`${ORDER_SELECT} WHERE o.id = $1`, [orderId]);
    return mapOrderRow(rows[0]);
  };

  router.get("/orders", canView, handle("orders", async (req, res) => {
    const scope = getScope(req);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 15));
    const { where, params } = buildListFilter(scope, req.query);

    const [list, counts, totals] = await Promise.all([
      directDbPool.query(
        `${ORDER_SELECT} WHERE ${where} ORDER BY COALESCE(o.platform_created_at, o.created_at) DESC, o.id DESC
         LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
        params
      ),
      directDbPool.query(
        `SELECT status, COUNT(*)::int AS count FROM public.workspace_orders
         WHERE owner_user_id = $1 AND warehouse_code = $2 GROUP BY status`,
        [scope.ownerUserId, scope.warehouseCode]
      ),
      directDbPool.query(
        `SELECT COUNT(*)::int AS total FROM public.workspace_orders o
         JOIN public.workspace_customers c ON c.id = o.customer_id JOIN public.workspace_shops s ON s.id = o.shop_id
         WHERE ${where}`,
        params
      ),
    ]);

    const tabCounts = Object.fromEntries(TAB_STATUSES.map((s) => [s, 0]));
    counts.rows.forEach((row) => { tabCounts[row.status] = row.count; });
    res.json({ items: list.rows.map(mapOrderRow), total: totals.rows[0].total, tabCounts });
  }));

  router.get("/orders/:id/logs", canView, handle("orders", async (req, res) => {
    const scope = getScope(req);
    const { rows } = await directDbPool.query(
      `SELECT l.* FROM public.workspace_order_logs l JOIN public.workspace_orders o ON o.id = l.order_id
       WHERE l.order_id = $1 AND o.owner_user_id = $2 AND o.warehouse_code = $3
       ORDER BY l.created_at DESC, l.id DESC`,
      [req.params.id, scope.ownerUserId, scope.warehouseCode]
    );
    res.json({
      logs: rows.map((l) => ({
        id: String(l.id), orderId: String(l.order_id), action: l.action, fromStatus: l.from_status ?? undefined,
        toStatus: l.to_status, operator: l.operator, note: l.note || undefined, createdAt: utcText(l.created_at),
      })),
    });
  }));

  router.post("/orders/:id/actions/:action", canEdit, handle("orders", async (req, res) => {
    const scope = getScope(req);
    const order = await withTransaction(directDbPool, async (client) => {
      await applyOrderAction(client, scope, req.params.id, req.params.action, req.body);
      return loadOrder(client, req.params.id);
    });
    res.json({ order });
  }));

  /** 扫码发货：面单号或平台单号均可 */
  router.post("/orders/ship-by-code", canEdit, handle("orders", async (req, res) => {
    const scope = getScope(req);
    const code = requiredText(req.body?.code, "快递面单号", 100);
    const order = await withTransaction(directDbPool, async (client) => {
      const { rows } = await client.query(
        `SELECT id, status FROM public.workspace_orders
         WHERE owner_user_id = $1 AND warehouse_code = $2 AND (tracking_no = $3 OR platform_order_no = $3)
         ORDER BY (tracking_no = $3) DESC LIMIT 1`,
        [scope.ownerUserId, scope.warehouseCode, code]
      );
      if (!rows[0]) throw new HttpError(404, `未找到面单号 ${code} 对应的订单`);
      if (rows[0].status === "shipped") throw new HttpError(409, `面单 ${code} 已发货，请勿重复扫描`);
      await applyOrderAction(client, scope, rows[0].id, "ship");
      return loadOrder(client, rows[0].id);
    });
    res.json({ order });
  }));

  /** 批量执行同一动作：逐单保存点隔离，单笔失败不影响其他订单 */
  router.post("/orders/batch", canEdit, handle("orders", async (req, res) => {
    const scope = getScope(req);
    const action = req.body?.action;
    if (!["print", "ship", "void"].includes(action)) throw new HttpError(400, "不支持的批量操作");
    const orderIds = Array.isArray(req.body?.orderIds) ? [...new Set(req.body.orderIds.map(String))] : [];
    if (orderIds.length === 0 || orderIds.length > MAX_BATCH) throw new HttpError(400, `请选择 1~${MAX_BATCH} 个订单`);

    const result = await withTransaction(directDbPool, async (client) => {
      const summary = { succeeded: [], failed: [] };
      for (const orderId of orderIds) {
        await client.query("SAVEPOINT batch_order");
        try {
          await applyOrderAction(client, scope, orderId, action, req.body);
          await client.query("RELEASE SAVEPOINT batch_order");
          summary.succeeded.push(orderId);
        } catch (error) {
          await client.query("ROLLBACK TO SAVEPOINT batch_order");
          if (!(error instanceof HttpError)) throw error;
          summary.failed.push({ orderId, reason: error.message });
        }
      }
      return summary;
    });
    res.json(result);
  }));

  /** 待配对商品：按店铺 + 平台商品规格聚合，附带涉及订单数 */
  router.get("/pairings/pending", canView, handle("orders", async (req, res) => {
    const scope = getScope(req);
    const { rows } = await directDbPool.query(
      `SELECT s.id AS shop_id, s.shop_name, s.platform, c.customer_code, c.name AS customer_name,
         i.platform_item_id, i.platform_model_id, MAX(i.platform_sku) AS platform_sku,
         MAX(i.item_name) AS item_name, MAX(i.model_name) AS model_name, MAX(i.image_url) AS image_url,
         COUNT(DISTINCT o.id)::int AS order_count, SUM(i.qty)::int AS total_qty
       FROM public.workspace_order_items i
       JOIN public.workspace_orders o ON o.id = i.order_id
       JOIN public.workspace_shops s ON s.id = o.shop_id
       JOIN public.workspace_customers c ON c.id = o.customer_id
       WHERE o.owner_user_id = $1 AND o.warehouse_code = $2 AND o.status = 'pending_pair' AND i.product_id IS NULL
       GROUP BY s.id, s.shop_name, s.platform, c.customer_code, c.name, i.platform_item_id, i.platform_model_id
       ORDER BY order_count DESC`,
      [scope.ownerUserId, scope.warehouseCode]
    );
    res.json({
      items: rows.map((r) => ({
        shopRecordId: String(r.shop_id), shopName: r.shop_name, platform: r.platform,
        customerId: r.customer_code, customerName: r.customer_name,
        platformItemId: r.platform_item_id, platformModelId: r.platform_model_id, platformSku: r.platform_sku,
        itemName: r.item_name, modelName: r.model_name, imageUrl: r.image_url,
        orderCount: r.order_count, totalQty: r.total_qty,
      })),
    });
  }));

  /** 建立配对并推进受影响的待配对订单（全部配对后锁库存进入待打单，库存不足进入异常） */
  router.post("/pairings", canEdit, handle("orders", async (req, res) => {
    const scope = getScope(req);
    const platformItemId = requiredText(req.body?.platformItemId, "平台商品ID", 64);
    const platformModelId = text(req.body?.platformModelId, 64) || "0";
    const unitQty = Number(req.body?.qty ?? 1);
    if (!Number.isInteger(unitQty) || unitQty <= 0) throw new HttpError(400, "配对数量必须是正整数");

    const result = await withTransaction(directDbPool, async (client) => {
      const { rows: shops } = await client.query(
        `SELECT s.id, s.customer_id FROM public.workspace_shops s JOIN public.workspace_customers c ON c.id = s.customer_id
         WHERE s.id = $1 AND c.owner_user_id = $2 AND c.warehouse_code = $3`,
        [req.body?.shopRecordId, scope.ownerUserId, scope.warehouseCode]
      );
      if (!shops[0]) throw new HttpError(404, "店铺不存在");
      const { rows: products } = await client.query(
        `SELECT id FROM public.workspace_products WHERE id = $1 AND customer_id = $2`,
        [req.body?.productRecordId, shops[0].customer_id]
      );
      if (!products[0]) throw new HttpError(400, "只能配对到该店铺所属客户的商品");

      await client.query(
        `INSERT INTO public.workspace_sku_pairings
          (shop_id, platform_item_id, platform_model_id, product_id, qty, platform_item_name, platform_model_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (shop_id, platform_item_id, platform_model_id)
         DO UPDATE SET product_id = EXCLUDED.product_id, qty = EXCLUDED.qty, updated_at = now()`,
        [shops[0].id, platformItemId, platformModelId, products[0].id, unitQty, text(req.body?.itemName), text(req.body?.modelName)]
      );

      const { rows: affected } = await client.query(
        `UPDATE public.workspace_order_items i SET product_id = $4, deduct_qty = i.qty * $5
         FROM public.workspace_orders o
         WHERE o.id = i.order_id AND o.shop_id = $1 AND o.status = 'pending_pair'
           AND i.platform_item_id = $2 AND i.platform_model_id = $3 AND i.product_id IS NULL
         RETURNING i.order_id`,
        [shops[0].id, platformItemId, platformModelId, products[0].id, unitQty]
      );

      const summary = { pendingPrint: 0, outOfStock: 0, stillPending: 0 };
      const orderIds = [...new Set(affected.map((row) => row.order_id))].sort((a, b) => a - b);
      for (const orderId of orderIds) {
        await client.query(`SELECT id FROM public.workspace_orders WHERE id = $1 FOR UPDATE`, [orderId]);
        const status = await advancePendingPairOrder(client, orderId, scope.operator, "pair");
        if (status === "pending_print") summary.pendingPrint += 1;
        else if (status === "anomaly") summary.outOfStock += 1;
        else summary.stillPending += 1;
      }
      return summary;
    });
    res.json(result);
  }));

  return router;
}

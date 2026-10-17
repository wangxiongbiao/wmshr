/** 订单状态机与库存锁定。所有函数须在调用方开启的事务内执行。 */

export const ACTION_RULES = {
  print: { from: ["pending_print"], to: "printed", label: "打印面单" },
  ship: { from: ["printed"], to: "shipped", label: "发货" },
  markAnomaly: { from: ["pending_print", "printed"], to: "anomaly", label: "登记异常" },
  resolveAnomaly: { from: ["anomaly"], to: "pending_print", label: "异常重新处理" },
  void: { from: ["pending_pair", "pending_print", "printed", "anomaly"], to: "canceled", label: "作废" },
};

export const OUT_OF_STOCK_REASON = "库存不足，补货后请点击「异常重新处理」";

export async function insertOrderLog(db, orderId, action, fromStatus, toStatus, operator, note = "") {
  await db.query(
    `INSERT INTO public.workspace_order_logs (order_id, action, from_status, to_status, operator, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [orderId, action, fromStatus, toStatus, operator, note]
  );
}

/** 扣减订单全部商品的可用库存；任一商品不足则整体回滚并返回 false。按商品主键顺序加锁避免死锁。 */
export async function tryLockInventory(db, orderId) {
  const { rows } = await db.query(
    `SELECT product_id, SUM(deduct_qty)::int AS qty FROM public.workspace_order_items
     WHERE order_id = $1 GROUP BY product_id ORDER BY product_id`,
    [orderId]
  );
  if (rows.some((row) => row.product_id === null)) {
    throw new Error(`订单 ${orderId} 仍有未配对商品，不能锁定库存`);
  }

  await db.query("SAVEPOINT lock_inventory");
  for (const row of rows) {
    const updated = await db.query(
      `UPDATE public.workspace_products SET inventory = inventory - $2, updated_at = now()
       WHERE id = $1 AND inventory >= $2`,
      [row.product_id, row.qty]
    );
    if (updated.rowCount === 0) {
      await db.query("ROLLBACK TO SAVEPOINT lock_inventory");
      return false;
    }
  }
  await db.query("RELEASE SAVEPOINT lock_inventory");
  await db.query(`UPDATE public.workspace_orders SET inventory_locked = true WHERE id = $1`, [orderId]);
  return true;
}

export async function releaseInventory(db, orderId) {
  await db.query(
    `UPDATE public.workspace_products p SET inventory = p.inventory + x.qty, updated_at = now()
     FROM (SELECT product_id, SUM(deduct_qty)::int AS qty FROM public.workspace_order_items
           WHERE order_id = $1 GROUP BY product_id) x
     WHERE p.id = x.product_id`,
    [orderId]
  );
  await db.query(`UPDATE public.workspace_orders SET inventory_locked = false WHERE id = $1`, [orderId]);
}

/**
 * 待配对订单在全部商品配对后进入履约：锁定库存成功 → 待打单，否则 → 异常（库存不足）。
 * 仍有未配对商品时保持 pending_pair。返回最终状态。
 */
export async function advancePendingPairOrder(db, orderId, operator, action) {
  const { rows } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE product_id IS NULL)::int AS unpaired FROM public.workspace_order_items WHERE order_id = $1`,
    [orderId]
  );
  if (rows[0].unpaired > 0) return "pending_pair";

  const locked = await tryLockInventory(db, orderId);
  const status = locked ? "pending_print" : "anomaly";
  await db.query(
    `UPDATE public.workspace_orders SET status = $2, reason = $3, updated_at = now() WHERE id = $1`,
    [orderId, status, locked ? null : OUT_OF_STOCK_REASON]
  );
  await insertOrderLog(db, orderId, action, "pending_pair", status, operator, locked ? "库存已锁定" : OUT_OF_STOCK_REASON);
  return status;
}

/**
 * 解析平台商品规格对应的本仓商品：优先使用已有配对；没有配对时按平台 SKU（规格 SKU 优先）
 * 精确匹配店铺所属客户的商品 SKU，命中则自动写入配对表。返回 null 表示需人工配对。
 */
export async function resolvePairing(db, { shopId, customerId }, item) {
  const { rows: pairings } = await db.query(
    `SELECT product_id, qty FROM public.workspace_sku_pairings
     WHERE shop_id = $1 AND platform_item_id = $2 AND platform_model_id = $3`,
    [shopId, item.platformItemId, item.platformModelId]
  );
  if (pairings[0]) return { productId: pairings[0].product_id, unitQty: pairings[0].qty };

  const candidates = [item.modelSku, item.itemSku].filter(Boolean);
  if (candidates.length === 0) return null;
  const { rows: products } = await db.query(
    `SELECT id FROM public.workspace_products WHERE customer_id = $1 AND sku = ANY($2::text[])
     ORDER BY array_position($2::text[], sku) LIMIT 1`,
    [customerId, candidates]
  );
  if (!products[0]) return null;

  await db.query(
    `INSERT INTO public.workspace_sku_pairings
      (shop_id, platform_item_id, platform_model_id, product_id, qty, platform_item_name, platform_model_name)
     VALUES ($1, $2, $3, $4, 1, $5, $6)
     ON CONFLICT (shop_id, platform_item_id, platform_model_id) DO NOTHING`,
    [shopId, item.platformItemId, item.platformModelId, products[0].id, item.itemName, item.modelName]
  );
  return { productId: products[0].id, unitQty: 1 };
}

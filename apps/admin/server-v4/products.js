import {
  HttpError,
  getScope,
  handle,
  nonNegativeInt,
  optionalPositiveNumber,
  requirePermission,
  requiredText,
  text,
  withTransaction,
} from "./commerce-common.js";
import { findCustomerId } from "./customers.js";

const PRODUCT_SELECT = `
  SELECT p.*, c.customer_code, c.name AS customer_name
  FROM public.workspace_products p JOIN public.workspace_customers c ON c.id = p.customer_id`;

const SCOPE_FILTER = `c.owner_user_id = $1 AND c.warehouse_code = $2`;

const nullableNumber = (value) => (value === null || value === undefined ? undefined : Number(value));
const utcText = (value) => (value ? new Date(value).toISOString().replace("T", " ").slice(0, 19) : undefined);

export function mapProductRow(row) {
  return {
    recordId: String(row.id),
    id: row.sku,
    name: row.name,
    spec: row.spec || undefined,
    customerId: row.customer_code,
    customerName: row.customer_name,
    inventory: row.inventory,
    shelfLocation: row.shelf_location || undefined,
    note: row.note || undefined,
    imageUrl: row.image_url || undefined,
    lastStocktakeTime: utcText(row.last_stocktake_time),
    lastStocktakeQty: row.last_stocktake_qty ?? undefined,
    length: nullableNumber(row.length),
    width: nullableNumber(row.width),
    height: nullableNumber(row.height),
    weight: nullableNumber(row.weight),
    volume: nullableNumber(row.volume),
  };
}

function parseProductBody(body) {
  const length = optionalPositiveNumber(body?.length, "长度");
  const width = optionalPositiveNumber(body?.width, "宽度");
  const height = optionalPositiveNumber(body?.height, "高度");
  return {
    name: requiredText(body?.name, "商品名称"),
    spec: text(body?.spec),
    inventory: nonNegativeInt(body?.inventory, "库存"),
    shelfLocation: text(body?.shelfLocation, 100),
    note: text(body?.note, 2000),
    imageUrl: text(body?.imageUrl, 2000),
    length,
    width,
    height,
    weight: optionalPositiveNumber(body?.weight, "重量"),
    volume: length && width && height ? length * width * height : null,
  };
}

export function createProductRouter({ express, directDbPool }) {
  const router = express.Router();
  const canView = requirePermission("products_view", "products_edit");
  const canEdit = requirePermission("products_edit");

  const loadProduct = async (db, productId) => {
    const { rows } = await db.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [productId]);
    return mapProductRow(rows[0]);
  };

  /** 校验商品属于当前作用域并返回主键 */
  const findProductId = async (db, scope, recordId, { forUpdate = false } = {}) => {
    const { rows } = await db.query(
      `SELECT p.id FROM public.workspace_products p JOIN public.workspace_customers c ON c.id = p.customer_id
       WHERE p.id = $3 AND ${SCOPE_FILTER}${forUpdate ? " FOR UPDATE OF p" : ""}`,
      [scope.ownerUserId, scope.warehouseCode, recordId]
    );
    if (!rows[0]) throw new HttpError(404, "商品不存在");
    return rows[0].id;
  };

  router.get("/products", canView, handle("products", async (req, res) => {
    const scope = getScope(req);
    const { rows } = await directDbPool.query(
      `${PRODUCT_SELECT} WHERE ${SCOPE_FILTER} ORDER BY c.created_at, p.created_at`,
      [scope.ownerUserId, scope.warehouseCode]
    );
    res.json({ products: rows.map(mapProductRow) });
  }));

  router.post("/products", canEdit, handle("products", async (req, res) => {
    const scope = getScope(req);
    const sku = requiredText(req.body?.id, "商品编码(SKU)", 128);
    const customerId = await findCustomerId(directDbPool, scope, requiredText(req.body?.customerId, "所属客户"));
    const p = parseProductBody(req.body);
    const { rows } = await directDbPool.query(
      `INSERT INTO public.workspace_products
        (customer_id, sku, name, spec, inventory, shelf_location, note, image_url, last_stocktake_time,
         length, width, height, weight, volume)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9,$10,$11,$12,$13)
       ON CONFLICT (customer_id, sku) DO NOTHING
       RETURNING id`,
      [customerId, sku, p.name, p.spec, p.inventory, p.shelfLocation, p.note, p.imageUrl,
        p.length, p.width, p.height, p.weight, p.volume]
    );
    if (!rows[0]) throw new HttpError(409, "该客户下已有此SKU，请勿重复定义");
    res.status(201).json({ product: await loadProduct(directDbPool, rows[0].id) });
  }));

  router.put("/products/:recordId", canEdit, handle("products", async (req, res) => {
    const scope = getScope(req);
    const productId = await findProductId(directDbPool, scope, req.params.recordId);
    const customerId = await findCustomerId(directDbPool, scope, requiredText(req.body?.customerId, "所属客户"));
    const p = parseProductBody(req.body);
    await directDbPool.query(
      `UPDATE public.workspace_products SET customer_id = $2, name = $3, spec = $4, inventory = $5,
         shelf_location = $6, note = $7, image_url = $8, length = $9, width = $10, height = $11,
         weight = $12, volume = $13, updated_at = now()
       WHERE id = $1`,
      [productId, customerId, p.name, p.spec, p.inventory, p.shelfLocation, p.note, p.imageUrl,
        p.length, p.width, p.height, p.weight, p.volume]
    );
    res.json({ product: await loadProduct(directDbPool, productId) });
  }));

  router.patch("/products/:recordId/location", canEdit, handle("products", async (req, res) => {
    const scope = getScope(req);
    const productId = await findProductId(directDbPool, scope, req.params.recordId);
    await directDbPool.query(
      `UPDATE public.workspace_products SET shelf_location = $2, updated_at = now() WHERE id = $1`,
      [productId, text(req.body?.shelfLocation, 100)]
    );
    res.json({ product: await loadProduct(directDbPool, productId) });
  }));

  /** 盘点：以实盘数覆盖可用库存，并记录盘点前数量 */
  router.post("/products/:recordId/stocktake", canEdit, handle("products", async (req, res) => {
    const scope = getScope(req);
    const qty = nonNegativeInt(req.body?.qty, "实盘数量");
    const note = text(req.body?.note, 500);
    const product = await withTransaction(directDbPool, async (client) => {
      const productId = await findProductId(client, scope, req.params.recordId, { forUpdate: true });
      await client.query(
        `UPDATE public.workspace_products SET
           last_stocktake_qty = inventory,
           inventory = $2,
           last_stocktake_time = now(),
           shelf_location = $3,
           note = CASE WHEN $4 = '' THEN note
                       ELSE '[盘点备注 ' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') || ']: ' || $4 || ' | ' || note END,
           updated_at = now()
         WHERE id = $1`,
        [productId, qty, text(req.body?.shelfLocation, 100), note]
      );
      return loadProduct(client, productId);
    });
    res.json({ product });
  }));

  router.delete("/products/:recordId", canEdit, handle("products", async (req, res) => {
    const scope = getScope(req);
    const productId = await findProductId(directDbPool, scope, req.params.recordId);
    try {
      await directDbPool.query(`DELETE FROM public.workspace_products WHERE id = $1`, [productId]);
    } catch (error) {
      if (error.code === "23503") throw new HttpError(409, "该商品已关联订单，无法删除");
      throw error;
    }
    res.status(204).end();
  }));

  /**
   * 从已签收入库单导入库存：同一入库单只导入一次；按客户名称匹配客户，匹配不到的入库单跳过并返回。
   * body.entries: [{ entryNo, customerName, shippingMark, goodsName, skus: [{ sku, desc, qty }] }]
   */
  router.post("/products/inbound-imports", canEdit, handle("products", async (req, res) => {
    const scope = getScope(req);
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (entries.length === 0) throw new HttpError(400, "没有可导入的入库单");

    const result = await withTransaction(directDbPool, async (client) => {
      const summary = { created: 0, updated: 0, alreadyImported: [], unmatchedCustomers: [] };
      for (const entry of entries) {
        const entryNo = requiredText(entry?.entryNo, "入库单号", 100);
        const { rows: customers } = await client.query(
          `SELECT id FROM public.workspace_customers WHERE owner_user_id = $1 AND warehouse_code = $2 AND name = $3`,
          [scope.ownerUserId, scope.warehouseCode, text(entry?.customerName, 200)]
        );
        if (customers.length !== 1) {
          summary.unmatchedCustomers.push(entryNo);
          continue;
        }
        const { rows: claimed } = await client.query(
          `INSERT INTO public.workspace_inbound_imports (owner_user_id, warehouse_code, entry_no) VALUES ($1, $2, $3)
           ON CONFLICT (owner_user_id, warehouse_code, entry_no) DO NOTHING RETURNING id`,
          [scope.ownerUserId, scope.warehouseCode, entryNo]
        );
        if (!claimed[0]) {
          summary.alreadyImported.push(entryNo);
          continue;
        }

        for (const item of Array.isArray(entry.skus) ? entry.skus : []) {
          const sku = text(item?.sku, 128);
          const qty = Number(item?.qty);
          if (!sku || !Number.isInteger(qty) || qty <= 0) continue;
          const { rows } = await client.query(
            `INSERT INTO public.workspace_products (customer_id, sku, name, spec, inventory, shelf_location, note, last_stocktake_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, now())
             ON CONFLICT (customer_id, sku) DO UPDATE SET
               inventory = public.workspace_products.inventory + EXCLUDED.inventory,
               note = '[已叠加入库单 ' || $8 || '] ' || public.workspace_products.note,
               updated_at = now()
             RETURNING (xmax = 0) AS inserted`,
            [customers[0].id, sku, text(item?.desc) || text(entry?.goodsName) || sku, text(item?.desc), qty,
              text(entry?.shippingMark, 100), `从入库单 ${entryNo} 导入`, entryNo]
          );
          summary[rows[0].inserted ? "created" : "updated"] += 1;
        }
      }
      return summary;
    });
    res.json(result);
  }));

  return router;
}

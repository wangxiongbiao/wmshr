import {
  HttpError,
  getScope,
  handle,
  nonNegativeNumber,
  requirePermission,
  requiredText,
  text,
  withTransaction,
} from "./commerce-common.js";

const CUSTOMER_SELECT = `
  SELECT c.*,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', s.id::text, 'platform', s.platform, 'shopName', s.shop_name, 'shopId', s.platform_shop_id,
        'status', s.status, 'authorizedAt', to_char(s.authorized_at, 'YYYY-MM-DD'),
        'lastSyncedAt', to_char(s.last_synced_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      ) ORDER BY s.id)
      FROM public.workspace_shops s WHERE s.customer_id = c.id
    ), '[]'::json) AS shops,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', l.id::text, 'type', l.type, 'amount', l.amount, 'balanceAfter', l.balance_after,
        'note', l.note, 'operator', l.operator,
        'createdAt', to_char(l.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      ) ORDER BY l.created_at DESC)
      FROM public.workspace_customer_credit_logs l WHERE l.customer_id = c.id
    ), '[]'::json) AS credit_logs
  FROM public.workspace_customers c`;

export function mapCustomerRow(row) {
  return {
    id: row.customer_code,
    name: row.name,
    contact: row.contact,
    currency: row.currency,
    availableLimit: Number(row.available_limit),
    creditLimit: Number(row.credit_limit),
    billingTemplate: row.billing_template,
    status: row.status,
    shops: row.shops,
    creditLogs: row.credit_logs.map((log) => ({ ...log, amount: Number(log.amount), balanceAfter: Number(log.balanceAfter) })),
    address: row.address || undefined,
    taxNo: row.tax_no || undefined,
    bankAccount: row.bank_account || undefined,
    bankName: row.bank_name || undefined,
  };
}

function parseCustomerBody(body) {
  const availableLimit = Number(body?.availableLimit ?? 0);
  if (!Number.isFinite(availableLimit)) throw new HttpError(400, "可用额度必须是数字");
  return {
    name: requiredText(body?.name, "客户名称"),
    contact: requiredText(body?.contact, "对接人"),
    currency: requiredText(body?.currency || "CNY", "结算货币", 10).toUpperCase(),
    availableLimit,
    creditLimit: nonNegativeNumber(body?.creditLimit, "信用额度"),
    billingTemplate: text(body?.billingTemplate, 100),
    address: text(body?.address),
    taxNo: text(body?.taxNo, 100),
    bankAccount: text(body?.bankAccount, 100),
    bankName: text(body?.bankName, 200),
  };
}

/** 读取作用域内客户主键；不存在时 404 */
export async function findCustomerId(db, { ownerUserId, warehouseCode }, customerCode, { forUpdate = false } = {}) {
  const { rows } = await db.query(
    `SELECT id FROM public.workspace_customers WHERE owner_user_id = $1 AND warehouse_code = $2 AND customer_code = $3${forUpdate ? " FOR UPDATE" : ""}`,
    [ownerUserId, warehouseCode, customerCode]
  );
  if (!rows[0]) throw new HttpError(404, `客户 ${customerCode} 不存在`);
  return rows[0].id;
}

export function createCustomerRouter({ express, directDbPool }) {
  const router = express.Router();
  // 客户列表同时是发票、快递、商品、订单模块的下拉基础数据
  const canList = requirePermission("customers_view", "customers_edit", "customers_recharge", "products_view", "orders_view", "expenses_view");
  const canEdit = requirePermission("customers_edit");

  const loadCustomer = async (db, customerId) => {
    const { rows } = await db.query(`${CUSTOMER_SELECT} WHERE c.id = $1`, [customerId]);
    return mapCustomerRow(rows[0]);
  };

  router.get("/customers", canList, handle("customers", async (req, res) => {
    const scope = getScope(req);
    const { rows } = await directDbPool.query(
      `${CUSTOMER_SELECT} WHERE c.owner_user_id = $1 AND c.warehouse_code = $2 ORDER BY c.created_at`,
      [scope.ownerUserId, scope.warehouseCode]
    );
    res.json({ customers: rows.map(mapCustomerRow) });
  }));

  router.post("/customers", canEdit, handle("customers", async (req, res) => {
    const scope = getScope(req);
    const code = requiredText(req.body?.id, "客户ID", 64);
    const c = parseCustomerBody(req.body);
    const { rows } = await directDbPool.query(
      `INSERT INTO public.workspace_customers
        (owner_user_id, warehouse_code, customer_code, name, contact, currency, available_limit, credit_limit,
         billing_template, address, tax_no, bank_account, bank_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (owner_user_id, warehouse_code, customer_code) DO NOTHING
       RETURNING id`,
      [scope.ownerUserId, scope.warehouseCode, code, c.name, c.contact, c.currency, c.availableLimit, c.creditLimit,
        c.billingTemplate, c.address, c.taxNo, c.bankAccount, c.bankName]
    );
    if (!rows[0]) throw new HttpError(409, "该客户ID已存在，请维护唯一ID");
    res.status(201).json({ customer: await loadCustomer(directDbPool, rows[0].id) });
  }));

  router.put("/customers/:code", canEdit, handle("customers", async (req, res) => {
    const scope = getScope(req);
    const customerId = await findCustomerId(directDbPool, scope, req.params.code);
    const c = parseCustomerBody(req.body);
    await directDbPool.query(
      `UPDATE public.workspace_customers SET name = $2, contact = $3, currency = $4, available_limit = $5,
         credit_limit = $6, billing_template = $7, address = $8, tax_no = $9, bank_account = $10, bank_name = $11,
         updated_at = now()
       WHERE id = $1`,
      [customerId, c.name, c.contact, c.currency, c.availableLimit, c.creditLimit, c.billingTemplate,
        c.address, c.taxNo, c.bankAccount, c.bankName]
    );
    res.json({ customer: await loadCustomer(directDbPool, customerId) });
  }));

  router.patch("/customers/:code/status", canEdit, handle("customers", async (req, res) => {
    const scope = getScope(req);
    const status = req.body?.status;
    if (status !== "enabled" && status !== "disabled") throw new HttpError(400, "无效的客户状态");
    const customerId = await findCustomerId(directDbPool, scope, req.params.code);
    await directDbPool.query(`UPDATE public.workspace_customers SET status = $2, updated_at = now() WHERE id = $1`, [customerId, status]);
    res.json({ customer: await loadCustomer(directDbPool, customerId) });
  }));

  router.delete("/customers/:code", canEdit, handle("customers", async (req, res) => {
    const scope = getScope(req);
    const customerId = await findCustomerId(directDbPool, scope, req.params.code);
    try {
      await directDbPool.query(`DELETE FROM public.workspace_customers WHERE id = $1`, [customerId]);
    } catch (error) {
      if (error.code === "23503") throw new HttpError(409, "该客户下仍有商品、店铺或订单，请先处理后再删除");
      throw error;
    }
    res.status(204).end();
  }));

  /** 充值 / 消耗：锁定客户行，余额变更与流水写入同一事务 */
  router.post("/customers/:code/credit-logs", requirePermission("customers_recharge"), handle("customers", async (req, res) => {
    const scope = getScope(req);
    const type = req.body?.type;
    if (type !== "recharge" && type !== "consumption") throw new HttpError(400, "无效的流水类型");
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "请输入大于 0 的有效发生金额");
    const note = requiredText(req.body?.note, "用途或凭证备注");
    const operator = text(req.body?.operator, 100) || scope.operator;

    const customer = await withTransaction(directDbPool, async (client) => {
      const customerId = await findCustomerId(client, scope, req.params.code, { forUpdate: true });
      const { rows } = await client.query(
        `UPDATE public.workspace_customers
         SET available_limit = available_limit + $2, updated_at = now()
         WHERE id = $1 RETURNING available_limit`,
        [customerId, type === "recharge" ? amount : -amount]
      );
      await client.query(
        `INSERT INTO public.workspace_customer_credit_logs (customer_id, type, amount, balance_after, note, operator)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [customerId, type, amount, rows[0].available_limit, note, operator]
      );
      return loadCustomer(client, customerId);
    });
    res.status(201).json({ customer });
  }));

  router.patch("/shops/:shopId/status", canEdit, handle("customers", async (req, res) => {
    const scope = getScope(req);
    const status = req.body?.status;
    if (status !== "enabled" && status !== "disabled") throw new HttpError(400, "无效的店铺状态");
    const { rows } = await directDbPool.query(
      `UPDATE public.workspace_shops s SET status = $4, updated_at = now()
       FROM public.workspace_customers c
       WHERE s.id = $1 AND s.customer_id = c.id AND c.owner_user_id = $2 AND c.warehouse_code = $3 AND s.status <> 'revoked'
       RETURNING s.customer_id`,
      [req.params.shopId, scope.ownerUserId, scope.warehouseCode, status]
    );
    if (!rows[0]) throw new HttpError(404, "店铺不存在或授权已失效");
    res.json({ customer: await loadCustomer(directDbPool, rows[0].customer_id) });
  }));

  /** 解除授权：清除令牌；无历史订单时直接删除店铺记录，有订单则保留为 revoked 以维持订单归属 */
  router.delete("/shops/:shopId", canEdit, handle("customers", async (req, res) => {
    const scope = getScope(req);
    const customerId = await withTransaction(directDbPool, async (client) => {
      const { rows } = await client.query(
        `SELECT s.id, s.customer_id, EXISTS (SELECT 1 FROM public.workspace_orders o WHERE o.shop_id = s.id) AS has_orders
         FROM public.workspace_shops s JOIN public.workspace_customers c ON c.id = s.customer_id
         WHERE s.id = $1 AND c.owner_user_id = $2 AND c.warehouse_code = $3 FOR UPDATE OF s`,
        [req.params.shopId, scope.ownerUserId, scope.warehouseCode]
      );
      const shop = rows[0];
      if (!shop) throw new HttpError(404, "店铺不存在");
      if (shop.has_orders) {
        await client.query(
          `UPDATE public.workspace_shops SET status = 'revoked', access_token_enc = NULL, refresh_token_enc = NULL,
             access_expires_at = NULL, updated_at = now() WHERE id = $1`,
          [shop.id]
        );
      } else {
        await client.query(`DELETE FROM public.workspace_shops WHERE id = $1`, [shop.id]);
      }
      return shop.customer_id;
    });
    res.json({ customer: await loadCustomer(directDbPool, customerId) });
  }));

  return router;
}

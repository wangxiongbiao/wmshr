import { HttpError, getScope, handle, requirePermission, withTransaction } from "./commerce-common.js";
import { findCustomerId } from "./customers.js";
import { advancePendingPairOrder, insertOrderLog, releaseInventory, resolvePairing } from "./order-core.js";
import {
  ORDER_LIST_MAX_RANGE_SECONDS,
  ShopeeApiError,
  decryptToken,
  encryptToken,
  signAuthState,
  verifyAuthState,
} from "./shopee.js";

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const SYNC_OVERLAP_SECONDS = 3600;
const IMPORTABLE_STATUSES = new Set(["READY_TO_SHIP", "PROCESSED"]);
const CANCEL_REASON = "Shopee 平台订单已取消";

/** 把 Shopee 订单详情转换为入库所需结构 */
export function normalizeShopeeOrder(detail) {
  const address = detail.recipient_address || {};
  return {
    orderSn: detail.order_sn,
    status: detail.order_status,
    currency: detail.currency || "",
    totalAmount: Number(detail.total_amount || 0),
    carrier: detail.shipping_carrier || null,
    createdAt: detail.create_time ? new Date(detail.create_time * 1000).toISOString() : null,
    receiverName: address.name || "",
    receiverPhone: address.phone || "",
    receiverAddress: address.full_address || "",
    items: (detail.item_list || []).map((item) => ({
      platformItemId: String(item.item_id),
      platformModelId: String(item.model_id || 0),
      modelSku: (item.model_sku || "").trim(),
      itemSku: (item.item_sku || "").trim(),
      itemName: item.item_name || "",
      modelName: item.model_name || "",
      imageUrl: item.image_info?.image_url || "",
      qty: Number(item.model_quantity_purchased || 0),
      unitPrice: Number(item.model_discounted_price ?? item.model_original_price ?? 0),
    })).filter((item) => item.qty > 0),
  };
}

export function createShopeeRouter({ express, directDbPool, shopee, encKey, authSecret, frontendBase }) {
  const router = express.Router();

  /** 在调用方事务内返回有效 access_token；临近过期则刷新并轮换 refresh_token。刷新被拒时标记店铺授权失效并返回 null。 */
  async function ensureAccessToken(client, shop) {
    if (shop.access_expires_at && new Date(shop.access_expires_at).getTime() - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
      return decryptToken(encKey, shop.access_token_enc);
    }
    try {
      const token = await shopee.refreshAccessToken(decryptToken(encKey, shop.refresh_token_enc), shop.platform_shop_id);
      await client.query(
        `UPDATE public.workspace_shops SET access_token_enc = $2, refresh_token_enc = $3, access_expires_at = $4, updated_at = now()
         WHERE id = $1`,
        [shop.id, encryptToken(encKey, token.accessToken), encryptToken(encKey, token.refreshToken), token.accessExpiresAt]
      );
      return token.accessToken;
    } catch (error) {
      if (!(error instanceof ShopeeApiError)) throw error;
      console.warn(`[admin-v4/shopee] shop ${shop.platform_shop_id} token refresh rejected: ${error.message}`);
      await client.query(
        `UPDATE public.workspace_shops SET status = 'revoked', access_token_enc = NULL, refresh_token_enc = NULL,
           access_expires_at = NULL, updated_at = now() WHERE id = $1`,
        [shop.id]
      );
      return null;
    }
  }

  router.post("/customers/:code/shopee/auth-url", requirePermission("customers_edit"), handle("shopee", async (req, res) => {
    const scope = getScope(req);
    await findCustomerId(directDbPool, scope, req.params.code);
    const state = signAuthState(authSecret, { ownerUserId: scope.ownerUserId, warehouseCode: scope.warehouseCode, customerCode: req.params.code });
    res.json({ url: shopee.buildAuthUrl(state) });
  }));

  /** 授权回调（公开路由，凭签名 state 识别发起方）。完成后重定向回客户管理页并携带结果。 */
  const handleCallback = async (req, res) => {
    const back = (status, message) =>
      res.redirect(`${frontendBase}/zh-CN/customers?shopee_auth=${status}&message=${encodeURIComponent(message)}`);
    try {
      const scope = verifyAuthState(authSecret, req.query.state);
      if (!scope) return back("error", "授权链接已过期或无效，请重新发起授权");
      const code = String(req.query.code || "");
      const shopId = String(req.query.shop_id || "");
      if (!code || !/^\d+$/.test(shopId)) return back("error", "Shopee 未返回店铺授权信息（暂不支持主账号批量授权）");

      const token = await shopee.exchangeCode(code, shopId);
      const info = await shopee.getShopInfo(token.accessToken, shopId);

      const shopName = await withTransaction(directDbPool, async (client) => {
        const customerId = await findCustomerId(client, scope, scope.customerCode, { forUpdate: true });
        const { rows: existing } = await client.query(
          `SELECT s.id, s.customer_id, EXISTS (SELECT 1 FROM public.workspace_orders o WHERE o.shop_id = s.id) AS has_orders
           FROM public.workspace_shops s WHERE s.platform = 'Shopee' AND s.platform_shop_id = $1 FOR UPDATE`,
          [shopId]
        );
        if (existing[0] && existing[0].customer_id !== customerId && existing[0].has_orders) {
          throw new HttpError(409, "该店铺已绑定到其他客户且存在订单，无法改绑");
        }
        await client.query(
          `INSERT INTO public.workspace_shops
            (customer_id, platform, platform_shop_id, shop_name, region, status, access_token_enc, refresh_token_enc, access_expires_at, authorized_at)
           VALUES ($1, 'Shopee', $2, $3, $4, 'enabled', $5, $6, $7, now())
           ON CONFLICT (platform, platform_shop_id) DO UPDATE SET
             customer_id = EXCLUDED.customer_id, shop_name = EXCLUDED.shop_name, region = EXCLUDED.region, status = 'enabled',
             access_token_enc = EXCLUDED.access_token_enc, refresh_token_enc = EXCLUDED.refresh_token_enc,
             access_expires_at = EXCLUDED.access_expires_at, authorized_at = now(), updated_at = now()`,
          [customerId, shopId, info.shopName || `Shopee ${shopId}`, info.region,
            encryptToken(encKey, token.accessToken), encryptToken(encKey, token.refreshToken), token.accessExpiresAt]
        );
        return info.shopName || shopId;
      });
      back("success", `店铺「${shopName}」授权成功`);
    } catch (error) {
      if (error instanceof HttpError || error instanceof ShopeeApiError) return back("error", error.message);
      console.error("[admin-v4/shopee] auth callback failed", error);
      back("error", "授权处理失败，请稍后重试");
    }
  };

  /** 同步店铺订单：可发货订单入库（配对 → 锁库存），平台已取消订单同步作废并回补库存 */
  router.post("/shops/:shopId/sync", requirePermission("orders_edit"), handle("shopee", async (req, res) => {
    const scope = getScope(req);
    const syncedTo = Math.floor(Date.now() / 1000);

    const shop = await withTransaction(directDbPool, async (client) => {
      const { rows } = await client.query(
        `SELECT s.*, c.owner_user_id, c.warehouse_code FROM public.workspace_shops s
         JOIN public.workspace_customers c ON c.id = s.customer_id
         WHERE s.id = $1 AND c.owner_user_id = $2 AND c.warehouse_code = $3 FOR UPDATE OF s`,
        [req.params.shopId, scope.ownerUserId, scope.warehouseCode]
      );
      const row = rows[0];
      if (!row) throw new HttpError(404, "店铺不存在");
      if (row.platform !== "Shopee") throw new HttpError(400, "该平台暂未接入订单同步");
      if (row.status === "revoked") throw new HttpError(409, "店铺授权已失效，请重新授权");
      if (row.status !== "enabled") throw new HttpError(409, "店铺已停用，请先启用");
      return { ...row, accessToken: await ensureAccessToken(client, row) };
    });
    if (!shop.accessToken) throw new HttpError(409, "店铺授权已失效（刷新令牌被拒绝），请重新授权");

    const lastSynced = shop.last_synced_at ? Math.floor(new Date(shop.last_synced_at).getTime() / 1000) - SYNC_OVERLAP_SECONDS : 0;
    const timeFrom = Math.max(lastSynced, syncedTo - ORDER_LIST_MAX_RANGE_SECONDS + 60);
    const orderSns = await shopee.listOrderSns(shop.accessToken, shop.platform_shop_id, { timeFrom, timeTo: syncedTo });
    const details = (await shopee.getOrderDetails(shop.accessToken, shop.platform_shop_id, orderSns)).map(normalizeShopeeOrder);

    const summary = await withTransaction(directDbPool, async (client) => {
      const result = { fetched: details.length, imported: 0, pendingPrint: 0, pendingPair: 0, outOfStock: 0, canceled: 0 };
      for (const order of details) {
        const { rows } = await client.query(
          `SELECT id, status, inventory_locked FROM public.workspace_orders WHERE shop_id = $1 AND platform_order_no = $2 FOR UPDATE`,
          [shop.id, order.orderSn]
        );
        const existing = rows[0];

        if (order.status === "CANCELLED") {
          if (existing && !["shipped", "canceled"].includes(existing.status)) {
            if (existing.inventory_locked) await releaseInventory(client, existing.id);
            await client.query(
              `UPDATE public.workspace_orders SET status = 'canceled', platform_status = $2, reason = $3, updated_at = now() WHERE id = $1`,
              [existing.id, order.status, CANCEL_REASON]
            );
            await insertOrderLog(client, existing.id, "void", existing.status, "canceled", "Shopee 同步", CANCEL_REASON);
            result.canceled += 1;
          }
          continue;
        }
        if (existing) {
          await client.query(`UPDATE public.workspace_orders SET platform_status = $2, updated_at = now() WHERE id = $1`, [existing.id, order.status]);
          continue;
        }
        if (!IMPORTABLE_STATUSES.has(order.status) || order.items.length === 0) continue;

        const { rows: inserted } = await client.query(
          `INSERT INTO public.workspace_orders
            (owner_user_id, warehouse_code, customer_id, shop_id, platform_order_no, platform_status, status, currency,
             total_amount, receiver_name, receiver_phone, receiver_address, carrier, platform_created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending_pair', $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
          [shop.owner_user_id, shop.warehouse_code, shop.customer_id, shop.id, order.orderSn, order.status, order.currency,
            order.totalAmount, order.receiverName, order.receiverPhone, order.receiverAddress, order.carrier, order.createdAt]
        );
        const orderId = inserted[0].id;
        for (const item of order.items) {
          const pairing = await resolvePairing(client, { shopId: shop.id, customerId: shop.customer_id }, item);
          await client.query(
            `INSERT INTO public.workspace_order_items
              (order_id, platform_item_id, platform_model_id, platform_sku, item_name, model_name, image_url, qty, unit_price, product_id, deduct_qty)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [orderId, item.platformItemId, item.platformModelId, item.modelSku || item.itemSku, item.itemName, item.modelName,
              item.imageUrl, item.qty, item.unitPrice, pairing?.productId ?? null, pairing ? item.qty * pairing.unitQty : null]
          );
        }
        await insertOrderLog(client, orderId, "pull", null, "pending_pair", "Shopee 同步", `${order.orderSn} · ${order.status}`);
        const status = await advancePendingPairOrder(client, orderId, "Shopee 同步", "lock");

        result.imported += 1;
        if (status === "pending_print") result.pendingPrint += 1;
        else if (status === "anomaly") result.outOfStock += 1;
        else result.pendingPair += 1;
      }
      await client.query(`UPDATE public.workspace_shops SET last_synced_at = to_timestamp($2), updated_at = now() WHERE id = $1`, [shop.id, syncedTo]);
      return result;
    });
    res.json(summary);
  }));

  return { router, handleCallback };
}

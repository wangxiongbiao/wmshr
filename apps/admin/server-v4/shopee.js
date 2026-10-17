import crypto from "node:crypto";
import { HttpError } from "./commerce-common.js";

/**
 * Shopee Open Platform v2 客户端。
 * 签名：HMAC-SHA256(partner_key 原文含 shpk 前缀, partner_id + path + timestamp [+ access_token + shop_id])，已在沙箱与正式环境实测。
 */

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const STATE_TTL_MS = 15 * 60 * 1000;
const ORDER_DETAIL_BATCH = 50;
export const ORDER_LIST_MAX_RANGE_SECONDS = 15 * 24 * 3600;

export class ShopeeApiError extends Error {
  constructor(code, message) {
    super(`Shopee 接口错误 ${code}: ${message}`);
    this.code = code;
  }
}

export function loadShopeeConfig(env = process.env) {
  const partnerId = env.SHOPEE_PARTNER_ID;
  const partnerKey = env.SHOPEE_PARTNER_KEY;
  const host = env.SHOPEE_API_HOST;
  const encKey = env.SHOPEE_TOKEN_ENC_KEY ? Buffer.from(env.SHOPEE_TOKEN_ENC_KEY, "base64") : null;
  const redirectBase = env.SHOPEE_REDIRECT_BASE;
  if (!partnerId || !partnerKey || !host || !redirectBase || encKey?.length !== 32) return null;
  return { partnerId: Number(partnerId), partnerKey, host, encKey, redirectBase };
}

export function createShopeeClient(config, { fetchImpl = fetch } = {}) {
  const requireConfig = () => {
    if (!config) throw new HttpError(503, "Shopee 对接未配置，请联系管理员设置 SHOPEE_* 环境变量");
    return config;
  };

  const sign = (path, timestamp, accessToken = "", shopId = "") =>
    crypto
      .createHmac("sha256", Buffer.from(requireConfig().partnerKey, "utf8"))
      .update(`${config.partnerId}${path}${timestamp}${accessToken}${shopId}`)
      .digest("hex");

  async function call(method, path, { query = {}, body, accessToken, shopId } = {}) {
    const { partnerId, host } = requireConfig();
    // 仅幂等的 GET 重试；授权码等 POST 只能使用一次，不做重试
    const maxAttempts = method === "GET" ? MAX_ATTEMPTS : 1;
    for (let attempt = 1; ; attempt += 1) {
      const timestamp = Math.floor(Date.now() / 1000);
      const params = new URLSearchParams({
        partner_id: String(partnerId),
        timestamp: String(timestamp),
        sign: sign(path, timestamp, accessToken, shopId),
        ...(accessToken ? { access_token: accessToken, shop_id: String(shopId) } : {}),
        ...query,
      });
      let response;
      try {
        response = await fetchImpl(`${host}${path}?${params}`, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }
        throw new HttpError(502, `连接 Shopee 失败：${error.message}`);
      }
      if ((response.status >= 500 || response.status === 429) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        continue;
      }
      const json = await response.json().catch(() => ({}));
      if (json.error) throw new ShopeeApiError(json.error, json.message || "");
      if (!response.ok) throw new ShopeeApiError(`http_${response.status}`, "响应异常");
      return json;
    }
  }

  const tokenOf = (json) => ({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    accessExpiresAt: new Date(Date.now() + Number(json.expire_in) * 1000),
  });

  return {
    isConfigured: () => !!config,

    buildAuthUrl(state) {
      const { host, partnerId, redirectBase } = requireConfig();
      const path = "/api/v2/shop/auth_partner";
      const timestamp = Math.floor(Date.now() / 1000);
      const redirect = `${redirectBase}/api/v4/shopee/auth/callback?state=${encodeURIComponent(state)}`;
      return `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign(path, timestamp)}&redirect=${encodeURIComponent(redirect)}`;
    },

    async exchangeCode(code, shopId) {
      const json = await call("POST", "/api/v2/auth/token/get", {
        body: { code, shop_id: Number(shopId), partner_id: requireConfig().partnerId },
      });
      return tokenOf(json);
    },

    async refreshAccessToken(refreshToken, shopId) {
      const json = await call("POST", "/api/v2/auth/access_token/get", {
        body: { refresh_token: refreshToken, shop_id: Number(shopId), partner_id: requireConfig().partnerId },
      });
      return tokenOf(json);
    },

    async getShopInfo(accessToken, shopId) {
      const json = await call("GET", "/api/v2/shop/get_shop_info", { accessToken, shopId });
      return { shopName: json.shop_name || "", region: json.region || "" };
    },

    /** 按更新时间拉取窗口内全部订单号（自动翻页） */
    async listOrderSns(accessToken, shopId, { timeFrom, timeTo }) {
      const sns = [];
      let cursor = "";
      do {
        const json = await call("GET", "/api/v2/order/get_order_list", {
          accessToken,
          shopId,
          query: { time_range_field: "update_time", time_from: String(timeFrom), time_to: String(timeTo), page_size: "100", cursor },
        });
        sns.push(...(json.response?.order_list ?? []).map((o) => o.order_sn));
        cursor = json.response?.more ? json.response.next_cursor : "";
      } while (cursor);
      return sns;
    },

    async getOrderDetails(accessToken, shopId, orderSns) {
      const details = [];
      for (let i = 0; i < orderSns.length; i += ORDER_DETAIL_BATCH) {
        const json = await call("GET", "/api/v2/order/get_order_detail", {
          accessToken,
          shopId,
          query: {
            order_sn_list: orderSns.slice(i, i + ORDER_DETAIL_BATCH).join(","),
            response_optional_fields: "item_list,recipient_address,total_amount,shipping_carrier,create_time",
          },
        });
        details.push(...(json.response?.order_list ?? []));
      }
      return details;
    },
  };
}

/** 令牌加密：AES-256-GCM，格式 iv.tag.ciphertext（base64） */
export function encryptToken(encKey, plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptToken(encKey, payload) {
  const [iv, tag, encrypted] = payload.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/** 授权回调 state：回调请求不带登录凭证，用签名 + 过期时间绑定发起授权的租户、仓库与客户 */
export function signAuthState(secret, { ownerUserId, warehouseCode, customerCode }) {
  const payload = Buffer.from(
    JSON.stringify({ o: ownerUserId, w: warehouseCode, c: customerCode, e: Date.now() + STATE_TTL_MS })
  ).toString("base64url");
  const mac = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifyAuthState(secret, state) {
  const [payload, mac] = String(state || "").split(".");
  if (!payload || !mac) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (Date.now() > data.e) return null;
  return { ownerUserId: data.o, warehouseCode: data.w, customerCode: data.c };
}

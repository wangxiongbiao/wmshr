/** 客户 / 商品 / 订单路由共用：租户作用域、权限、事务与错误响应 */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** 当前请求的数据作用域：租户 + 已通过身份服务校验的海外仓 */
export function getScope(req) {
  const ownerUserId = req.authUser?.adminOwnerUserId;
  const warehouseCode = req.authUser?.countryCode;
  if (!ownerUserId) throw new HttpError(401, "未登录或登录已过期");
  if (!warehouseCode) throw new HttpError(400, "请先选择海外仓");
  return { ownerUserId, warehouseCode, operator: req.authUser?.name || req.authUser?.email || "" };
}

export const requirePermission = (...permIds) => (req, res, next) => {
  const permissions = Array.isArray(req.authUser?.permissions) ? req.authUser.permissions : [];
  if (permissions.includes("*") || permissions.includes("all") || permIds.some((id) => permissions.includes(id))) {
    return next();
  }
  res.status(403).json({ error: `无操作权限（需要 ${permIds.join(" 或 ")}）` });
};

export async function withTransaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError) => console.error("[admin-v4/commerce] rollback failed", rollbackError));
    throw error;
  } finally {
    client.release();
  }
}

const PG_ERROR_MESSAGES = {
  "23505": "数据已存在，请勿重复创建",
  "23503": "存在关联数据，无法执行该操作",
  "23514": "数据不满足约束（例如库存不足）",
};

/** 包装异步路由：业务错误按状态码返回，数据库约束错误转 409，其余记录日志并返回 500 */
export const handle = (label, fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    if (PG_ERROR_MESSAGES[error?.code]) return res.status(409).json({ error: PG_ERROR_MESSAGES[error.code] });
    console.error(`[admin-v4/${label}]`, error);
    res.status(500).json({ error: "服务器处理失败，请稍后重试" });
  }
};

export const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);

export function requiredText(value, label, max = 200) {
  const result = text(value, max);
  if (!result) throw new HttpError(400, `${label}不能为空`);
  return result;
}

export function nonNegativeNumber(value, label) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num < 0) throw new HttpError(400, `${label}必须是非负数字`);
  return num;
}

export function nonNegativeInt(value, label) {
  const num = Number(value ?? 0);
  if (!Number.isInteger(num) || num < 0) throw new HttpError(400, `${label}必须是非负整数`);
  return num;
}

export function optionalPositiveNumber(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) throw new HttpError(400, `${label}必须是正数`);
  return num;
}

export const isoOrNull = (value) => (value ? new Date(value).toISOString() : null);

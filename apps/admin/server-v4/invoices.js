import express from "express";

export function isWarehouseAllowed(authUser, warehouseCode) {
  const activeWarehouse = authUser?.adminV4CountryCode || authUser?.countryCode;
  if (activeWarehouse && warehouseCode && warehouseCode !== activeWarehouse) {
    return false;
  }
  const allowed = Array.isArray(authUser?.allowedWarehouses) ? authUser.allowedWarehouses : [];
  if (allowed.includes("*") || allowed.includes("all")) return true;
  if (!warehouseCode) return true;
  return allowed.includes(warehouseCode);
}

export function mapInvoiceRow(row) {
  return {
    id: String(row.id),
    invoice_no: row.invoice_no,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    invoice_type: row.invoice_type,
    copy_text: row.copy_text,
    currency: row.currency,
    subtotal: Number(row.subtotal || 0),
    tax_rate: Number(row.tax_rate || 0),
    tax_amount: Number(row.tax_amount || 0),
    amount: Number(row.amount || 0),
    issue_date: row.issue_date instanceof Date ? row.issue_date.toISOString().split("T")[0] : String(row.issue_date || ""),
    due_date: row.due_date ? (row.due_date instanceof Date ? row.due_date.toISOString().split("T")[0] : String(row.due_date)) : "",
    status: row.status,
    seller_name: row.seller_name,
    seller_tax_no: row.seller_tax_no,
    seller_bank_name: row.seller_bank_name,
    seller_bank_account: row.seller_bank_account,
    seller_address: row.seller_address,
    seller_phone: row.seller_phone,
    seller_contact: row.seller_contact,
    seller_logo: row.seller_logo || "",
    seller_signature: row.seller_signature || "",
    seller_stamp: row.seller_stamp || "",
    sig_x: Number(row.sig_x || 0),
    sig_y: Number(row.sig_y || 0),
    stamp_x: Number(row.stamp_x || 0),
    stamp_y: Number(row.stamp_y || 0),
    buyer_tax_no: row.buyer_tax_no,
    buyer_bank_name: row.buyer_bank_name,
    buyer_bank_account: row.buyer_bank_account,
    buyer_address: row.buyer_address,
    buyer_phone: row.buyer_phone,
    buyer_contact: row.buyer_contact,
    buyer_logo: row.buyer_logo || "",
    items: Array.isArray(row.items) ? row.items : (typeof row.items === "string" ? JSON.parse(row.items) : []),
    note: row.note || "",
    pdf_url: row.pdf_url || "",
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function createInvoiceRouter({ express, directDbPool, supabase }) {
  const router = express.Router();

  const getScope = (req) => {
    const ownerUserId = req.authUser?.adminOwnerUserId || req.authUser?.ownerUserId || req.authUser?.id;
    const requestedWarehouse = String(req.query?.warehouse_code || req.body?.warehouse_code || "").trim().toUpperCase();
    const activeWarehouse = req.authUser?.adminV4CountryCode || req.authUser?.countryCode || "TH";
    const warehouseCode = (requestedWarehouse && requestedWarehouse !== "ALL") ? requestedWarehouse : activeWarehouse;
    return { ownerUserId, warehouseCode, activeWarehouse };
  };

  // RBAC 权限中间件：支持超级管理员免检与细粒度财务权限
  const requirePermission = (...permIds) => (req, res, next) => {
    const user = req.authUser || req.authAdminUser || {};
    const permissions = Array.isArray(user.permissions)
      ? user.permissions
      : (Array.isArray(user.member?.permissions) ? user.member.permissions : []);

    const isSuper = user.role === "超级管理员" || 
                    user.account_type === "superadmin" || 
                    permissions.includes("*") || 
                    permissions.includes("all") ||
                    permissions.includes("finance") ||
                    permissions.includes("finance_manage");

    const has = isSuper || permIds.some(permId => permissions.includes(permId));

    if (!has) {
      return res.status(403).json({ error: `无操作权限: 需要发票/财务权限 (${permIds.join(" 或 ")})` });
    }
    next();
  };

  let tableEnsured = false;
  const ensureTableExists = async () => {
    if (!directDbPool || tableEnsured) return;
    try {
      await directDbPool.query(`
        CREATE TABLE IF NOT EXISTS public.workspace_invoices (
          id BIGSERIAL PRIMARY KEY,
          owner_user_id TEXT NOT NULL,
          warehouse_code VARCHAR(10) NOT NULL,
          invoice_no VARCHAR(100) NOT NULL,
          customer_id VARCHAR(100) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          invoice_type VARCHAR(100) NOT NULL DEFAULT '???????',
          copy_text VARCHAR(100) NOT NULL DEFAULT '??? ???',
          currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
          subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
          tax_rate NUMERIC(5,2) NOT NULL DEFAULT 6,
          tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
          due_date DATE,
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          seller_name VARCHAR(255),
          seller_tax_no VARCHAR(100),
          seller_bank_name VARCHAR(255),
          seller_bank_account VARCHAR(100),
          seller_address TEXT,
          seller_phone VARCHAR(50),
          seller_contact VARCHAR(100),
          seller_logo TEXT,
          seller_signature TEXT,
          seller_stamp TEXT,
          sig_x NUMERIC(6,2) DEFAULT 0,
          sig_y NUMERIC(6,2) DEFAULT 0,
          stamp_x NUMERIC(6,2) DEFAULT 0,
          stamp_y NUMERIC(6,2) DEFAULT 0,
          buyer_tax_no VARCHAR(100),
          buyer_bank_name VARCHAR(255),
          buyer_bank_account VARCHAR(100),
          buyer_address TEXT,
          buyer_phone VARCHAR(50),
          buyer_contact VARCHAR(100),
          buyer_logo TEXT,
          items JSONB NOT NULL DEFAULT '[]'::jsonb,
          note TEXT,
          pdf_url TEXT,
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uk_workspace_invoices_owner_wh_no UNIQUE (owner_user_id, warehouse_code, invoice_no)
        );
      `);
      tableEnsured = true;
    } catch (e) {
      console.warn("[invoices/service] ensureTableExists error:", e.message);
    }
  };

  // 1. GET /api/v4/admin/invoices/stats
  router.get("/invoices/stats", requirePermission("invoice_view", "invoice_manage", "finance", "finance_view"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!ownerUserId) return res.status(401).json({ error: "未授权" });
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权访问该海外仓发票统计" });
      }

      await ensureTableExists();

      const statsRes = await directDbPool.query(
        `SELECT 
           status, 
           COUNT(*)::int as count, 
           COALESCE(SUM(amount), 0)::numeric(12,2) as total_amount
         FROM workspace_invoices
         WHERE owner_user_id = $1 AND warehouse_code = $2 AND is_deleted = false
         GROUP BY status`,
        [ownerUserId, warehouseCode]
      );

      const stats = {
        totalInvoices: 0,
        totalAmount: 0,
        paidCount: 0,
        paidAmount: 0,
        pendingCount: 0,
        pendingAmount: 0,
        overdueCount: 0,
        overdueAmount: 0,
        draftCount: 0,
        draftAmount: 0
      };

      for (const row of statsRes.rows) {
        const count = Number(row.count || 0);
        const amount = Number(row.total_amount || 0);
        stats.totalInvoices += count;
        stats.totalAmount += amount;

        if (row.status === "paid") {
          stats.paidCount = count;
          stats.paidAmount = amount;
        } else if (row.status === "pending") {
          stats.pendingCount = count;
          stats.pendingAmount = amount;
        } else if (row.status === "overdue") {
          stats.overdueCount = count;
          stats.overdueAmount = amount;
        } else if (row.status === "draft") {
          stats.draftCount = count;
          stats.draftAmount = amount;
        }
      }

      res.json({ ok: true, stats });
    } catch (e) {
      console.error("[invoices/service] stats error:", e);
      res.status(500).json({ error: e.message || "获取发票统计失败" });
    }
  });

  // 2. GET /api/v4/admin/invoices
  router.get("/invoices", requirePermission("invoice_view", "invoice_manage", "finance", "finance_view"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!ownerUserId) return res.status(401).json({ error: "未授权" });
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权访问该海外仓发票数据" });
      }

      await ensureTableExists();

      const page = Math.max(1, parseInt(req.query.page || "1", 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
      const offset = (page - 1) * pageSize;

      const keyword = String(req.query.keyword || "").trim();
      const status = String(req.query.status || "all").trim();
      const invoiceType = String(req.query.invoice_type || "all").trim();
      const month = String(req.query.month || "").trim();

      const conditions = [
        "owner_user_id = $1",
        "warehouse_code = $2",
        "is_deleted = false"
      ];
      const params = [ownerUserId, warehouseCode];
      let paramIdx = 3;

      if (keyword) {
        conditions.push(`(invoice_no ILIKE $${paramIdx} OR customer_name ILIKE $${paramIdx} OR customer_id ILIKE $${paramIdx})`);
        params.push(`%${keyword}%`);
        paramIdx++;
      }

      if (status && status !== "all") {
        conditions.push(`status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      if (invoiceType && invoiceType !== "all") {
        conditions.push(`invoice_type = $${paramIdx}`);
        params.push(invoiceType);
        paramIdx++;
      }

      if (month && /^\d{4}-\d{2}$/.test(month)) {
        conditions.push(`TO_CHAR(issue_date, 'YYYY-MM') = $${paramIdx}`);
        params.push(month);
        paramIdx++;
      }

      const whereClause = conditions.join(" AND ");

      const countSql = `SELECT COUNT(*)::int as total FROM workspace_invoices WHERE ${whereClause}`;
      const countRes = await directDbPool.query(countSql, params);
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT * FROM workspace_invoices
        WHERE ${whereClause}
        ORDER BY issue_date DESC, id DESC
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `;
      const dataParams = [...params, pageSize, offset];
      const dataRes = await directDbPool.query(dataSql, dataParams);

      const items = dataRes.rows.map(mapInvoiceRow);

      res.json({
        items,
        total,
        page,
        pageSize,
        hasMore: offset + items.length < total
      });
    } catch (e) {
      console.error("[invoices/service] list error:", e);
      res.status(500).json({ error: e.message || "获取发票列表失败" });
    }
  });

  // 3. GET /api/v4/admin/invoices/:id
  router.get("/invoices/:id", requirePermission("invoice_view", "invoice_manage", "finance", "finance_view"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权查看该发票" });
      }
      const idOrNo = String(req.params.id);

      const querySql = `
        SELECT * FROM workspace_invoices
        WHERE owner_user_id = $1 AND warehouse_code = $2 AND is_deleted = false
          AND (id::text = $3 OR invoice_no = $3)
        LIMIT 1
      `;
      const resData = await directDbPool.query(querySql, [ownerUserId, warehouseCode, idOrNo]);
      if (resData.rows.length === 0) {
        return res.status(404).json({ error: "发票不存在" });
      }

      res.json(mapInvoiceRow(resData.rows[0]));
    } catch (e) {
      console.error("[invoices/service] get error:", e);
      res.status(500).json({ error: e.message || "获取发票详情失败" });
    }
  });

  // 4. POST /api/v4/admin/invoices
  router.post("/invoices", requirePermission("invoice_edit", "invoice_manage", "finance", "finance_manage"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权在该海外仓创建发票" });
      }
      const body = req.body || {};

      if (!body.invoice_no) {
        return res.status(400).json({ error: "发票号码不能为空" });
      }

      // Check unique invoice_no for this owner and warehouse
      const existCheck = await directDbPool.query(
        "SELECT id FROM workspace_invoices WHERE owner_user_id = $1 AND warehouse_code = $2 AND invoice_no = $3 AND is_deleted = false",
        [ownerUserId, warehouseCode, body.invoice_no]
      );
      if (existCheck.rows.length > 0) {
        return res.status(409).json({ error: `发票号码 ${body.invoice_no} 已存在，请勿重复创建` });
      }

      const items = Array.isArray(body.items) ? body.items : [];
      const subtotal = Number(body.subtotal || items.reduce((sum, it) => sum + (Number(it.amount) || (Number(it.qty || 0) * Number(it.unit_price || it.unitPrice || 0))), 0));
      const taxRate = Number(body.tax_rate || 0);
      const taxAmount = Number(body.tax_amount || (subtotal * taxRate / 100));
      const amount = Number(body.amount || (subtotal + taxAmount));

      const insertSql = `
        INSERT INTO workspace_invoices (
          owner_user_id, warehouse_code, invoice_no, customer_id, customer_name,
          invoice_type, copy_text, currency, subtotal, tax_rate, tax_amount, amount,
          issue_date, due_date, status, seller_name, seller_tax_no, seller_bank_name,
          seller_bank_account, seller_address, seller_phone, seller_contact,
          seller_logo, seller_signature, seller_stamp, sig_x, sig_y, stamp_x, stamp_y,
          buyer_tax_no, buyer_bank_name, buyer_bank_account, buyer_address,
          buyer_phone, buyer_contact, buyer_logo, items, note, pdf_url
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22,
          $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33,
          $34, $35, $36, $37, $38, $39
        )
        RETURNING *
      `;

      const values = [
        ownerUserId, warehouseCode, body.invoice_no, body.customer_id || "", body.customer_name || "",
        body.invoice_type || "增值税专用发票", body.copy_text || "第一联 记账联", body.currency || "CNY",
        subtotal, taxRate, taxAmount, amount,
        body.issue_date || new Date().toISOString().split("T")[0], body.due_date || null, body.status || "draft",
        body.seller_name || "", body.seller_tax_no || "", body.seller_bank_name || "",
        body.seller_bank_account || "", body.seller_address || "", body.seller_phone || "", body.seller_contact || "",
        body.seller_logo || null, body.seller_signature || null, body.seller_stamp || null,
        Number(body.sig_x || 0), Number(body.sig_y || 0), Number(body.stamp_x || 0), Number(body.stamp_y || 0),
        body.buyer_tax_no || "", body.buyer_bank_name || "", body.buyer_bank_account || "", body.buyer_address || "",
        body.buyer_phone || "", body.buyer_contact || "", body.buyer_logo || null,
        JSON.stringify(items), body.note || "", body.pdf_url || null
      ];

      const insertRes = await directDbPool.query(insertSql, values);
      const created = mapInvoiceRow(insertRes.rows[0]);

      res.status(201).json({ invoice: created, message: `发票 ${created.invoice_no} 创建成功` });
    } catch (e) {
      console.error("[invoices/service] create error:", e);
      res.status(500).json({ error: e.message || "创建发票失败" });
    }
  });

  // 5. PUT /api/v4/admin/invoices/:id
  router.put("/invoices/:id", requirePermission("invoice_edit", "invoice_manage", "finance", "finance_manage"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权修改该海外仓发票" });
      }
      const idOrNo = String(req.params.id);
      const body = req.body || {};

      const existRes = await directDbPool.query(
        "SELECT id FROM workspace_invoices WHERE owner_user_id = $1 AND warehouse_code = $2 AND (id::text = $3 OR invoice_no = $3) AND is_deleted = false",
        [ownerUserId, warehouseCode, idOrNo]
      );

      if (existRes.rows.length === 0) {
        return res.status(404).json({ error: "发票不存在" });
      }

      const targetId = existRes.rows[0].id;
      const items = Array.isArray(body.items) ? body.items : [];
      const subtotal = Number(body.subtotal || items.reduce((sum, it) => sum + (Number(it.amount) || (Number(it.qty || 0) * Number(it.unit_price || it.unitPrice || 0))), 0));
      const taxRate = Number(body.tax_rate || 0);
      const taxAmount = Number(body.tax_amount || (subtotal * taxRate / 100));
      const amount = Number(body.amount || (subtotal + taxAmount));

      const updateSql = `
        UPDATE workspace_invoices SET
          customer_id = $1, customer_name = $2, invoice_type = $3, copy_text = $4,
          currency = $5, subtotal = $6, tax_rate = $7, tax_amount = $8, amount = $9,
          issue_date = $10, due_date = $11, status = $12, seller_name = $13,
          seller_tax_no = $14, seller_bank_name = $15, seller_bank_account = $16,
          seller_address = $17, seller_phone = $18, seller_contact = $19,
          seller_logo = $20, seller_signature = $21, seller_stamp = $22,
          sig_x = $23, sig_y = $24, stamp_x = $25, stamp_y = $26,
          buyer_tax_no = $27, buyer_bank_name = $28, buyer_bank_account = $29,
          buyer_address = $30, buyer_phone = $31, buyer_contact = $32,
          buyer_logo = $33, items = $34, note = $35, pdf_url = $36,
          updated_at = NOW()
        WHERE id = $37 AND owner_user_id = $38 AND warehouse_code = $39
        RETURNING *
      `;

      const values = [
        body.customer_id || "", body.customer_name || "", body.invoice_type || "增值税专用发票", body.copy_text || "第一联 记账联",
        body.currency || "CNY", subtotal, taxRate, taxAmount, amount,
        body.issue_date || new Date().toISOString().split("T")[0], body.due_date || null, body.status || "draft",
        body.seller_name || "", body.seller_tax_no || "", body.seller_bank_name || "",
        body.seller_bank_account || "", body.seller_address || "", body.seller_phone || "", body.seller_contact || "",
        body.seller_logo || null, body.seller_signature || null, body.seller_stamp || null,
        Number(body.sig_x || 0), Number(body.sig_y || 0), Number(body.stamp_x || 0), Number(body.stamp_y || 0),
        body.buyer_tax_no || "", body.buyer_bank_name || "", body.buyer_bank_account || "", body.buyer_address || "",
        body.buyer_phone || "", body.buyer_contact || "", body.buyer_logo || null,
        JSON.stringify(items), body.note || "", body.pdf_url || null,
        targetId, ownerUserId, warehouseCode
      ];

      const updateRes = await directDbPool.query(updateSql, values);
      const updated = mapInvoiceRow(updateRes.rows[0]);

      res.json({ invoice: updated, message: `发票 ${updated.invoice_no} 更新成功` });
    } catch (e) {
      console.error("[invoices/service] update error:", e);
      res.status(500).json({ error: e.message || "更新发票失败" });
    }
  });

  // 6. PATCH /api/v4/admin/invoices/:id/status
  router.patch("/invoices/:id/status", requirePermission("invoice_edit", "invoice_manage", "finance", "finance_manage"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权变更该海外仓发票状态" });
      }
      const idOrNo = String(req.params.id);
      const { status } = req.body || {};

      const validStatuses = ["draft", "pending", "paid", "overdue", "canceled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `无效的状态: ${status}` });
      }

      const updateRes = await directDbPool.query(
        `UPDATE workspace_invoices 
         SET status = $1, updated_at = NOW()
         WHERE owner_user_id = $2 AND warehouse_code = $3 AND (id::text = $4 OR invoice_no = $4) AND is_deleted = false
         RETURNING id, invoice_no, status, updated_at`,
        [status, ownerUserId, warehouseCode, idOrNo]
      );

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ error: "发票不存在" });
      }

      res.json({ ok: true, invoice: updateRes.rows[0] });
    } catch (e) {
      console.error("[invoices/service] status update error:", e);
      res.status(500).json({ error: e.message || "变更发票状态失败" });
    }
  });

  // 7. DELETE /api/v4/admin/invoices/:id
  router.delete("/invoices/:id", requirePermission("invoice_delete", "invoice_manage", "finance_manage"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权删除该海外仓发票" });
      }
      const idOrNo = String(req.params.id);

      const checkRes = await directDbPool.query(
        "SELECT id, invoice_no, status FROM workspace_invoices WHERE owner_user_id = $1 AND warehouse_code = $2 AND (id::text = $3 OR invoice_no = $3) AND is_deleted = false",
        [ownerUserId, warehouseCode, idOrNo]
      );

      if (checkRes.rows.length === 0) {
        return res.status(404).json({ error: "发票不存在或已被删除" });
      }

      const target = checkRes.rows[0];

      // Financial Data Protection Invariant: Paid invoice cannot be directly deleted
      if (target.status === "paid") {
        return res.status(400).json({
          error: `发票 ${target.invoice_no} 已收款入账（状态为已支付），禁止直接删除。如需红冲请变更为作废状态。`
        });
      }

      // Safe soft delete
      await directDbPool.query(
        "UPDATE workspace_invoices SET is_deleted = true, updated_at = NOW() WHERE id = $1",
        [target.id]
      );

      res.json({ success: true, id: String(target.id), invoice_no: target.invoice_no });
    } catch (e) {
      console.error("[invoices/service] delete error:", e);
      res.status(500).json({ error: e.message || "删除发票失败" });
    }
  });

  return router;
}

export default createInvoiceRouter;
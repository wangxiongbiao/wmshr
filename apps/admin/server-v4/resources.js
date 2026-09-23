import express from "express";
import { verifyToken } from "../server/auth-v4.js";
import { normalizeDbConfig } from "./attendance.js";
import { mapEmployeeRow } from "./employees.js";

export function createResourceRouter({ express, supabase, directDbPool, authSecret, identity }) {
  const router = express.Router();
  const memoryStateCache = new Map();

  function successWrap(data) {
    return {
      success: true,
      code: 200,
      data
    };
  }

  // 通用资源与状态鉴权中间件（自适应 Admin Token 与 Mobile 员工 Token）
  const requireAnyAuth = async (req, res, next) => {
    if (req.authUser) return next();

    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ success: false, code: 401, error: "未提供登录凭据" });
    }

    const payload = verifyToken(token, authSecret);
    if (!payload) {
      return res.status(401).json({ success: false, code: 401, error: "凭据无效或已过期" });
    }

    try {
      if (payload.stage === "authenticated") {
        const context = await identity.resolveSessionContext(payload);
        req.authUser = {
          ...context,
          id: context.adminOwnerUserId,
          adminV4CountryCode: context.countryCode || null,
          adminAuthUserId: context.adminAuthUserId,
          adminOwnerUserId: context.adminOwnerUserId
        };
      } else if (payload.employeeId) {
        req.authUser = {
          id: payload.ownerUserId,
          employeeId: payload.employeeId,
          adminOwnerUserId: payload.ownerUserId
        };
      } else {
        req.authUser = {
          id: payload.sub || payload.ownerUserId || "00000000-0000-0000-0000-000000000001"
        };
      }
      next();
    } catch (err) {
      console.error("[resources/auth] error:", err.message);
      return res.status(401).json({ success: false, code: 401, error: "凭据验证失败" });
    }
  };

  router.use(requireAnyAuth);

  // ═════════════════════════════════════════════════════════════════
  // 1. State 接口: GET /state/:key & PATCH /state/:key
  // ═════════════════════════════════════════════════════════════════

  router.get("/state/:key", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const key = req.params.key;

      if (key === "config" || key === "appConfig") {
        const warehouseCode = req.authUser.adminV4CountryCode || "TH";
        const { data } = await supabase
          .from("workspace_attendance_config")
          .select("*")
          .eq("owner_user_id", ownerUserId)
          .eq("warehouse_code", warehouseCode)
          .maybeSingle();

        const config = normalizeDbConfig(data);
        return res.json(successWrap(config));
      }

      try {
        const { data } = await supabase
          .from("admin_state_configs")
          .select("config_value")
          .eq("owner_user_id", ownerUserId)
          .eq("config_key", key)
          .maybeSingle();

        if (data?.config_value) {
          return res.json(successWrap(data.config_value));
        }
      } catch (e) {}

      const cached = memoryStateCache.get(`${ownerUserId}:${key}`) || {};
      return res.json(successWrap(cached));
    } catch (error) {
      console.error(`[resources/state GET ${req.params.key}] error:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.patch("/state/:key", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const key = req.params.key;
      const patch = req.body || {};

      if (key === "config" || key === "appConfig") {
        const warehouseCode = req.authUser.adminV4CountryCode || "TH";
        const updatePayload = {
          owner_user_id: ownerUserId,
          warehouse_code: warehouseCode,
          updated_at: new Date().toISOString()
        };

        if (patch.startShift !== undefined) updatePayload.start_shift = patch.startShift;
        if (patch.endShift !== undefined) updatePayload.end_shift = patch.endShift;
        if (patch.breakStart !== undefined) updatePayload.break_start = patch.breakStart;
        if (patch.breakEnd !== undefined) updatePayload.break_end = patch.breakEnd;
        if (patch.standardHours !== undefined) updatePayload.standard_hours = Number(patch.standardHours);
        if (patch.otHourlyFee !== undefined) updatePayload.ot_hourly_fee = Number(patch.otHourlyFee);
        if (patch.overtimeMultiplier !== undefined) updatePayload.overtime_multiplier = Number(patch.overtimeMultiplier);
        if (patch.taxRate !== undefined) updatePayload.tax_rate = Number(patch.taxRate);
        if (patch.dailyBreakMinutes !== undefined) updatePayload.daily_break_minutes = Number(patch.dailyBreakMinutes);
        if (patch.currency !== undefined) updatePayload.currency = patch.currency;
        if (patch.companyAddress !== undefined) updatePayload.company_address = patch.companyAddress;
        if (patch.companyLat !== undefined) updatePayload.company_lat = Number(patch.companyLat);
        if (patch.companyLng !== undefined) updatePayload.company_lng = Number(patch.companyLng);

        const { data, error } = await supabase
          .from("workspace_attendance_config")
          .upsert(updatePayload, { onConflict: "owner_user_id,warehouse_code" })
          .select()
          .single();

        if (error) throw error;
        return res.json(successWrap(normalizeDbConfig(data)));
      }

      const existing = memoryStateCache.get(`${ownerUserId}:${key}`) || {};
      const merged = { ...existing, ...patch };
      memoryStateCache.set(`${ownerUserId}:${key}`, merged);

      try {
        await supabase
          .from("admin_state_configs")
          .upsert({
            owner_user_id: ownerUserId,
            config_key: key,
            config_value: merged,
            updated_at: new Date().toISOString()
          }, { onConflict: "owner_user_id,config_key" });
      } catch (e) {}

      return res.json(successWrap(merged));
    } catch (error) {
      console.error(`[resources/state PATCH ${req.params.key}] error:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 2. Resource 列表: GET /resources/:resource
  // ═════════════════════════════════════════════════════════════════

  router.get("/resources/:resource", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const resource = req.params.resource;

      switch (resource) {
        case "employees": {
          let query = supabase.from("workspace_employees").select("*").eq("owner_user_id", ownerUserId);
          if (req.authUser.adminV4CountryCode && req.authUser.adminV4CountryCode !== "all") {
            query = query.eq("country", req.authUser.adminV4CountryCode);
          }
          const { data, error } = await query;
          if (error) throw error;
          return res.json(successWrap((data || []).map(mapEmployeeRow)));
        }

        case "attendance": {
          const { data, error } = await supabase
            .from("workspace_attendance_records")
            .select("*")
            .eq("owner_user_id", ownerUserId)
            .order("date", { ascending: false })
            .limit(500);
          if (error) throw error;
          return res.json(successWrap((data || []).map(r => ({
            id: String(r.id),
            empId: String(r.emp_id || r.employee_id || ""),
            date: r.date || "",
            inTime: r.in_time ? r.in_time.slice(0, 5) : "",
            outTime: r.out_time ? r.out_time.slice(0, 5) : "",
            workHours: Number(r.work_hours || 0),
            otHours: Number(r.ot_hours || 0),
            status: r.status || "present",
            note: r.note || "",
            companyAddress: r.company_address || "",
            lat: r.lat ? Number(r.lat) : undefined,
            lng: r.lng ? Number(r.lng) : undefined
          }))));
        }

        case "leave-requests": {
          const { data, error } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("owner_user_id", ownerUserId)
            .order("created_at", { ascending: false });
          if (error) throw error;
          return res.json(successWrap((data || []).map(r => ({
            id: String(r.id),
            empId: String(r.employee_id || r.emp_id || ""),
            leaveType: r.leave_type || "事假",
            startDate: r.start_date || "",
            endDate: r.end_date || "",
            reason: r.reason || "",
            status: r.status || "pending",
            createdAt: r.created_at || ""
          }))));
        }

        case "invoices": {
          const { data, error } = await supabase
            .from("invoices")
            .select("*")
            .eq("owner_user_id", ownerUserId)
            .order("invoice_date", { ascending: false });
          if (error) throw error;
          return res.json(successWrap(data || []));
        }

        case "expenses":
        case "expense-records": {
          const { data } = await supabase
            .from("admin_expense_snapshots")
            .select("expenses")
            .eq("owner_user_id", ownerUserId)
            .maybeSingle();
          return res.json(successWrap(data?.expenses || []));
        }

        case "sops":
        case "sop-documents": {
          const { data, error } = await supabase
            .from("sop_documents")
            .select("*")
            .eq("owner_user_id", ownerUserId)
            .order("created_at", { ascending: false });
          if (error) throw error;
          return res.json(successWrap((data || []).map(d => ({
            id: String(d.id),
            title: d.title || "",
            content: d.content_html || d.content || "",
            category: d.category || "training",
            status: d.status || "published",
            createdAt: d.created_at || ""
          }))));
        }

        case "customers": {
          const { data, error } = await supabase
            .from("customer_accounts")
            .select("*")
            .eq("owner_user_id", ownerUserId)
            .order("updated_at", { ascending: false });
          if (error) throw error;
          return res.json(successWrap((data || []).map(r => ({
            id: r.customer_code || String(r.id),
            name: r.name || "",
            contact: r.contact || "",
            currency: r.currency || "CNY",
            availableLimit: Number(r.available_limit || 0),
            creditLimit: Number(r.credit_limit || 0),
            billingTemplate: r.billing_template || "",
            status: r.status === "disabled" ? "disabled" : "enabled"
          }))));
        }

        case "products": {
          const { data } = await supabase
            .from("admin_product_snapshots")
            .select("products")
            .eq("owner_user_id", ownerUserId)
            .maybeSingle();
          return res.json(successWrap(data?.products || []));
        }

        case "orders": {
          const { data } = await supabase
            .from("admin_order_snapshots")
            .select("orders")
            .eq("owner_user_id", ownerUserId)
            .maybeSingle();
          return res.json(successWrap(data?.orders || []));
        }

        case "goods": {
          const { data } = await supabase
            .from("admin_goods_snapshots")
            .select("goods")
            .eq("owner_user_id", ownerUserId)
            .maybeSingle();
          return res.json(successWrap(data?.goods || []));
        }

        case "express-surcharges":
        case "express": {
          const { data } = await supabase
            .from("admin_express_configs")
            .select("surcharges")
            .eq("owner_user_id", ownerUserId)
            .maybeSingle();
          return res.json(successWrap(data?.surcharges || []));
        }

        default:
          return res.status(404).json({ success: false, error: `未知的资源类型: ${resource}` });
      }
    } catch (error) {
      console.error(`[resources/list GET ${req.params.resource}] error:`, error);
      res.status(500).json({ success: false, error: error.message || "加载资源失败" });
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 3. Resource 新建: POST /resources/:resource
  // ═════════════════════════════════════════════════════════════════

  router.post("/resources/:resource", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const resource = req.params.resource;
      const body = req.body || {};
      const now = new Date().toISOString();

      switch (resource) {
        case "attendance": {
          const payload = {
            owner_user_id: ownerUserId,
            emp_id: body.empId ? Number(body.empId) : undefined,
            employee_id: body.empId ? Number(body.empId) : undefined,
            date: body.date || now.slice(0, 10),
            in_time: body.inTime ? (body.inTime.length === 5 ? `${body.inTime}:00` : body.inTime) : null,
            out_time: body.outTime ? (body.outTime.length === 5 ? `${body.outTime}:00` : body.outTime) : null,
            work_hours: Number(body.workHours || 0),
            ot_hours: Number(body.otHours || 0),
            status: body.status || "present",
            note: body.note || "",
            company_address: body.companyAddress || "",
            created_at: now,
            updated_at: now
          };
          const { data, error } = await supabase.from("workspace_attendance_records").insert(payload).select().single();
          if (error) throw error;
          return res.status(201).json(successWrap({
            id: String(data.id),
            empId: String(data.emp_id || data.employee_id),
            date: data.date,
            inTime: data.in_time?.slice(0, 5) || "",
            outTime: data.out_time?.slice(0, 5) || "",
            workHours: Number(data.work_hours || 0),
            otHours: Number(data.ot_hours || 0),
            status: data.status,
            note: data.note || ""
          }));
        }

        case "expense-records":
        case "expenses": {
          const { data: snapshot } = await supabase
            .from("admin_expense_snapshots")
            .select("expenses, categories")
            .eq("owner_user_id", ownerUserId)
            .maybeSingle();
          const list = Array.isArray(snapshot?.expenses) ? snapshot.expenses : [];
          const newItem = {
            id: body.id || `exp-${Date.now()}`,
            name: body.name || body.description || "费用单据",
            type: body.type || body.category || "物耗杂费",
            category: body.category || body.type || "物耗杂费",
            paymentMethod: body.paymentMethod || "报销转账",
            amount: Number(body.amount || 0),
            currency: (body.currency || "CNY").toUpperCase(),
            paymentTime: body.paymentTime || body.date || now.slice(0, 10),
            date: body.date || body.paymentTime || now.slice(0, 10),
            status: body.status || "pending",
            receiptUrls: Array.isArray(body.receiptUrls) ? body.receiptUrls : (body.receiptUrl ? [body.receiptUrl] : []),
            description: body.description || body.name || ""
          };
          list.unshift(newItem);
          await supabase.from("admin_expense_snapshots").upsert({
            owner_user_id: ownerUserId,
            expenses: list,
            categories: snapshot?.categories || ["物耗杂费", "差旅交通", "餐饮招待", "办公用品", "设备维护", "其他支出"],
            updated_at: now
          }, { onConflict: "owner_user_id" });
          return res.status(201).json(successWrap(newItem));
        }

        case "products": {
          const { data: existing } = await supabase.from("admin_product_snapshots").select("products").eq("owner_user_id", ownerUserId).maybeSingle();
          const list = Array.isArray(existing?.products) ? existing.products : [];
          const newItem = { id: body.id || `prod_${Date.now()}`, ...body };
          list.push(newItem);
          await supabase.from("admin_product_snapshots").upsert({
            owner_user_id: ownerUserId,
            products: list,
            updated_at: now
          }, { onConflict: "owner_user_id" });
          return res.status(201).json(successWrap(newItem));
        }

        case "orders": {
          const { data: existing } = await supabase.from("admin_order_snapshots").select("orders").eq("owner_user_id", ownerUserId).maybeSingle();
          const list = Array.isArray(existing?.orders) ? existing.orders : [];
          const newItem = { id: body.id || `order_${Date.now()}`, ...body };
          list.push(newItem);
          await supabase.from("admin_order_snapshots").upsert({
            owner_user_id: ownerUserId,
            orders: list,
            updated_at: now
          }, { onConflict: "owner_user_id" });
          return res.status(201).json(successWrap(newItem));
        }

        case "goods": {
          const { data: existing } = await supabase.from("admin_goods_snapshots").select("goods").eq("owner_user_id", ownerUserId).maybeSingle();
          const list = Array.isArray(existing?.goods) ? existing.goods : [];
          const newItem = { id: body.id || `goods_${Date.now()}`, ...body };
          list.push(newItem);
          await supabase.from("admin_goods_snapshots").upsert({
            owner_user_id: ownerUserId,
            goods: list,
            updated_at: now
          }, { onConflict: "owner_user_id" });
          return res.status(201).json(successWrap(newItem));
        }

        default:
          return res.status(400).json({ success: false, error: `不支持对资源 ${resource} 执行新增` });
      }
    } catch (error) {
      console.error(`[resources/create POST ${req.params.resource}] error:`, error);
      res.status(500).json({ success: false, error: error.message || "创建资源失败" });
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 4. Resource 更新: PATCH /resources/:resource/:id
  // ═════════════════════════════════════════════════════════════════

  router.patch("/resources/:resource/:id", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const { resource, id } = req.params;
      const body = req.body || {};
      const now = new Date().toISOString();

      switch (resource) {
        case "attendance": {
          const updateData = { updated_at: now };
          if (body.inTime !== undefined) updateData.in_time = body.inTime ? (body.inTime.length === 5 ? `${body.inTime}:00` : body.inTime) : null;
          if (body.outTime !== undefined) updateData.out_time = body.outTime ? (body.outTime.length === 5 ? `${body.outTime}:00` : body.outTime) : null;
          if (body.workHours !== undefined) updateData.work_hours = Number(body.workHours);
          if (body.otHours !== undefined) updateData.ot_hours = Number(body.otHours);
          if (body.status !== undefined) updateData.status = body.status;
          if (body.note !== undefined) updateData.note = body.note;

          const { data, error } = await supabase
            .from("workspace_attendance_records")
            .update(updateData)
            .eq("owner_user_id", ownerUserId)
            .eq("id", id)
            .select()
            .single();

          if (error) throw error;
          return res.json(successWrap({
            id: String(data.id),
            empId: String(data.emp_id || data.employee_id),
            date: data.date,
            inTime: data.in_time?.slice(0, 5) || "",
            outTime: data.out_time?.slice(0, 5) || "",
            workHours: Number(data.work_hours || 0),
            otHours: Number(data.ot_hours || 0),
            status: data.status,
            note: data.note || ""
          }));
        }

        case "expense-records":
        case "expenses": {
          const { data: snapshot } = await supabase
            .from("admin_expense_snapshots")
            .select("expenses, categories")
            .eq("owner_user_id", ownerUserId)
            .maybeSingle();
          const list = Array.isArray(snapshot?.expenses) ? snapshot.expenses : [];
          let updatedItem = { id, ...body };
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === id) {
              list[i] = { ...list[i], ...body };
              updatedItem = list[i];
              break;
            }
          }
          await supabase.from("admin_expense_snapshots").upsert({
            owner_user_id: ownerUserId,
            expenses: list,
            updated_at: now
          }, { onConflict: "owner_user_id" });
          return res.json(successWrap(updatedItem));
        }

        default:
          return res.json(successWrap({ id, ...body }));
      }
    } catch (error) {
      console.error(`[resources/update PATCH ${req.params.resource}/${req.params.id}] error:`, error);
      res.status(500).json({ success: false, error: error.message || "更新资源失败" });
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 5. Resource 删除: DELETE /resources/:resource/:id
  // ═════════════════════════════════════════════════════════════════

  router.delete("/resources/:resource/:id", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const { resource, id } = req.params;

      switch (resource) {
        case "attendance":
          await supabase.from("workspace_attendance_records").delete().eq("owner_user_id", ownerUserId).eq("id", id);
          break;
        case "expense-records":
        case "expenses": {
          const { data: snapshot } = await supabase
            .from("admin_expense_snapshots")
            .select("expenses, categories")
            .eq("owner_user_id", ownerUserId)
            .maybeSingle();
          const list = (snapshot?.expenses || []).filter(item => item.id !== id);
          await supabase.from("admin_expense_snapshots").upsert({
            owner_user_id: ownerUserId,
            expenses: list,
            updated_at: new Date().toISOString()
          }, { onConflict: "owner_user_id" });
          break;
        }
        case "sops":
        case "sop-documents":
          await supabase.from("sop_documents").delete().eq("owner_user_id", ownerUserId).eq("id", id);
          break;
        default:
          break;
      }

      return res.json(successWrap({ id, deleted: true }));
    } catch (error) {
      console.error(`[resources/delete DELETE ${req.params.resource}/${req.params.id}] error:`, error);
      res.status(500).json({ success: false, error: error.message || "删除资源失败" });
    }
  });

  return router;
}

export default createResourceRouter;

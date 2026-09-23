import express from "express";

export function createExpenseRouter({ express, supabase, directDbPool }) {
  const router = express.Router();

  const DEFAULT_CATEGORIES = [
    "物耗杂费",
    "差旅交通",
    "餐饮招待",
    "办公用品",
    "设备维护",
    "通讯网络",
    "快递物流",
    "其他支出"
  ];

  function normalizeExpenseItem(item, index = 0) {
    const fallbackId = `exp-${index + 1}`;
    const receiptUrls = Array.isArray(item?.receiptUrls)
      ? item.receiptUrls.map((url) => String(url || "").trim()).filter(Boolean)
      : (item?.receiptUrl ? [item.receiptUrl] : []);

    return {
      id: String(item?.id || fallbackId).trim() || fallbackId,
      name: String(item?.name || item?.description || "费用单据").trim(),
      type: String(item?.type || item?.category || "物耗杂费").trim(),
      category: String(item?.category || item?.type || "物耗杂费").trim(),
      paymentMethod: String(item?.paymentMethod || "报销转账").trim(),
      amount: Number.isFinite(Number(item?.amount)) ? Number(item.amount) : 0,
      currency: String(item?.currency || "CNY").trim().toUpperCase() || "CNY",
      receiptUrl: receiptUrls[0] || undefined,
      receiptUrls,
      attachments: receiptUrls,
      payerId: Number.isFinite(Number(item?.payerId || item?.employeeId)) ? Number(item?.payerId || item?.employeeId) : undefined,
      employeeId: Number.isFinite(Number(item?.employeeId || item?.payerId)) ? Number(item?.employeeId || item?.payerId) : undefined,
      payerName: String(item?.payerName || item?.employeeName || "").trim() || undefined,
      employeeName: String(item?.employeeName || item?.payerName || "").trim() || undefined,
      paymentTime: String(item?.paymentTime || item?.date || "").trim() || new Date().toISOString().slice(0, 10),
      date: String(item?.date || item?.paymentTime || "").trim() || new Date().toISOString().slice(0, 10),
      status: item?.status === "approved" ? "approved" : item?.status === "rejected" ? "rejected" : item?.status === "paid" ? "paid" : "pending",
      approvedBy: String(item?.approvedBy || "").trim() || undefined,
      approvedTime: String(item?.approvedTime || item?.approvedAt || "").trim() || undefined,
      approvalNote: String(item?.approvalNote || "").trim() || undefined,
      note: String(item?.note || item?.description || "").trim() || undefined,
      description: String(item?.description || item?.note || item?.name || "").trim() || undefined
    };
  }

  async function fetchExpenseSnapshot(ownerUserId) {
    const { data, error } = await supabase
      .from("admin_expense_snapshots")
      .select("expenses, categories")
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();

    if (error) {
      console.warn("[admin-v4/expenses] fetch snapshot fallback:", error.message);
    }

    const expenses = Array.isArray(data?.expenses)
      ? data.expenses.map((item, index) => normalizeExpenseItem(item, index))
      : [];
    const categories = Array.isArray(data?.categories) && data.categories.length > 0
      ? data.categories
      : DEFAULT_CATEGORIES;

    return { expenses, categories };
  }

  async function saveExpenseSnapshot(ownerUserId, expenses, categories = DEFAULT_CATEGORIES) {
    const normalizedExpenses = expenses.map((item, index) => normalizeExpenseItem(item, index));
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("admin_expense_snapshots")
      .upsert({
        owner_user_id: ownerUserId,
        expenses: normalizedExpenses,
        categories,
        updated_at: now
      }, { onConflict: "owner_user_id" });

    if (error) {
      console.warn("[admin-v4/expenses] save snapshot fallback:", error.message);
    }

    return { expenses: normalizedExpenses, categories };
  }

  /**
   * GET /expenses - 获取全员费用报销列表与分类大盘
   */
  router.get("/expenses", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const { status, category, keyword, employeeId } = req.query || {};

      const snapshot = await fetchExpenseSnapshot(ownerUserId);
      let list = snapshot.expenses;

      if (status && status !== "all") list = list.filter(r => r.status === status);
      if (category && category !== "all") list = list.filter(r => r.category === category || r.type === category);
      if (employeeId) list = list.filter(r => r.employeeId === Number(employeeId) || r.payerId === Number(employeeId));

      if (keyword) {
        const kw = String(keyword).trim().toLowerCase();
        list = list.filter(r =>
          r.name.toLowerCase().includes(kw) ||
          (r.employeeName && r.employeeName.toLowerCase().includes(kw)) ||
          (r.description && r.description.toLowerCase().includes(kw))
        );
      }

      return res.json({
        success: true,
        data: list,
        expenses: list,
        categories: snapshot.categories
      });
    } catch (error) {
      console.error("[admin-v4/expenses] error:", error);
      res.status(500).json({ success: false, error: error.message || "加载费用报销列表失败" });
    }
  });

  /**
   * POST /expenses - 管理端直接录入费用单据
   */
  router.post("/expenses", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const body = req.body || {};
      const snapshot = await fetchExpenseSnapshot(ownerUserId);

      const newItem = normalizeExpenseItem({
        id: `exp-${Date.now()}`,
        name: body.description || body.name || `${body.category || "费用"} - ${body.payerName || "管理员"}`,
        type: body.category || body.type || "物耗杂费",
        category: body.category || body.type || "物耗杂费",
        amount: Number(body.amount || 0),
        currency: (body.currency || "CNY").toUpperCase(),
        paymentTime: body.date || body.paymentTime || new Date().toISOString().slice(0, 10),
        date: body.date || body.paymentTime || new Date().toISOString().slice(0, 10),
        status: body.status || "approved",
        approvedBy: req.authUser.email || req.authUser.name || "管理员",
        approvedTime: new Date().toISOString(),
        note: body.note || body.description || "",
        description: body.description || body.note || "",
        receiptUrls: Array.isArray(body.attachments) ? body.attachments : (body.receiptUrls || []),
        employeeId: body.employeeId || body.payerId,
        payerId: body.payerId || body.employeeId,
        payerName: body.payerName || body.employeeName || "管理员",
        employeeName: body.employeeName || body.payerName || "管理员"
      });

      snapshot.expenses.unshift(newItem);
      await saveExpenseSnapshot(ownerUserId, snapshot.expenses, snapshot.categories);

      return res.status(201).json({
        success: true,
        message: "费用单据录入成功",
        data: newItem
      });
    } catch (error) {
      console.error("[admin-v4/expenses POST] error:", error);
      res.status(500).json({ success: false, error: error.message || "录入费用失败" });
    }
  });

  /**
   * PUT /expenses/:id - 审批报销单据（通过/驳回/已打款）
   */
  router.put("/expenses/:id", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const expenseId = req.params.id;
      const { status, approvalNote, note } = req.body || {};
      const snapshot = await fetchExpenseSnapshot(ownerUserId);

      let found = false;
      let updatedItem = null;

      snapshot.expenses = snapshot.expenses.map(item => {
        if (item.id === expenseId) {
          found = true;
          updatedItem = {
            ...item,
            status: status || item.status,
            approvedBy: status ? (req.authUser.email || req.authUser.name || "管理员") : item.approvedBy,
            approvedTime: status ? new Date().toISOString() : item.approvedTime,
            approvalNote: approvalNote !== undefined ? approvalNote : item.approvalNote,
            note: note !== undefined ? note : item.note
          };
          return updatedItem;
        }
        return item;
      });

      if (!found) {
        updatedItem = { id: expenseId, status: status || "approved", approvalNote };
      } else {
        await saveExpenseSnapshot(ownerUserId, snapshot.expenses, snapshot.categories);
      }

      return res.json({
        success: true,
        message: "报销审批成功",
        data: updatedItem
      });
    } catch (error) {
      console.error("[admin-v4/expenses PUT] error:", error);
      res.status(500).json({ success: false, error: error.message || "更新报销单失败" });
    }
  });

  /**
   * PUT /expenses - 批量同步/保存费用快照
   */
  router.put("/expenses", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const items = Array.isArray(req.body?.expenses) ? req.body.expenses : [];
      const categories = Array.isArray(req.body?.categories) ? req.body.categories : DEFAULT_CATEGORIES;

      const result = await saveExpenseSnapshot(ownerUserId, items, categories);
      return res.json({
        success: true,
        expenses: result.expenses,
        categories: result.categories
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message || "保存失败" });
    }
  });

  /**
   * DELETE /expenses/:id - 删除或作废报销单
   */
  router.delete("/expenses/:id", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const expenseId = req.params.id;
      const snapshot = await fetchExpenseSnapshot(ownerUserId);

      snapshot.expenses = snapshot.expenses.filter(item => item.id !== expenseId);
      await saveExpenseSnapshot(ownerUserId, snapshot.expenses, snapshot.categories);

      return res.json({ success: true, message: "报销单已删除" });
    } catch (error) {
      console.error("[admin-v4/expenses DELETE] error:", error);
      res.status(500).json({ success: false, error: error.message || "删除失败" });
    }
  });

  return router;
}

export default createExpenseRouter;

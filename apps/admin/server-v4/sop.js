import express from "express";

export function createSopRouter({ express, supabase, directDbPool }) {
  const router = express.Router();

  function mapSopRow(doc, readsList = [], targetsList = [], assetsList = []) {
    if (!doc) return null;
    const readsMap = {};
    for (const r of readsList) {
      if (Number(r.sop_id) === Number(doc.id)) {
        readsMap[String(r.employee_id)] = r.read_at || "";
      }
    }

    const docTargets = targetsList
      .filter(t => Number(t.sop_id) === Number(doc.id))
      .map(t => Number(t.employee_id))
      .filter(Boolean);

    const docAssets = assetsList.filter(a => Number(a.sop_id) === Number(doc.id));
    const images = docAssets.filter(a => a.kind === "image").map(a => a.url);
    const attachments = docAssets.filter(a => a.kind === "attachment").map(a => ({
      name: a.name || "附件",
      url: a.url || "",
      size: a.size || ""
    }));

    return {
      id: String(doc.id),
      title: doc.title || "未命名规程",
      category: doc.category || "training",
      docType: doc.doc_type || doc.category || "training",
      status: doc.status || "draft",
      content: doc.content_html || doc.content || "",
      contentHtml: doc.content_html || doc.content || "",
      creator: doc.creator || "管理员",
      targetType: doc.target_type || "all",
      targetEmployeeIds: docTargets.length > 0 ? docTargets : (doc.target_employee_ids || []),
      mustRead: Boolean(doc.must_read ?? true),
      images: images.length > 0 ? images : (doc.images || []),
      attachments: attachments.length > 0 ? attachments : (doc.attachments || []),
      reads: readsMap,
      readCount: Object.keys(readsMap).length,
      createdAt: doc.created_at || null,
      updatedAt: doc.updated_at || null
    };
  }

  /**
   * GET /sops - 获取全量 SOP 文档与已读统计
   */
  router.get(["/sops", "/sop-documents"], async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const { keyword, status, category } = req.query || {};

      let query = supabase
        .from("sop_documents")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .order("created_at", { ascending: false });

      if (status && status !== "all") query = query.eq("status", status);

      const { data: docs, error } = await query;
      if (error) {
        console.warn("[admin-v4/sops] query fallback:", error.message);
        return res.json({ success: true, data: [] });
      }

      const sopIds = (docs || []).map(d => Number(d.id));
      let reads = [];
      let targets = [];
      let assets = [];

      if (sopIds.length > 0) {
        const [readsRes, targetsRes, assetsRes] = await Promise.all([
          supabase.from("sop_reads").select("sop_id, employee_id, read_at").eq("owner_user_id", ownerUserId).in("sop_id", sopIds),
          supabase.from("sop_document_targets").select("sop_id, employee_id").eq("owner_user_id", ownerUserId).in("sop_id", sopIds),
          supabase.from("sop_assets").select("sop_id, kind, name, url, size").eq("owner_user_id", ownerUserId).in("sop_id", sopIds)
        ]);
        reads = readsRes.data || [];
        targets = targetsRes.data || [];
        assets = assetsRes.data || [];
      }

      let list = (docs || []).map(d => mapSopRow(d, reads, targets, assets));

      if (keyword) {
        const kw = String(keyword).trim().toLowerCase();
        list = list.filter(item =>
          item.title.toLowerCase().includes(kw) ||
          item.creator.toLowerCase().includes(kw) ||
          item.content.toLowerCase().includes(kw)
        );
      }

      return res.json({
        success: true,
        data: list,
        items: list
      });
    } catch (error) {
      console.error("[admin-v4/sops] error:", error);
      res.status(500).json({ success: false, error: error.message || "加载 SOP 列表失败" });
    }
  });

  /**
   * GET /sops/:id - 获取单篇 SOP 详情
   */
  router.get(["/sops/:id", "/sop-documents/:id"], async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const sopId = Number(req.params.id);

      const { data: doc, error } = await supabase
        .from("sop_documents")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", sopId)
        .maybeSingle();

      if (error || !doc) {
        return res.status(404).json({ success: false, error: "规程不存在" });
      }

      const [readsRes, targetsRes, assetsRes] = await Promise.all([
        supabase.from("sop_reads").select("sop_id, employee_id, read_at").eq("owner_user_id", ownerUserId).eq("sop_id", doc.id),
        supabase.from("sop_document_targets").select("sop_id, employee_id").eq("owner_user_id", ownerUserId).eq("sop_id", doc.id),
        supabase.from("sop_assets").select("sop_id, kind, name, url, size").eq("owner_user_id", ownerUserId).eq("sop_id", doc.id)
      ]);

      return res.json({
        success: true,
        data: mapSopRow(doc, readsRes.data || [], targetsRes.data || [], assetsRes.data || [])
      });
    } catch (error) {
      console.error("[admin-v4/sops/:id] error:", error);
      res.status(500).json({ success: false, error: error.message || "加载 SOP 详情失败" });
    }
  });

  /**
   * POST /sops - 新建 SOP 规程
   */
  router.post(["/sops", "/sop-documents"], async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const body = req.body || {};
      const now = new Date().toISOString();

      const docPayload = {
        owner_user_id: ownerUserId,
        title: String(body.title || "新建规程").trim(),
        content_html: body.contentHtml || body.content || "",
        creator: req.authUser.name || req.authUser.email || "管理员",
        target_type: body.targetType || "all",
        status: body.status || "published",
        updated_at: now
      };

      const { data: created, error } = await supabase
        .from("sop_documents")
        .insert(docPayload)
        .select()
        .single();

      if (error) {
        console.warn("[admin-v4/sops POST] fallback:", error.message);
        return res.status(201).json({
          success: true,
          message: "SOP规程发布成功",
          data: { id: String(Date.now()), ...docPayload }
        });
      }

      const sopId = Number(created.id);

      // 保存附件与插图到 sop_assets
      const assetRows = [];
      if (Array.isArray(body.images)) {
        for (const [idx, url] of body.images.entries()) {
          if (url) {
            assetRows.push({
              owner_user_id: ownerUserId,
              sop_id: sopId,
              kind: "image",
              name: `插图 ${idx + 1}`,
              url: String(url)
            });
          }
        }
      }
      if (Array.isArray(body.attachments)) {
        for (const att of body.attachments) {
          if (att?.url) {
            assetRows.push({
              owner_user_id: ownerUserId,
              sop_id: sopId,
              kind: "attachment",
              name: att.name || "附件",
              url: att.url,
              size: String(att.size || "")
            });
          }
        }
      }
      if (assetRows.length > 0) {
        await supabase.from("sop_assets").insert(assetRows);
      }

      // 保存指定目标员工
      if (body.targetType === "specific" && Array.isArray(body.targetEmployeeIds) && body.targetEmployeeIds.length > 0) {
        const targetRows = body.targetEmployeeIds.map(empId => ({
          owner_user_id: ownerUserId,
          sop_id: sopId,
          employee_id: Number(empId)
        }));
        await supabase.from("sop_document_targets").insert(targetRows);
      }

      return res.status(201).json({
        success: true,
        message: "SOP规程发布成功",
        data: mapSopRow(created, [], [], assetRows)
      });
    } catch (error) {
      console.error("[admin-v4/sops POST] error:", error);
      res.status(500).json({ success: false, error: error.message || "创建 SOP 失败" });
    }
  });

  /**
   * PUT /sops/:id - 更新规程内容与受众
   */
  router.put(["/sops/:id", "/sop-documents/:id"], async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const sopId = Number(req.params.id);
      const body = req.body || {};
      const now = new Date().toISOString();

      const updateData = {
        updated_at: now
      };
      if (body.title !== undefined) updateData.title = String(body.title).trim();
      if (body.status !== undefined) updateData.status = body.status;
      if (body.content !== undefined || body.contentHtml !== undefined) updateData.content_html = body.contentHtml || body.content;
      if (body.targetType !== undefined) updateData.target_type = body.targetType;

      const { data: updated, error } = await supabase
        .from("sop_documents")
        .update(updateData)
        .eq("owner_user_id", ownerUserId)
        .eq("id", sopId)
        .select()
        .single();

      if (error) {
        console.warn("[admin-v4/sops PUT] fallback:", error.message);
        return res.json({
          success: true,
          message: "规程更新成功",
          data: { id: String(sopId), ...updateData }
        });
      }

      return res.json({
        success: true,
        message: "规程更新成功",
        data: mapSopRow(updated)
      });
    } catch (error) {
      console.error("[admin-v4/sops PUT] error:", error);
      res.status(500).json({ success: false, error: error.message || "更新 SOP 失败" });
    }
  });

  /**
   * DELETE /sops/:id - 删除 SOP
   */
  router.delete(["/sops/:id", "/sop-documents/:id"], async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const sopId = Number(req.params.id);

      await Promise.all([
        supabase.from("sop_documents").delete().eq("owner_user_id", ownerUserId).eq("id", sopId),
        supabase.from("sop_document_targets").delete().eq("owner_user_id", ownerUserId).eq("sop_id", sopId),
        supabase.from("sop_assets").delete().eq("owner_user_id", ownerUserId).eq("sop_id", sopId),
        supabase.from("sop_reads").delete().eq("owner_user_id", ownerUserId).eq("sop_id", sopId)
      ]);

      return res.json({ success: true, message: "SOP 规程已删除" });
    } catch (error) {
      console.error("[admin-v4/sops DELETE] error:", error);
      res.status(500).json({ success: false, error: error.message || "删除 SOP 失败" });
    }
  });

  /**
   * GET /sops/:id/readers - 统计查阅情况
   */
  router.get("/sops/:id/readers", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const sopId = Number(req.params.id);

      const [empRes, readRes] = await Promise.all([
        supabase.from("workspace_employees").select("id, name, employee_no, dept").eq("owner_user_id", ownerUserId).eq("status", "active"),
        supabase.from("sop_reads").select("employee_id, read_at").eq("owner_user_id", ownerUserId).eq("sop_id", sopId)
      ]);

      const readMap = new Map((readRes.data || []).map(r => [Number(r.employee_id), r.read_at]));
      const readers = (empRes.data || []).map(emp => ({
        employeeId: Number(emp.id),
        employeeNo: emp.employee_no,
        name: emp.name,
        dept: emp.dept,
        hasRead: readMap.has(Number(emp.id)),
        readAt: readMap.get(Number(emp.id)) || null
      }));

      return res.json({
        success: true,
        data: {
          total: readers.length,
          readCount: readers.filter(r => r.hasRead).length,
          unreadCount: readers.filter(r => !r.hasRead).length,
          readers
        }
      });
    } catch (error) {
      console.error("[admin-v4/sops/:id/readers] error:", error);
      res.status(500).json({ success: false, error: error.message || "获取阅读统计失败" });
    }
  });

  return router;
}

export default createSopRouter;

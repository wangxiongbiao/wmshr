/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Package, Search, Plus, Trash2, Edit3, FileText, Image, CheckCircle, Info, Upload, X, Eye, Download } from "lucide-react";
import { Employee, GoodsRecord } from "../types";

interface GoodsManagerProps {
  employees: Employee[];
  goods: GoodsRecord[];
  onUpdateGoods: (updated: GoodsRecord[]) => void;
  addToast: (msg: string) => void;
}

const CARGO_PRESET_IMAGES = [
  { label: "智能设备", url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=150&auto=format&fit=crop&q=60" },
  { label: "五金零配件", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=60" },
  { label: "日百美妆", url: "https://images.unsplash.com/photo-1526413232644-8a4000b0e991?w=150&auto=format&fit=crop&q=60" },
  { label: "通用箱装", url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=60" }
];

export function GoodsManager({ employees, goods, onUpdateGoods, addToast }: GoodsManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [editingGoods, setEditingGoods] = useState<GoodsRecord | null>(null);

  // Form fields
  const [entryNo, setEntryNo] = useState("");
  const [customerName, setCustomerName] = useState("仓库管理员");
  const [goodsName, setGoodsName] = useState("");
  const [skuList, setSkuList] = useState<{ sku: string; qty: number; desc?: string; actualQty?: number }[]>([{ sku: "", qty: 1, desc: "" }]);
  const [goodsPhoto, setGoodsPhoto] = useState("");
  const [goodsPhotos, setGoodsPhotos] = useState<string[]>([]);
  const [arrivalDate, setArrivalDate] = useState("");
  const [pieces, setPieces] = useState<number>(100);
  const [shippingMark, setShippingMark] = useState("");
  const [shippingMarkList, setShippingMarkList] = useState<{ mark: string; pieces: number; actualPieces?: number }[]>([{ mark: "", pieces: 10 }]);
  const [signSlipName, setSignSlipName] = useState("");
  const [signSlipUrls, setSignSlipUrls] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState<number>(-1);
  const [status, setStatus] = useState<'pending' | 'arrived' | 'completed'>('pending');
  const [note, setNote] = useState("");

  const totalPieces = useMemo(() => {
    return shippingMarkList.reduce((sum, item) => sum + (Number(item.pieces) || 0), 0);
  }, [shippingMarkList]);

  const handleGenerateSequentialMarks = () => {
    const prefix = prompt("请输入麦头前缀 (例如 SH-201-):", "SH-201-");
    if (prefix === null) return;
    const countStr = prompt("请输入要生成的箱数 (例如 5 代表生成 5 个一箱的独立麦头):", "5");
    if (!countStr) return;
    const count = Number(countStr);
    if (isNaN(count) || count <= 0) {
      alert("请输入有效的正整数");
      return;
    }
    if (count > 100) {
      if (!confirm("生成超过 100 个麦头行可能会导致系统卡顿，是否继续？")) {
        return;
      }
    }
    const newMarks = Array.from({ length: count }, (_, i) => ({
      mark: `${prefix}${String(i + 1).padStart(2, '0')}`,
      pieces: 1
    }));
    setShippingMarkList(newMarks);
    addToast(`已成功自动生成 ${count} 组一一对应的独立麦头`);
  };

  const handleOpenAdd = () => {
    setEditingGoods(null);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, "");
    const seq = Math.floor(Math.random() * 900) + 100;
    setEntryNo(`IN-${dateStr}-${seq}`);
    setCustomerName("仓库管理员");
    setGoodsName("");
    setSkuList([{ sku: "", qty: 1, desc: "" }]);
    setGoodsPhoto(CARGO_PRESET_IMAGES[3].url); // Default to generic box preset
    setGoodsPhotos([]);
    setArrivalDate(new Date().toISOString().split('T')[0]);
    setPieces(100);
    setShippingMark("");
    setShippingMarkList([{ mark: "", pieces: 10 }]);
    setSignSlipName("");
    setSignSlipUrls([]);
    setReceiverId(employees[0]?.id || -1);
    setStatus("pending");
    setNote("");
    setIsModalOpen(true);
  };

  const handleOpenQuickBoxAdd = () => {
    setEditingGoods(null);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, "");
    const seq = Math.floor(Math.random() * 900) + 100;
    setEntryNo(`IN-${dateStr}-${seq}`);
    setCustomerName("仓库管理员");
    setGoodsName("未录入具体SKU (仅登记到货箱数)");
    setSkuList([]);
    setGoodsPhoto(CARGO_PRESET_IMAGES[3].url);
    setGoodsPhotos([]);
    setArrivalDate(new Date().toISOString().split('T')[0]);
    setPieces(100);
    setShippingMark("");
    setShippingMarkList([{ mark: "", pieces: 10 }]);
    setSignSlipName("");
    setSignSlipUrls([]);
    setReceiverId(employees[0]?.id || -1);
  };

  const handleOpenEditInbound = (rec: GoodsRecord) => {
    setEditingGoods(rec);
    setEntryNo(rec.entryNo);
    setCustomerName(rec.customerName || "仓库管理员");
    setGoodsName(rec.goodsName);
    
    // Set other states
    setGoodsPhoto(rec.goodsPhoto || CARGO_PRESET_IMAGES[3].url);
    setGoodsPhotos(rec.goodsPhotos || (rec.goodsPhoto ? [rec.goodsPhoto] : []));
    setArrivalDate(rec.arrivalDate);
    setPieces(rec.pieces);
    setShippingMark(rec.shippingMark || "");
    
    if (rec.shippingMarks && rec.shippingMarks.length > 0) {
      setShippingMarkList(rec.shippingMarks.map(item => ({ mark: item.mark, pieces: item.pieces })));
    } else {
      setShippingMarkList([{ mark: rec.shippingMark || "", pieces: rec.pieces || 10 }]);
    }

    setSignSlipName(rec.signSlipName || "");
    setSignSlipUrls(rec.signSlipUrls || (rec.signSlipUrl ? [rec.signSlipUrl] : []));
    setReceiverId(rec.receiverId || (employees[0]?.id || -1));
    setStatus(rec.status);
    setNote(rec.note || "");

    if (rec.skus && rec.skus.length > 0) {
      setSkuList(rec.skus.map(item => ({ sku: item.sku, qty: item.qty, desc: item.desc || "" })));
    } else {
      setSkuList([{ sku: "", qty: 1, desc: "" }]);
    }
    setIsModalOpen(true);
  };

  const handleOpenSignOff = (rec: GoodsRecord) => {
    setEditingGoods(rec);
    setEntryNo(rec.entryNo);
    setCustomerName(rec.customerName || "仓库管理员");
    setGoodsName(rec.goodsName);
    
    // Set other states
    setGoodsPhoto(rec.goodsPhoto || CARGO_PRESET_IMAGES[3].url);
    setArrivalDate(rec.arrivalDate || new Date().toISOString().split('T')[0]);
    setPieces(rec.pieces);
    setShippingMark(rec.shippingMark || "");
    
    if (rec.shippingMarks && rec.shippingMarks.length > 0) {
      setShippingMarkList(rec.shippingMarks.map(item => ({
        mark: item.mark,
        pieces: item.pieces,
        actualPieces: item.actualPieces !== undefined ? item.actualPieces : item.pieces
      })));
    } else {
      setShippingMarkList([{
        mark: rec.shippingMark || "",
        pieces: rec.pieces || 10,
        actualPieces: rec.actualPieces !== undefined ? rec.actualPieces : (rec.pieces || 10)
      }]);
    }

    if (rec.skus && rec.skus.length > 0) {
      setSkuList(rec.skus.map(item => ({
        sku: item.sku,
        qty: item.qty,
        desc: item.desc || "",
        actualQty: item.actualQty !== undefined ? item.actualQty : item.qty
      })));
    } else {
      setSkuList([{
        sku: "",
        qty: 1,
        desc: "",
        actualQty: 1
      }]);
    }

    setSignSlipName(rec.signSlipName || "");
    setSignSlipUrls(rec.signSlipUrls || (rec.signSlipUrl ? [rec.signSlipUrl] : []));
    setReceiverId(rec.receiverId || (employees[0]?.id || -1));
    setNote(rec.note || "");

    setIsBoxModalOpen(true);
  };

  const handleSaveBox = (e: React.FormEvent) => {
    e.preventDefault();

    const validSkuList = skuList
      .filter(item => item.sku.trim() !== "")
      .map(item => ({
        sku: item.sku.trim(),
        qty: Number(item.qty),
        desc: item.desc ? item.desc.trim() : undefined,
        actualQty: item.actualQty !== undefined ? Number(item.actualQty) : Number(item.qty)
      }));
    
    if (validSkuList.length === 0) {
      addToast("请至少填写一个有效的 SKU 名称规格");
      return;
    }

    if (!customerName.trim() || !entryNo.trim()) {
      addToast("请填写完整的客户名称与入库单号");
      return;
    }

    if (totalPieces <= 0) {
      addToast("到货总箱数必须大于 0");
      return;
    }

    const matchedEmp = employees.find(emp => emp.id === Number(receiverId));
    const receiverName = matchedEmp ? matchedEmp.name : "";

    const combinedGoodsName = validSkuList.map(item => `${item.sku} * ${item.qty}`).join(", ");

    const validShippingMarks = shippingMarkList
      .filter(item => item.mark.trim() !== "")
      .map(item => ({
        mark: item.mark.trim(),
        pieces: Number(item.pieces),
        actualPieces: item.actualPieces !== undefined ? Number(item.actualPieces) : Number(item.pieces)
      }));
      
    const combinedShippingMark = validShippingMarks.map(item => item.mark.trim()).join(", ");

    const totalActualPieces = validShippingMarks.reduce((sum, item) => sum + (item.actualPieces !== undefined ? Number(item.actualPieces) : Number(item.pieces)), 0);

    const data: GoodsRecord = {
      id: editingGoods ? editingGoods.id : `g-${Date.now()}`,
      entryNo,
      customerName,
      goodsName: combinedGoodsName,
      goodsPhoto: editingGoods ? (editingGoods.goodsPhoto || CARGO_PRESET_IMAGES[3].url) : CARGO_PRESET_IMAGES[3].url,
      arrivalDate,
      pieces: Number(totalPieces),
      actualPieces: totalActualPieces,
      shippingMark: combinedShippingMark || undefined,
      shippingMarks: validShippingMarks,
      signSlipName: signSlipUrls.length > 0 ? `已上传 ${signSlipUrls.length} 张签收图` : undefined,
      signSlipUrl: signSlipUrls[0] || undefined,
      signSlipUrls: signSlipUrls,
      receiverId: Number(receiverId) > 0 ? Number(receiverId) : undefined,
      receiverName: Number(receiverId) > 0 ? receiverName : undefined,
      status,
      note: note.trim() || undefined,
      skus: validSkuList
    };

    if (editingGoods) {
      onUpdateGoods(goods.map(g => g.id === editingGoods.id ? data : g));
      addToast("到货箱数及 SKU 记录修改成功");
    } else {
      onUpdateGoods([data, ...goods]);
      addToast("到货总箱数及 SKU 登记成功");
    }
    setIsBoxModalOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const validSkuList = skuList.filter(item => item.sku.trim() !== "");
    if (validSkuList.length === 0) {
      addToast("请至少填写一个有效的 SKU 名称规格");
      return;
    }

    if (!customerName.trim() || !entryNo.trim()) {
      addToast("请填写完整的客户名称与入库单号");
      return;
    }

    if (totalPieces <= 0) {
      addToast("当前发货总箱数必须大于 0");
      return;
    }

    const matchedEmp = employees.find(emp => emp.id === Number(receiverId));
    const receiverName = matchedEmp ? matchedEmp.name : "";

    // Generate serialized goodsName for backwards compatibility & clean search indexing
    const combinedGoodsName = validSkuList.map(item => `${item.sku} * ${item.qty}`).join(", ");

    const validShippingMarks = shippingMarkList.filter(item => item.mark.trim() !== "");
    const combinedShippingMark = validShippingMarks.map(item => item.mark.trim()).join(", ");

    const data: GoodsRecord = {
      id: editingGoods ? editingGoods.id : `g-${Date.now()}`,
      entryNo,
      customerName,
      goodsName: combinedGoodsName,
      goodsPhoto: goodsPhotos[0] || goodsPhoto || CARGO_PRESET_IMAGES[3].url,
      goodsPhotos: goodsPhotos,
      arrivalDate,
      pieces: Number(totalPieces),
      shippingMark: combinedShippingMark || undefined,
      shippingMarks: validShippingMarks,
      signSlipName: signSlipUrls.length > 0 ? `已上传 ${signSlipUrls.length} 张签收图` : undefined,
      signSlipUrl: signSlipUrls[0] || undefined,
      signSlipUrls: signSlipUrls,
      receiverId: Number(receiverId) > 0 ? Number(receiverId) : undefined,
      receiverName: Number(receiverId) > 0 ? receiverName : undefined,
      status,
      note: note.trim() || undefined,
      skus: validSkuList
    };

    if (editingGoods) {
      onUpdateGoods(goods.map(g => g.id === editingGoods.id ? data : g));
      addToast("货物登记信息已成功更新");
    } else {
      onUpdateGoods([data, ...goods]);
      addToast("新货物到货登记成功");
    }
    setIsModalOpen(false);
  };

  const handleSignSlipFileChange = (files: FileList | null) => {
    if (!files) return;
    const array = Array.from(files);
    
    array.forEach(file => {
      if (!file.type.startsWith('image/')) {
        addToast("仅限上传图片格式文件 (jpg, png, webp 等)！");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === "string") {
          setSignSlipUrls(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    addToast(`成功选择并读取 ${array.length} 张签收图片文件`);
  };

  const handleGoodsPhotosFileChange = (files: FileList | null) => {
    if (!files) return;
    const array = Array.from(files);
    
    array.forEach(file => {
      if (!file.type.startsWith('image/')) {
        addToast("仅限上传图片格式文件 (jpg, png, webp 等)！");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === "string") {
          setGoodsPhotos(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    addToast(`成功选择并读取 ${array.length} 张发货货物图片文件`);
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这条货物记录吗？")) {
      onUpdateGoods(goods.filter(g => g.id !== id));
      addToast("记录已删除");
    }
  };

  const filteredGoods = useMemo(() => {
    return goods.filter(item => {
      return (
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.goodsName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entryNo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [goods, searchTerm]);

  return (
    <div className="space-y-4">
      {/* 简洁头部操作栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索货主、货物名称规格、入库单号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-500 text-xs text-slate-700 bg-slate-50 transition"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto flex-shrink-0">
          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>创建入库单</span>
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredGoods.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            暂无匹配的货物入库登记
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px] text-[13px]">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5">入库单号</th>
                  <th className="px-5 py-3.5">客户名称</th>
                  <th className="px-5 py-3.5 text-center">箱数</th>
                  <th className="px-5 py-3.5">SKU * 数量</th>
                  <th className="px-5 py-3.5">货物签收图</th>
                  <th className="px-5 py-3.5">签收日期</th>
                  <th className="px-5 py-3.5">签收人</th>
                  <th className="px-5 py-3.5 text-center">入库状态</th>
                  <th className="px-5 py-3.5 text-right">操作栏</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredGoods.map((rec) => {
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. 入库单号 */}
                      <td className="px-5 py-4 font-semibold text-slate-900 tracking-wide text-xs">
                        <div>{rec.entryNo}</div>
                        {rec.shippingMarks && rec.shippingMarks.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1 max-w-[200px]">
                            {rec.shippingMarks.map((m, idx) => {
                              const markPieces = m.pieces || 10;
                              const actualP = m.actualPieces !== undefined ? m.actualPieces : markPieces;
                              const markDiff = actualP !== markPieces && rec.status === "completed";
                              return (
                                <span
                                  key={idx}
                                  className={`px-1.5 py-0.5 rounded font-extrabold text-[9px] border transition shadow-3xs flex items-center gap-1 ${
                                    markDiff
                                      ? "bg-rose-50 text-rose-800 border-rose-250 hover:bg-rose-100"
                                      : "bg-amber-50 text-amber-800 border-amber-150 hover:bg-amber-100"
                                  }`}
                                  title={markDiff ? `预报: ${markPieces}箱, 实际: ${actualP}箱` : `包含 ${markPieces} 箱`}
                                >
                                  <span>{m.mark || "无麦头"}</span>
                                  <span className="font-mono">
                                    {markDiff ? `${actualP}/${markPieces}箱` : `${markPieces}箱`}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        ) : rec.shippingMark ? (
                          <div className="mt-1 text-[11px] text-slate-500 font-medium">
                            麦头: <span className="bg-amber-50 text-amber-700 px-1 py-0.5 rounded font-bold text-[10px] border border-amber-200">{rec.shippingMark}</span>
                          </div>
                        ) : null}
                      </td>
                      
                      {/* 2. 客户名称 */}
                      <td className="px-5 py-4 font-semibold text-slate-800 max-w-[160px] truncate" title={rec.customerName}>
                        {rec.customerName}
                      </td>

                      {/* 3. 箱数 */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="font-bold px-2 py-0.5 text-slate-900 bg-slate-100 rounded text-[11px]">
                            {rec.pieces} <span className="text-[10px] font-normal text-slate-500">应收</span>
                          </span>
                          {rec.actualPieces !== undefined && rec.status === "completed" && (
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${
                              rec.actualPieces !== rec.pieces
                                ? "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}>
                              {rec.actualPieces} 箱 实收
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. SKU * 数量 */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col min-w-[180px] max-w-[280px] space-y-1.5">
                          {rec.skus && rec.skus.length > 0 ? (
                            <>
                              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                {rec.skus.map((item, index) => {
                                  const itemQty = item.qty || 1;
                                  const actualQ = item.actualQty !== undefined ? item.actualQty : itemQty;
                                  const qtyDiff = actualQ !== itemQty && rec.status === "completed";
                                  return (
                                    <div key={index} className="flex flex-col gap-1 text-[11px] bg-slate-50 hover:bg-slate-100/90 px-2.5 py-1.5 rounded border border-slate-150 transition duration-150">
                                      <div className="flex justify-between items-center gap-1">
                                        <span className="font-bold text-slate-800 truncate pr-1" title={item.sku}>
                                          {item.sku}
                                        </span>
                                        <span className={`font-extrabold flex-shrink-0 px-1.5 py-0.5 rounded border text-[10px] ${
                                          qtyDiff
                                            ? "text-rose-700 bg-rose-50 border-rose-200"
                                            : "text-brand-700 bg-brand-50 border-brand-100"
                                        }`}>
                                          {qtyDiff ? `实收:${actualQ} / 应收:${itemQty}` : `${itemQty} 件`}
                                        </span>
                                      </div>
                                      {item.desc && (
                                        <div className="text-[10px] text-slate-400 font-medium select-all leading-tight border-t border-slate-150 pt-1">
                                          中文名称: {item.desc}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold mt-1.5 flex flex-col gap-0.5 border-t border-slate-150 pt-1">
                                <div className="flex items-center justify-between">
                                  <span>共 {rec.skus.length} 个 SKU</span>
                                  <span className="text-slate-500">应收总计: {rec.skus.reduce((sum, item) => sum + item.qty, 0)} 件</span>
                                </div>
                                {rec.status === "completed" && (
                                  <div className="flex items-center justify-between text-emerald-700 mt-0.5">
                                    <span>
                                      实收率: {Math.round((rec.skus.reduce((sum, item) => sum + (item.actualQty !== undefined ? item.actualQty : item.qty), 0) / rec.skus.reduce((sum, item) => sum + item.qty, 0)) * 100)}%
                                    </span>
                                    <span className={`${
                                      rec.skus.reduce((sum, i) => sum + (i.actualQty !== undefined ? i.actualQty : i.qty), 0) !== rec.skus.reduce((sum, i) => sum + i.qty, 0)
                                        ? "text-rose-600 font-extrabold"
                                        : "text-emerald-700 font-extrabold"
                                    }`}>
                                      实收总计: {rec.skus.reduce((sum, item) => sum + (item.actualQty !== undefined ? item.actualQty : item.qty), 0)} 件
                                    </span>
                                  </div>
                                )}
                              </div>
                              {/* 发货货物图片展示与预览区域 */}
                              {rec.goodsPhotos && rec.goodsPhotos.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200">
                                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    <span>发货图片凭证 ({rec.goodsPhotos.length}张):</span>
                                  </div>
                                  <div className="flex gap-2.5 overflow-x-auto py-0.5 max-w-[260px] scrollbar-thin">
                                    {rec.goodsPhotos.map((url, i) => (
                                      <div
                                        key={i}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewImageUrl(url);
                                        }}
                                        className="relative w-9 h-9 rounded-md border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0 hover:scale-110 active:scale-95 cursor-pointer transition-all shadow-3xs group/goods-img"
                                        title="点击放大预览发货图片"
                                      >
                                        <img src={url} className="w-full h-full object-cover" alt="Goods upload" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/goods-img:opacity-100 transition flex items-center justify-center">
                                          <Eye className="w-3 h-3 text-white" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-slate-900 text-[13px] truncate" title={rec.goodsName}>
                                {rec.goodsName}
                              </span>
                              <span className="text-[11px] text-brand-600 font-bold mt-1">
                                1 SKU × {rec.pieces} 件
                              </span>
                              {/* 发货货物图片展示与预览区域 (无分流) */}
                              {rec.goodsPhotos && rec.goodsPhotos.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200">
                                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    <span>发货图片凭证 ({rec.goodsPhotos.length}张):</span>
                                  </div>
                                  <div className="flex gap-2.5 overflow-x-auto py-0.5 max-w-[260px] scrollbar-thin">
                                    {rec.goodsPhotos.map((url, i) => (
                                      <div
                                        key={i}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewImageUrl(url);
                                        }}
                                        className="relative w-9 h-9 rounded-md border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0 hover:scale-110 active:scale-95 cursor-pointer transition-all shadow-3xs group/goods-img"
                                        title="点击放大预览发货图片"
                                      >
                                        <img src={url} className="w-full h-full object-cover" alt="Goods upload" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/goods-img:opacity-100 transition flex items-center justify-center">
                                          <Eye className="w-3 h-3 text-white" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* 5. 货物签收图 */}
                      <td className="px-5 py-4">
                        {rec.signSlipUrls && rec.signSlipUrls.length > 0 ? (
                          <div 
                            onClick={() => setPreviewImageUrl(rec.signSlipUrls![0])}
                            className="relative w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 cursor-pointer transition-all group"
                            title="点击放大预览签收图"
                          >
                            <img 
                              src={rec.signSlipUrls[0]} 
                              className="w-full h-full object-cover" 
                              alt="Goods Sign Slip" 
                              referrerPolicy="no-referrer"
                            />
                            {rec.signSlipUrls.length > 1 && (
                              <span className="absolute bottom-1 right-1 bg-brand-600 border border-brand-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md shadow-sm pointer-events-none">
                                {rec.signSlipUrls.length}张
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white shadow-sm" />
                            </div>
                          </div>
                        ) : rec.signSlipUrl ? (
                          <div 
                            onClick={() => setPreviewImageUrl(rec.signSlipUrl!)}
                            className="relative w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 cursor-pointer transition-all group"
                            title="点击放大预览签收图"
                          >
                            <img 
                              src={rec.signSlipUrl} 
                              className="w-full h-full object-cover" 
                              alt="Goods Sign Slip" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white shadow-sm" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex-shrink-0 flex flex-col items-center justify-center text-slate-400 select-none">
                            <Image className="w-4 h-4 text-slate-300" />
                            <span className="text-[8px] scale-90 leading-none mt-1 font-medium text-slate-400">无签收图</span>
                          </div>
                        )}
                      </td>

                      {/* 6. 签收日期 */}
                      <td className="px-5 py-4 text-slate-600 font-medium">{rec.arrivalDate}</td>

                      {/* 7. 签收人 */}
                      <td className="px-5 py-4">
                        {rec.receiverName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold flex items-center justify-center border border-brand-100">
                              {rec.receiverName.charAt(0)}
                            </span>
                            <span className="font-medium text-slate-800">{rec.receiverName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* 8. 入库状态 */}
                      <td className="px-5 py-4 text-center">
                        {rec.status === 'completed' ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            已签收入库
                          </span>
                        ) : rec.status === 'arrived' ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            到货待签
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            在途预登
                          </span>
                        )}
                      </td>

                      {/* 9. 操作栏 (编辑为主) */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditInbound(rec)}
                            className="inline-flex items-center gap-1.5 text-[11px] text-brand-700 hover:text-white font-bold bg-brand-50 hover:bg-brand-600 px-2.5 py-1.5 rounded-lg transition active:scale-95 cursor-pointer border border-brand-100 hover:border-brand-600"
                            title="编辑"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>编辑</span>
                          </button>
                          <button
                            onClick={() => handleOpenSignOff(rec)}
                            className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 hover:text-white font-bold bg-amber-50 hover:bg-amber-600 px-2.5 py-1.5 rounded-lg transition active:scale-95 cursor-pointer border border-amber-100 hover:border-amber-600"
                            title="签收"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>签收</span>
                          </button>
                          <button
                            onClick={() => handleDelete(rec.id)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition transition-transform active:scale-95 cursor-pointer"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 货物登记/修改弹窗 (重构为独立简洁的 WMS 入库单表单) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-4 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* 固定的标题栏 - 变更为品牌主题色 */}
            <div className="bg-brand-600 px-8 py-5 text-white flex justify-between items-center flex-shrink-0 border-b border-brand-700">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 text-white p-2.5 rounded-xl border border-white/20">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-white">
                  {editingGoods ? "编辑入库单" : "创建入库单"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-brand-100 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
              >
                ✕ 放弃
              </button>
            </div>

            {/* 滚动的主表单单栏区 - 优秀视觉平衡 */}
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-y-auto bg-white">
              <div className="p-8 text-[13px] text-slate-700 leading-relaxed space-y-6">
                
                {/* 货物基本信息 */}
                <div className="space-y-6">

                  {/* 第一排：单号与客户（客户名称输入已隐藏，默认显示登录主管账号：仓库管理员） */}
                  {/* 第一排：单号 */}
                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[11px]">入库单号 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        disabled={!!editingGoods}
                        value={entryNo}
                        onChange={(e) => setEntryNo(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-sm bg-slate-50/60 focus:bg-white transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* 麦头与配套发货箱数配置区 */}
                  <div className="space-y-3.5 bg-amber-50/15 p-4 rounded-xl border border-amber-100 shadow-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-amber-200/50">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-[12px] uppercase tracking-wider">麦头与对应发货箱数</span>
                        <span className="text-[10px] text-slate-500 font-medium">(支持单麦头对应多箱或一一对应)</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShippingMarkList([...shippingMarkList, { mark: "", pieces: 1 }])}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-white bg-white hover:bg-brand-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-600 transition active:scale-95 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>新添一行麦头</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                      {shippingMarkList.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-slate-350 transition animate-in fade-in slide-in-from-top-1 duration-150">
                          
                          {/* 序号 */}
                          <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 border border-amber-100">
                            {index + 1}
                          </div>

                          {/* 麦头输入 */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              required
                              placeholder="例如: SH-202 或 N/M (无麦头)"
                              value={item.mark}
                              onChange={(e) => {
                                const list = [...shippingMarkList];
                                list[index].mark = e.target.value;
                                setShippingMarkList(list);
                              }}
                              className="w-full px-3 py-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg outline-none bg-slate-50/20 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition"
                            />
                          </div>

                          {/* 箱数/件数 */}
                          <div className="w-32 flex-shrink-0">
                            <div className="relative rounded-md shadow-xs">
                              <input
                                type="number"
                                required
                                min={1}
                                value={item.pieces}
                                onChange={(e) => {
                                  const list = [...shippingMarkList];
                                  list[index].pieces = Math.max(1, Number(e.target.value));
                                  setShippingMarkList(list);
                                }}
                                className="w-full pl-3 pr-11 py-2 text-xs font-bold text-slate-800 border border-slate-200 rounded-lg outline-none bg-slate-50/20 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition text-center"
                              />
                              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-[10px] font-bold">箱数</span>
                              </div>
                            </div>
                          </div>

                          {/* 删除行 */}
                          <button
                            type="button"
                            disabled={shippingMarkList.length <= 1}
                            onClick={() => {
                              if (shippingMarkList.length > 1) {
                                setShippingMarkList(shippingMarkList.filter((_, i) => i !== index));
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer"
                            title="删除此麦头"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* 汇总提示 */}
                    <div className="flex justify-between items-center bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 text-[11px] text-amber-800 font-bold">
                      <span>麦头规格: 已配置 {shippingMarkList.length} 组</span>
                      <span className="text-[12px] text-amber-900 bg-amber-100/65 px-3 py-0.5 rounded-md border border-amber-200">
                        发货箱数自动合并总计: {totalPieces} 箱
                      </span>
                    </div>
                  </div>

                  {/* 多个 SKU 及其数量动态配置区 */}
                  <div className="space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-[12px] uppercase tracking-wider">SKU 与首期入库数量列表</span>
                        <span className="text-[10px] text-slate-400 font-medium">(支持输入多个)</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSkuList([...skuList, { sku: "", qty: 1, desc: "" }])}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-white bg-white hover:bg-brand-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-600 transition active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>新添一行 SKU</span>
                      </button>
                    </div>

                    <div className="space-y-3.5 max-h-[260px] overflow-y-auto pr-1">
                      {skuList.map((item, index) => (
                        <div key={index} className="flex flex-col gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-350 transition animate-in fade-in slide-in-from-top-1 duration-150">
                          
                          {/* 中文SKU名称输入框 */}
                          <div className="flex items-center gap-2 pl-9 bg-slate-50/40 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">中文SKU名称:</span>
                            <input
                              id={`sku-desc-${index}`}
                              type="text"
                              placeholder="请输入中文SKU名称 (例: 智能穿戴运动手表 / 蓝色长袖卫衣)"
                              value={item.desc || ""}
                              onChange={(e) => {
                                const list = [...skuList];
                                list[index].desc = e.target.value;
                                setSkuList(list);
                              }}
                              className="flex-1 px-3 py-1.5 text-[11px] font-medium text-slate-600 border border-slate-200 rounded-md outline-none bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 transition"
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            {/* SKU 序号 */}
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0 border border-slate-200/60 font-mono">
                              {index + 1}
                            </div>

                            {/* SKU 文本框 */}
                            <div className="flex-1 min-w-0">
                              <input
                                id={`sku-name-${index}`}
                                type="text"
                                required
                                placeholder="例: WT225-lightblue-m"
                                value={item.sku}
                                onChange={(e) => {
                                  const list = [...skuList];
                                  list[index].sku = e.target.value;
                                  setSkuList(list);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-850 border border-slate-200 rounded-lg outline-none bg-slate-50/20 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                              />
                            </div>

                            {/* 数量输入框 */}
                            <div className="w-32 flex-shrink-0">
                              <div className="relative rounded-md shadow-xs">
                                <input
                                  id={`sku-qty-${index}`}
                                  type="number"
                                  required
                                  min={1}
                                  value={item.qty}
                                  onChange={(e) => {
                                    const list = [...skuList];
                                    list[index].qty = Math.max(1, Number(e.target.value));
                                    setSkuList(list);
                                  }}
                                  className="w-full pl-3 pr-11 py-2 text-xs font-bold text-slate-850 border border-slate-200 rounded-lg outline-none bg-slate-50/20 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition text-center"
                                />
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                  <span className="text-slate-400 text-[10px] font-bold">数量</span>
                                </div>
                              </div>
                            </div>

                            {/* 删除单行按钮 */}
                            <button
                              id={`sku-delete-${index}`}
                              type="button"
                              disabled={skuList.length <= 1}
                              onClick={() => {
                                if (skuList.length > 1) {
                                  setSkuList(skuList.filter((_, i) => i !== index));
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer"
                              title="删除 SKU 行"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 发货入库单货物图片 (支持多图与预览) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                    <div className="mb-2">
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        上传发货入库单货物图片
                        <span className="text-slate-400 font-medium ml-1.5 text-[10px] lowercase">(支持拖拽或选择多张图片，点击缩略图可预览)</span>
                      </label>
                    </div>

                    {/* 拖拽与上传触发区 */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("border-brand-500", "bg-brand-50/25");
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-brand-500", "bg-brand-50/25");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-brand-500", "bg-brand-50/25");
                        if (e.dataTransfer.files) {
                          handleGoodsPhotosFileChange(e.dataTransfer.files);
                        }
                      }}
                      onClick={() => {
                        const input = document.getElementById("goods_photos_file_uploader");
                        if (input) input.click();
                      }}
                      className="border border-dashed border-slate-350 hover:border-brand-500 bg-white hover:bg-slate-50 rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group select-none shadow-3xs"
                    >
                      <input
                        id="goods_photos_file_uploader"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleGoodsPhotosFileChange(e.target.files)}
                      />
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-brand-500 group-hover:scale-110 transition duration-200" />
                      <div className="text-xs font-semibold text-slate-600">
                        拖拽多张发货货物图片到这里，或 <span className="text-brand-600 font-bold underline group-hover:text-brand-700">点击浏览本地文件</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">支持 PNG, JPG, JPEG, WEBP 格式图片 (可多选)</div>
                    </div>

                    {/* 预览缩略图列表 */}
                    {goodsPhotos.length > 0 && (
                      <div className="mt-3.5 border-t border-slate-200/60 pt-3">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-extrabold mb-2 pr-1">
                          <span className="uppercase tracking-wider">已加载货物图片 ({goodsPhotos.length} 张):</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("确定要清空当前所有已上传的货物图片吗？")) {
                                setGoodsPhotos([]);
                                addToast("已清空所有货物图片");
                              }
                            }}
                            className="text-rose-600 hover:text-rose-700 transition cursor-pointer"
                          >
                            清空全部
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5 max-h-[180px] overflow-y-auto pr-1">
                          {goodsPhotos.map((url, index) => (
                            <div
                              key={index}
                              className="group relative aspect-square rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shadow-3xs hover:border-brand-400 transition"
                            >
                              <img
                                src={url}
                                alt={`Goods Photo ${index + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                referrerPolicy="no-referrer"
                              />
                              
                              {/* 遮罩悬浮操作区 */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImageUrl(url);
                                  }}
                                  className="p-1 bg-white/90 hover:bg-white text-slate-800 rounded transition hover:scale-110 cursor-pointer"
                                  title="放大预览图"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGoodsPhotos(prev => prev.filter((_, i) => i !== index));
                                    addToast(`已移除第 ${index + 1} 张货物图片`);
                                  }}
                                  className="p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded transition hover:scale-110 cursor-pointer"
                                  title="移除此图"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* 角落序号 */}
                              <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-3xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm pointer-events-none select-none leading-none">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* 底部操作页脚 */}
              <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-end items-center gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-705 bg-white hover:bg-slate-100 transition-all font-semibold text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-sm hover:shadow transition-all text-xs cursor-pointer"
                >
                  保存记录
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 货物到货箱数登记专用弹窗 (独立简洁的流转记录) */}
      {isBoxModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-4 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* 标题栏 */}
            <div className="bg-brand-600 px-6 py-4.5 text-white flex justify-between items-center border-b border-brand-700 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/15 text-white p-2 rounded-xl border border-white/20">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-white">
                  {editingGoods ? "签收货物 (核对到货箱数与SKU)" : "登记到货总箱数 (绑定SKU数量)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBoxModalOpen(false)}
                className="text-brand-100 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
              >
                ✕ 放弃
              </button>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSaveBox} className="flex-1 flex flex-col overflow-y-auto bg-white">
              <div className="p-6 space-y-5 text-[13px]">
                
                {/* 字段输入栅格 */}
                <div className="space-y-4">
                  {/* 第一排：单号与到货日期 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[11px]">入库单号 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        disabled={!!editingGoods}
                        value={entryNo}
                        onChange={(e) => setEntryNo(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-xs bg-slate-100/60 focus:bg-white transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[11px]">签收/到货日期 <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        required
                        value={arrivalDate}
                        onChange={(e) => setArrivalDate(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition text-slate-800 text-xs font-semibold bg-white"
                      />
                    </div>
                  </div>

                  {/* 麦头与配套发货箱数配置区 */}
                  <div className="space-y-3.5 bg-amber-50/15 p-4 rounded-xl border border-amber-100 shadow-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-amber-200/50">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-[12px] uppercase tracking-wider">麦头与对应发货箱数</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {editingGoods ? "(锁定计划内容，请在后端输入实际到货箱数)" : "(支持单麦头对应多箱或一一对应)"}
                        </span>
                        <span className="text-rose-500 font-bold">*</span>
                      </div>
                      {!editingGoods && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShippingMarkList([...shippingMarkList, { mark: "", pieces: 1 }])}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-white bg-white hover:bg-brand-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-600 transition active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>新添一行麦头</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                      {shippingMarkList.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-slate-350 transition animate-in fade-in slide-in-from-top-1 duration-150">
                          
                          {/* 序号 */}
                          <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 border border-amber-100">
                            {index + 1}
                          </div>

                          {/* 麦头输入 */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              required
                              readOnly={!!editingGoods}
                              placeholder="例如: SH-202 或 N/M (无麦头)"
                              value={item.mark}
                              onChange={(e) => {
                                const list = [...shippingMarkList];
                                list[index].mark = e.target.value;
                                setShippingMarkList(list);
                              }}
                              className={`w-full px-3 py-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg outline-none bg-slate-50/20 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition ${
                                editingGoods ? "bg-slate-100/80 text-slate-500 cursor-not-allowed select-none border-dashed" : ""
                              }`}
                            />
                          </div>

                          {/* 应收量输入 */}
                          <div className="w-32 flex-shrink-0">
                            <div className="relative rounded-md shadow-xs">
                              <input
                                type="number"
                                required
                                readOnly={!!editingGoods}
                                min={1}
                                value={item.pieces}
                                onChange={(e) => {
                                  const list = [...shippingMarkList];
                                  list[index].pieces = Math.max(1, Number(e.target.value));
                                  setShippingMarkList(list);
                                }}
                                className={`w-full pl-3 pr-12 py-2 text-xs font-bold text-slate-800 border border-slate-200 rounded-lg outline-none bg-slate-50/20 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition text-center ${
                                  editingGoods ? "bg-slate-100/80 text-slate-400 cursor-not-allowed select-none border-dashed" : ""
                                }`}
                              />
                              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-[10px] font-bold">应收箱</span>
                              </div>
                            </div>
                          </div>

                          {/* 实际到货数量输入（仓库主管填写） */}
                          {!!editingGoods && (
                            <div className="w-32 flex-shrink-0 animate-in slide-in-from-right duration-200">
                              <div className="relative rounded-md shadow-xs">
                                <input
                                  type="number"
                                  required
                                  min={0}
                                  value={item.actualPieces !== undefined ? item.actualPieces : item.pieces}
                                  onChange={(e) => {
                                    const list = [...shippingMarkList];
                                    list[index].actualPieces = Math.max(0, Number(e.target.value));
                                    setShippingMarkList(list);
                                  }}
                                  className="w-full pl-3 pr-12 py-2 text-xs font-bold text-emerald-800 border border-emerald-300 rounded-lg outline-none bg-emerald-50/10 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-center"
                                />
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                  <span className="text-emerald-600 text-[10px] font-bold">实收箱</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 删除行 */}
                          {!editingGoods && (
                            <button
                              type="button"
                              disabled={shippingMarkList.length <= 1}
                              onClick={() => {
                                if (shippingMarkList.length > 1) {
                                  setShippingMarkList(shippingMarkList.filter((_, i) => i !== index));
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer"
                              title="删除此麦头"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 汇总提示 */}
                    <div className="flex justify-between items-center bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 text-[11px] text-amber-800 font-bold">
                      <span>麦头规格: 已配置 {shippingMarkList.length} 组</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded border border-slate-200">
                          应收箱数总计: {totalPieces} 箱
                        </span>
                        {!!editingGoods && (
                          <span className="text-[12px] text-emerald-900 bg-emerald-100 px-3 py-0.5 rounded-md border border-emerald-200 animate-pulse">
                            实收箱数总计: {shippingMarkList.reduce((sum, item) => sum + (item.actualPieces !== undefined ? Number(item.actualPieces) : Number(item.pieces)), 0)} 箱
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 多个 SKU 及其数量动态配置区 */}
                  <div className="space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-[12px] uppercase tracking-wider">SKU 与首期入库数量列表</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {editingGoods ? "(锁定同步内容，请查验并输入实际到货数量)" : "(支持输入多个)"}
                        </span>
                        <span className="text-rose-500 font-bold">*</span>
                      </div>
                      {!editingGoods && (
                        <button
                          type="button"
                          onClick={() => setSkuList([...skuList, { sku: "", qty: 1, desc: "" }])}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-white bg-white hover:bg-brand-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-600 transition active:scale-95 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>新添一行 SKU</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3.5 max-h-[260px] overflow-y-auto pr-1">
                      {skuList.map((item, index) => (
                        <div key={index} className="flex flex-col gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-350 transition animate-in fade-in slide-in-from-top-1 duration-150">
                          
                          {/* 中文SKU名称输入框 */}
                          <div className="flex items-center gap-2 pl-9 bg-slate-50/40 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">中文SKU名称:</span>
                            <input
                              id={`sku-box-desc-${index}`}
                              type="text"
                              required
                              readOnly={!!editingGoods}
                              placeholder="请输入中文SKU名称 (例: 智能穿戴运动手表 / 蓝色长袖卫衣)"
                              value={item.desc || ""}
                              onChange={(e) => {
                                const list = [...skuList];
                                list[index].desc = e.target.value;
                                setSkuList(list);
                              }}
                              className={`flex-1 px-3 py-1.5 text-[11px] font-medium text-slate-600 border border-slate-200 rounded-md outline-none bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 transition ${
                                editingGoods ? "bg-slate-100/80 text-slate-400 cursor-not-allowed select-none border-dashed" : ""
                              }`}
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            {/* SKU 序号 */}
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0 border border-slate-200/60 font-mono">
                              {index + 1}
                            </div>

                            {/* SKU 文本框 */}
                            <div className="flex-1 min-w-0">
                              <input
                                id={`sku-box-name-${index}`}
                                type="text"
                                required
                                readOnly={!!editingGoods}
                                placeholder="例: WT225-lightblue-m"
                                value={item.sku}
                                onChange={(e) => {
                                  const list = [...skuList];
                                  list[index].sku = e.target.value;
                                  setSkuList(list);
                                }}
                                className={`w-full px-3 py-2 text-xs font-semibold text-slate-850 border border-slate-200 rounded-lg outline-none bg-slate-50/20 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition ${
                                  editingGoods ? "bg-slate-100/80 text-slate-500 cursor-not-allowed select-none border-dashed" : ""
                                }`}
                              />
                            </div>

                            {/* 数量输入框 */}
                            <div className="w-32 flex-shrink-0">
                              <div className="relative rounded-md shadow-xs">
                                <input
                                  id={`sku-box-qty-${index}`}
                                  type="number"
                                  required
                                  readOnly={!!editingGoods}
                                  min={1}
                                  value={item.qty}
                                  onChange={(e) => {
                                    const list = [...skuList];
                                    list[index].qty = Math.max(1, Number(e.target.value));
                                    setSkuList(list);
                                  }}
                                  className={`w-full pl-3 pr-12 py-2 text-xs font-bold text-slate-850 border border-slate-200 rounded-lg outline-none bg-slate-50/20 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition text-center ${
                                    editingGoods ? "bg-slate-100/80 text-slate-400 cursor-not-allowed select-none border-dashed" : ""
                                  }`}
                                />
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                  <span className="text-slate-400 text-[10px] font-bold">应收件</span>
                                </div>
                              </div>
                            </div>

                            {/* 实际到货数量（仓库主管输入） */}
                            {!!editingGoods && (
                              <div className="w-32 flex-shrink-0 animate-in slide-in-from-right duration-200">
                                <div className="relative rounded-md shadow-xs">
                                  <input
                                    id={`sku-box-actual-qty-${index}`}
                                    type="number"
                                    required
                                    min={0}
                                    value={item.actualQty !== undefined ? item.actualQty : item.qty}
                                    onChange={(e) => {
                                      const list = [...skuList];
                                      list[index].actualQty = Math.max(0, Number(e.target.value));
                                      setSkuList(list);
                                    }}
                                    className="w-full pl-3 pr-12 py-2 text-xs font-bold text-emerald-800 border border-emerald-300 rounded-lg outline-none bg-emerald-50/10 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-center font-bold"
                                  />
                                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                    <span className="text-emerald-600 text-[10px] font-bold">实收件</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 删除单行按钮 */}
                            {!editingGoods && (
                              <button
                                id={`sku-box-delete-${index}`}
                                type="button"
                                disabled={skuList.length <= 1}
                                onClick={() => {
                                  if (skuList.length > 1) {
                                    setSkuList(skuList.filter((_, i) => i !== index));
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer"
                                title="删除 SKU 行"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>

                    {/* SKU汇总提示 */}
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                      <span className="text-slate-600">SKU 品类数: 已配置 {skuList.length} 种</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded border border-slate-200">
                          应收件数总计: {skuList.reduce((sum, item) => sum + Number(item.qty), 0)} 件
                        </span>
                        {!!editingGoods && (
                          <span className="text-[12px] text-emerald-950 bg-emerald-100 px-3 py-0.5 rounded-md border border-emerald-250 animate-pulse">
                            实收件数总计: {skuList.reduce((sum, item) => sum + (item.actualQty !== undefined ? Number(item.actualQty) : Number(item.qty)), 0)} 件
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 同步发货货物图片 (只读，支持预览与下载) */}
                  {(() => {
                    if (!editingGoods) return null;
                    const photos: string[] = [];
                    if (editingGoods.goodsPhotos && editingGoods.goodsPhotos.length > 0) {
                      editingGoods.goodsPhotos.forEach(p => {
                        if (p && !photos.includes(p)) photos.push(p);
                      });
                    }
                    if (editingGoods.goodsPhoto && !photos.includes(editingGoods.goodsPhoto)) {
                      photos.push(editingGoods.goodsPhoto);
                    }
                    if (photos.length === 0) return null;

                    return (
                      <div className="bg-indigo-50/45 p-4 rounded-xl border border-indigo-150/80 mt-2">
                        <div className="flex justify-between items-center mb-2.5">
                          <label className="block font-bold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                            创建入库单时上传的货物图片
                            <span className="text-indigo-600/70 font-medium ml-1.5 text-[10px] lowercase">(已同步入库单已上传的货物图片，无法在此修改或删除，支持预览与下载)</span>
                          </label>
                          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md border border-indigo-200">
                            共 {photos.length} 张图片
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5 max-h-[160px] overflow-y-auto pr-1">
                          {photos.map((url, index) => (
                            <div
                              key={index}
                              className="group relative aspect-square rounded-lg border border-indigo-200 bg-white overflow-hidden shadow-3xs hover:border-indigo-400 transition animate-in fade-in zoom-in-95 duration-150"
                            >
                              <img
                                src={url}
                                alt={`Goods Photo ${index + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                referrerPolicy="no-referrer"
                              />
                              
                              {/* 锁定不可编辑标识（只读） */}
                              <div className="absolute top-1 right-1 bg-indigo-600 text-white p-0.5 rounded shadow-sm z-10 pointer-events-none animate-in fade-in duration-200" title="只读同步项">
                                <CheckCircle className="w-2.5 h-2.5" />
                              </div>

                              {/* 遮罩悬浮操作区 (只读模式，仅预览与下载) */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImageUrl(url);
                                  }}
                                  className="p-1 bg-white/90 hover:bg-white text-slate-800 rounded transition hover:scale-110 cursor-pointer"
                                  title="放大预览图"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Create dynamic download link
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = `发货单货物图片_${editingGoods.entryNo || "record"}_${index + 1}.png`;
                                    link.target = "_blank";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition hover:scale-110 cursor-pointer"
                                  title="下载大图"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* 角落序号 */}
                              <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-3xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm pointer-events-none select-none leading-none">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 第三排：签收人与入库状态 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[11px]">签收人</label>
                      <select
                        value={receiverId}
                        onChange={(e) => setReceiverId(Number(e.target.value))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white transition cursor-pointer text-slate-800 text-xs font-semibold"
                      >
                        <option value={-1}>暂缓指定负责人 (空置)</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[11px]">入库状态</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white transition cursor-pointer text-slate-800 text-xs font-bold"
                      >
                        <option value="pending">在途预登</option>
                        <option value="arrived">到货待签</option>
                        <option value="completed">已签收入库</option>
                      </select>
                    </div>
                  </div>

                  {/* 上传签收图 (支持多图与预览) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                    <div className="mb-2">
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        上传签收图
                        <span className="text-slate-400 font-medium ml-1.5 text-[10px] lowercase">(支持拖拽或选择多张图片，点击缩略图可预览)</span>
                      </label>
                    </div>

                    {/* 拖拽与上传触发区 */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("border-brand-500", "bg-brand-50/25");
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-brand-500", "bg-brand-50/25");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-brand-500", "bg-brand-50/25");
                        if (e.dataTransfer.files) {
                          handleSignSlipFileChange(e.dataTransfer.files);
                        }
                      }}
                      onClick={() => {
                        const input = document.getElementById("sign_slip_file_uploader");
                        if (input) input.click();
                      }}
                      className="border border-dashed border-slate-350 hover:border-brand-500 bg-white hover:bg-slate-50 rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group select-none shadow-3xs"
                    >
                      <input
                        id="sign_slip_file_uploader"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSignSlipFileChange(e.target.files)}
                      />
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-brand-500 group-hover:scale-110 transition duration-200" />
                      <div className="text-xs font-semibold text-slate-600">
                        拖拽多张签收单照片到这里，或 <span className="text-brand-600 font-bold underline group-hover:text-brand-700">点击浏览本地本地文件</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">支持 PNG, JPG, JPEG, WEBP 格式图片 (可多选)</div>
                    </div>

                    {/* 预览缩略图列表 */}
                    {signSlipUrls.length > 0 && (
                      <div className="mt-3.5 border-t border-slate-200/60 pt-3">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-extrabold mb-2 pr-1">
                          <span className="uppercase tracking-wider">已加载签收单凭证 ({signSlipUrls.length} 张):</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("确定要清空当前所有已上传的签收单图片吗？")) {
                                setSignSlipUrls([]);
                                addToast("已清空所有签收单图片");
                              }
                            }}
                            className="text-rose-600 hover:text-rose-700 transition"
                          >
                            清空全部
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5 max-h-[180px] overflow-y-auto pr-1">
                          {signSlipUrls.map((url, index) => (
                            <div
                              key={index}
                              className="group relative aspect-square rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shadow-3xs hover:border-brand-400 transition"
                            >
                              <img
                                src={url}
                                alt={`Sign Slip ${index + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                referrerPolicy="no-referrer"
                              />
                              
                              {/* 遮罩悬浮操作区 */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImageUrl(url);
                                  }}
                                  className="p-1 bg-white/90 hover:bg-white text-slate-800 rounded transition hover:scale-110"
                                  title="放大预览图"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSignSlipUrls(prev => prev.filter((_, i) => i !== index));
                                    addToast(`已移除第 ${index + 1} 张签收图片`);
                                  }}
                                  className="p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded transition hover:scale-110"
                                  title="移除此图"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* 角落序号 */}
                              <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-3xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm pointer-events-none select-none leading-none">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 说明与备注 */}
                  <div>
                    <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-[11px]">说明与备注信息</label>
                    <textarea
                      rows={2}
                      placeholder="例：到港整批货柜，外观无异常，等待拆箱点数。"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition resize-none text-slate-800 text-xs bg-slate-50/20"
                    />
                  </div>
                </div>

              </div>

              {/* 底部操作页脚 */}
              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end items-center gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBoxModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-705 bg-white hover:bg-slate-100 transition-all font-semibold text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-sm hover:shadow transition-all text-xs cursor-pointer"
                >
                  保存记录
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 全屏图纸/签收单红印凭证 Lightbox 放大预览弹窗 */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[200] p-4 transition-all duration-300 animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button 
            type="button"
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 bg-slate-900/60 hover:bg-slate-905/80 p-2.5 rounded-full transition-all active:scale-90 z-10 shadow cursor-pointer border border-white/20"
            title="关闭预览 (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div 
            className="max-w-[92vw] max-h-[88vh] relative rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={previewImageUrl} 
              alt="签收单凭证放大预览" 
              className="max-w-full max-h-[88vh] object-contain rounded-xl select-none"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold py-1 px-3 rounded-full pointer-events-none select-none tracking-wider">
              滚动或点击背景可关闭
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

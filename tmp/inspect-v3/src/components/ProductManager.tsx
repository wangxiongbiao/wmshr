import React, { useState } from "react";
import { 
  Plus, Search, Edit, Trash2, Tag, Layers, RefreshCw, Check, X,
  BadgeAlert, BadgeCheck, AlertCircle, Calendar, ShieldAlert, ArrowDownLeft,
  ChevronDown, ChevronRight, QrCode, Printer, MapPin, ArrowLeft
} from "lucide-react";
import { Product, Customer, GoodsRecord } from "../types";

interface ProductManagerProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  customers: Customer[];
  goodsList: GoodsRecord[]; // Source inbound list
  addToast: (msg: string) => void;
}

export function ProductManager({ products, onUpdateProducts, customers, goodsList, addToast }: ProductManagerProps) {
  // Navigation & secondary page tracking state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [secSearchQuery, setSecSearchQuery] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  // Stocktake modal
  const [isStocktakeOpen, setIsStocktakeOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [stocktakeQty, setStocktakeQty] = useState<number>(0);
  const [shelfLocationInput, setShelfLocationInput] = useState("");
  const [stocktakeNote, setStocktakeNote] = useState("");

  // Product Edit Form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [skuInput, setSkuInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [specInput, setSpecInput] = useState("");
  const [productCustomerId, setProductCustomerId] = useState("");
  const [initialInventory, setInitialInventory] = useState<number>(0);
  const [shelfLocationForm, setShelfLocationForm] = useState("");
  const [productNote, setProductNote] = useState("");

  // Customer-centric expand state records
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Record<string, boolean>>({
    "CUST-101": true // Expand CUST-101 by default for clear visualization on arrival
  });

  const toggleCustomerExpand = (custId: string) => {
    setExpandedCustomerIds(prev => ({
      ...prev,
      [custId]: !prev[custId]
    }));
  };

  // Direct storage location quick edit modal
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationProduct, setLocationProduct] = useState<Product | null>(null);
  const [locationValue, setLocationValue] = useState("");

  // Manage persistent shelf locations
  const [shelfLocations, setShelfLocations] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("wms_shelf_locations");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed loading shelf locations", e);
    }
    const defaultLocs = ["A-01-01", "A-01-02", "A-02-05", "A-02-06", "B-12-01", "C-01-01", "C-01-02", "D-05-01"];
    const fromProducts = products.map(p => p.shelfLocation).filter(Boolean) as string[];
    return Array.from(new Set([...defaultLocs, ...fromProducts])).sort();
  });

  const [isShelfMgmtOpen, setIsShelfMgmtOpen] = useState(false);
  const [shelfSearchQuery, setShelfSearchQuery] = useState("");
  const [newShelfInput, setNewShelfInput] = useState("");

  const addShelfLocationIfNew = (loc: string) => {
    const clean = loc.trim().toUpperCase();
    if (!clean) return;
    if (!shelfLocations.includes(clean)) {
      const updated = [...shelfLocations, clean].sort();
      setShelfLocations(updated);
      localStorage.setItem("wms_shelf_locations", JSON.stringify(updated));
    }
  };

  const handlePrintShelfLocationLabel = (shelfLoc: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`location:${shelfLoc}`)}`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast("客户端浏览器安全保护已拦截了打印新页卡，请授权后重试");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>WMS储位标签 - ${shelfLoc}</title>
          <style>
            @page { size: 60mm 40mm; margin: 0; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 3mm;
              width: 60mm;
              height: 40mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              background-color: #ffffff;
            }
            .header {
              font-size: 8px;
              font-weight: 900;
              border-bottom: 0.8px solid #000000;
              width: 100%;
              padding-bottom: 0.5mm;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-family: monospace;
            }
            .content {
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%;
              flex: 1;
              margin: 1.5mm 0;
            }
            .qr-wrapper {
              width: 18mm;
              height: 18mm;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 0.5px solid #eaeaea;
              padding: 0.5mm;
            }
            .qr-img {
              width: 100%;
              height: 100%;
            }
            .details {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: flex-start;
              padding-left: 3mm;
            }
            .location-num {
              font-size: 20px;
              font-weight: 1000;
              color: #000000;
              font-family: "Courier New", Courier, monospace;
              letter-spacing: 0.5px;
              line-height: 1;
            }
            .description {
              font-size: 6.5px;
              color: #555555;
              margin-top: 1.5mm;
              font-weight: bold;
            }
            .footer-line {
              font-size: 5px;
              color: #333333;
              text-align: center;
              border-top: 0.3px dashed #000000;
              width: 100%;
              padding-top: 0.5mm;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            WMS 仓储货位标准识别不干胶标签
          </div>
          <div class="content">
            <div class="qr-wrapper">
              <img class="qr-img" src="${qrUrl}" />
            </div>
            <div class="details">
              <div class="location-num">${shelfLoc}</div>
              <div class="description">
                区域: ${shelfLoc.charAt(0)}区货架 架层: ${shelfLoc.split('-').slice(1).join('排') || '待分组'}<br/>
                仓区: WMS标准主仓库区
              </div>
            </div>
          </div>
          <div class="footer-line">
            WMS智能分拨系统 PDAs/手机扫码直接理顺入仓及盘库
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    addToast(`【成功发送打印任务】储位 "${shelfLoc}" 的条码标签不干胶贴模板正在生成并打印`);
  };

  const openLocationModal = (p: Product) => {
    setLocationProduct(p);
    setLocationValue(p.shelfLocation || "");
    setIsLocationModalOpen(true);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationProduct) return;

    const trimmedValue = locationValue.trim();
    const updated = products.map(p => {
      if (p.id === locationProduct.id && p.customerId === locationProduct.customerId) {
        return {
          ...p,
          shelfLocation: trimmedValue || undefined
        };
      }
      return p;
    });

    onUpdateProducts(updated);
    if (trimmedValue) {
      addShelfLocationIfNew(trimmedValue);
    }
    setIsLocationModalOpen(false);
    addToast(`【库位成功配置】商品 Sku "${locationProduct.id}" 默认库房储位已设置为: ${trimmedValue || "未分配"}`);
  };

  // Sticker QR code preview system
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const openPreviewModal = (p: Product) => {
    setPreviewProduct(p);
    setIsPreviewOpen(true);
  };

  const handlePrintLabel = (prod: Product) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(prod.id)}`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast("客户端浏览器安全保护已拦截了打印新页卡，请授权后重试");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>WMS标签打印器 - ${prod.id}</title>
          <style>
            @page { size: 60mm 40mm; margin: 0; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 3mm;
              width: 60mm;
              height: 40mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background-color: #ffffff;
            }
            .header {
              font-size: 8px;
              font-weight: 900;
              border-bottom: 0.8px solid #000000;
              padding-bottom: 0.5mm;
              text-transform: uppercase;
              letter-spacing: 0.2px;
              display: flex;
              justify-content: space-between;
              font-family: monospace;
            }
            .content {
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex: 1;
              margin: 1.5mm 0;
            }
            .details {
              flex: 1;
              margin-right: 1.5mm;
              font-size: 6.5px;
              line-height: 1.3;
              font-weight: bold;
              overflow: hidden;
            }
            .sku {
              font-size: 11px;
              font-weight: 1000;
              color: #000000;
              margin-bottom: 0.8mm;
              font-family: Courier, monospace;
            }
            .name {
              max-height: 18px;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              font-size: 6.5px;
            }
            .location-tag {
              display: inline-block;
              background-color: #000000;
              color: #ffffff;
              padding: 0.4mm 1mm;
              font-weight: 900;
              font-size: 7.5px;
              border-radius: 0.5mm;
              font-family: monospace;
              margin-top: 1mm;
            }
            .qr-wrapper {
              width: 17mm;
              height: 17mm;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 0.5px solid #eaeaea;
              padding: 0.5mm;
            }
            .qr-img {
              width: 100%;
              height: 100%;
            }
            .footer-line {
              font-size: 5px;
              color: #333333;
              text-align: center;
              border-top: 0.3px dashed #000000;
              padding-top: 0.5mm;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <span>WMS 物流储位贴标</span>
            <span>${prod.customerName.length > 8 ? prod.customerName.slice(0, 7) + ".." : prod.customerName}</span>
          </div>
          <div class="content">
            <div class="details">
              <div class="sku">${prod.id}</div>
              <div class="name">${prod.name} ${prod.spec ? "[" + prod.spec + "]" : ""}</div>
              <div class="location-tag">仓储货位: ${prod.shelfLocation || "A-区待理货"}</div>
            </div>
            <div class="qr-wrapper">
              <img class="qr-img" src="${qrUrl}" />
            </div>
          </div>
          <div class="footer-line">
            全球一件代发 WMS 自动化条码扫描生效
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    addToast(`【标签传送中】SKU标贴不干胶已发送至本地打印，请核实贴好。`);
  };

  // Filter products
  const filteredProducts = products.filter(prod => {
    const matchesSearch = 
      prod.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.spec && prod.spec.toLowerCase().includes(searchQuery.toLowerCase())) ||
      prod.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (customerFilter === "all") return matchesSearch;
    return matchesSearch && prod.customerId === customerFilter;
  });

  // Smart Sync function:
  // "商品支持获取入库管理列表的数据"
  // Scan completed WMS Inbound GoodsRecords, find all SKUs associated with specific customers, and import/merge them with current products!
  const handleSyncInboundData = () => {
    // 1. Filter completed/signed receipts
    const completedGoods = goodsList.filter(g => g.status === "completed");
    if (completedGoods.length === 0) {
      addToast("入库单中暂无【已签收入库】的记录，无法导入");
      return;
    }

    let addedSkuCount = 0;
    let updatedSkuCount = 0;

    // Clone current product list
    const updatedProducts = [...products];

    completedGoods.forEach(goodsRecord => {
      if (!goodsRecord.skus || goodsRecord.skus.length === 0) return;

      // Map matching customer
      const matchingCustomer = customers.find(c => c.name === goodsRecord.customerName) || customers[0];
      const customerId = matchingCustomer ? matchingCustomer.id : ("CUST-TEMP-" + goodsRecord.customerName);
      const customerName = goodsRecord.customerName;

      goodsRecord.skus.forEach(skuItem => {
        const skuId = skuItem.sku.trim();
        const qtyToImport = skuItem.actualQty || skuItem.qty || 0;

        if (!skuId || qtyToImport <= 0) return;

        // Try to find if SKU already exists for this client
        const existingIdx = updatedProducts.findIndex(p => p.id === skuId && p.customerId === customerId);

        if (existingIdx !== -1) {
          // Exists, let's sum up to keep inventory synchronized!
          updatedProducts[existingIdx].inventory += qtyToImport;
          updatedProducts[existingIdx].note = `[已自动叠加 WMS 入库单 SKU: ${goodsRecord.entryNo}] ${updatedProducts[existingIdx].note || ""}`;
          updatedSkuCount++;
        } else {
          // Does not exist, create a new Product
          const newProduct: Product = {
            id: skuId,
            name: skuItem.desc || goodsRecord.goodsName || `导入商品 SKU - ${skuId}`,
            spec: skuItem.desc || "根据WMS入库单自推导出",
            customerId: customerId,
            customerName: customerName,
            inventory: qtyToImport,
            shelfLocation: goodsRecord.shippingMark || "A-区待分类",
            note: `从 WMS入库单 ${goodsRecord.entryNo} 自动同步解析导入`,
            lastStocktakeTime: new Date().toISOString().replace("T", " ").substring(0, 19)
          };
          updatedProducts.push(newProduct);
          addedSkuCount++;
        }
      });
    });

    if (addedSkuCount === 0 && updatedSkuCount === 0) {
      addToast("未检测到未处理的全新入库SKU数据，全部SKU已是最高状态");
      return;
    }

    onUpdateProducts(updatedProducts);
    addToast(`【同步成功】共从WMS入库单成功创建 ${addedSkuCount} 款新SKU，累加更新 ${updatedSkuCount} 款已有SKU库存量！`);
  };

  // Open Edit/Create form
  const openAddModal = (defaultCustId?: string) => {
    setEditingProduct(null);
    setSkuInput(`SKU-${Date.now().toString().slice(-6)}`);
    setNameInput("");
    setSpecInput("");
    setProductCustomerId(defaultCustId || selectedCustomerId || customers[0]?.id || "");
    setInitialInventory(0);
    setShelfLocationForm("A-01-01");
    setProductNote("");
    setIsFormOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setSkuInput(p.id);
    setNameInput(p.name);
    setSpecInput(p.spec || "");
    setProductCustomerId(p.customerId);
    setInitialInventory(p.inventory);
    setShelfLocationForm(p.shelfLocation || "A-01-01");
    setProductNote(p.note || "");
    setIsFormOpen(true);
  };

  // Open Stocktake controls
  const openStocktakeModal = (p: Product) => {
    setActiveProduct(p);
    setStocktakeQty(p.inventory);
    setShelfLocationInput(p.shelfLocation || "");
    setStocktakeNote("");
    setIsStocktakeOpen(true);
  };

  // Submit Stocktake
  const handleSaveStocktake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;

    const previousQty = activeProduct.inventory;
    const nowTimeStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    const updated = products.map(p => {
      if (p.id === activeProduct.id && p.customerId === activeProduct.customerId) {
        return {
          ...p,
          inventory: stocktakeQty,
          shelfLocation: shelfLocationInput.trim() || undefined,
          lastStocktakeQty: previousQty,
          lastStocktakeTime: nowTimeStr,
          note: stocktakeNote.trim() 
            ? `[盘点备注 ${nowTimeStr}]: ${stocktakeNote.trim()} | ${p.note || ""}`
            : p.note
        };
      }
      return p;
    });

    onUpdateProducts(updated);
    setIsStocktakeOpen(false);
    addToast(`【盘点完成】商品 SKU "${activeProduct.id}" 库存已由 ${previousQty} 改正为 ${stocktakeQty}，已入档！`);
  };

  // Save/Create Product Item
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!skuInput.trim() || !nameInput.trim()) {
      addToast("请填写商品编码(SKU) 与 商品名称");
      return;
    }

    const selectedCust = customers.find(c => c.id === productCustomerId);
    if (!selectedCust) {
      addToast("请选择关联所有权客户");
      return;
    }

    if (!editingProduct) {
      // Check duplicated ID
      if (products.some(p => p.id === skuInput.trim() && p.customerId === productCustomerId)) {
        addToast("该客户下已有此SKU，请勿重复定义");
        return;
      }

      const newProd: Product = {
        id: skuInput.trim(),
        name: nameInput.trim(),
        spec: specInput.trim() || undefined,
        customerId: productCustomerId,
        customerName: selectedCust.name,
        inventory: initialInventory,
        shelfLocation: shelfLocationForm.trim() || undefined,
        note: productNote.trim() || undefined,
        lastStocktakeTime: new Date().toISOString().replace("T", " ").substring(0, 19)
      };

      onUpdateProducts([...products, newProd]);
      addToast(`成功注册商品 SKU: ${newProd.id}`);
    } else {
      const updated = products.map(p => {
        if (p.id === editingProduct.id && p.customerId === editingProduct.customerId) {
          return {
            ...p,
            name: nameInput.trim(),
            spec: specInput.trim() || undefined,
            customerId: productCustomerId,
            customerName: selectedCust.name,
            inventory: initialInventory,
            shelfLocation: shelfLocationForm.trim() || undefined,
            note: productNote.trim() || undefined
          };
        }
        return p;
      });
      onUpdateProducts(updated);
      addToast(`商铺客商商品信息已保存`);
    }
    const cleanLocForm = shelfLocationForm.trim();
    if (cleanLocForm) {
      addShelfLocationIfNew(cleanLocForm);
    }
    setIsFormOpen(false);
  };

  // Delete product
  const handleDeleteProduct = (id: string, custId: string, name: string) => {
    if (confirm(`确定要彻底删除该商户商品 "${name}" 的SKU目录吗？这可能会影响正在处理的订单。`)) {
      onUpdateProducts(products.filter(p => !(p.id === id && p.customerId === custId)));
      addToast(`商品目录档案已剥离: ${name}`);
    }
  };

  // Group products by customer first for secondary nested listing
  const customerProductsGroups = customers.map(cust => {
    // Collect products owned by this client
    const custProducts = products.filter(p => p.customerId === cust.id);
    
    // Perform search queries filtering
    const matchingProducts = custProducts.filter(prod => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        prod.id.toLowerCase().includes(q) ||
        prod.name.toLowerCase().includes(q) ||
        (prod.spec && prod.spec.toLowerCase().includes(q)) ||
        (prod.shelfLocation && prod.shelfLocation.toLowerCase().includes(q))
      );
    });

    return {
      customer: cust,
      allProducts: custProducts,
      filteredProducts: matchingProducts,
      productCount: custProducts.length,
      matchCount: matchingProducts.length,
      totalInventory: custProducts.reduce((sum, p) => sum + p.inventory, 0)
    };
  });

  // Filter the displayed parent customers
  const displayedGroups = customerProductsGroups.filter(group => {
    const q = searchQuery.toLowerCase().trim();
    
    // If client filter is set, check match
    if (customerFilter !== "all" && group.customer.id !== customerFilter) {
      return false;
    }

    if (!q) return true;

    // Matches customer directly or has matching products
    const matchesCustomer = 
      group.customer.name.toLowerCase().includes(q) ||
      group.customer.id.toLowerCase().includes(q);

    return matchesCustomer || group.matchCount > 0;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {selectedCustomerId ? (
        (() => {
          const activeCustomerObj = customers.find(c => c.id === selectedCustomerId);
          if (!activeCustomerObj) {
            setSelectedCustomerId(null);
            return null;
          }

          const activeCustomerProducts = products.filter(p => p.customerId === selectedCustomerId);
          const filteredActiveCustomerProducts = activeCustomerProducts.filter(prod => {
            const q = secSearchQuery.toLowerCase().trim();
            if (!q) return true;
            return (
              prod.id.toLowerCase().includes(q) ||
              prod.name.toLowerCase().includes(q) ||
              (prod.spec && prod.spec.toLowerCase().includes(q)) ||
              (prod.shelfLocation && prod.shelfLocation.toLowerCase().includes(q)) ||
              (prod.note && prod.note.toLowerCase().includes(q))
            );
          });

          // Secondary Page metrics
          const activeSmsStock = activeCustomerProducts.reduce((sum, p) => sum + p.inventory, 0);
          const outOfStockCount = activeCustomerProducts.filter(p => p.inventory <= 0).length;

          return (
            <div className="space-y-4">
              {/* Secondary Page Breadcrumb / Navigation Header */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setSecSearchQuery("");
                    }}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold transition duration-150 cursor-pointer shadow-3xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                    <span>返回客商总账目</span>
                  </button>
                  <div className="h-6 w-[1px] bg-slate-200" />
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-indigo-650 font-black">{activeCustomerObj.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md font-bold">
                        {activeCustomerObj.id}
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">商品目录明细 & 仓储实物台账中心</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const completedGoods = goodsList.filter(g => g.status === "completed" && g.customerName === activeCustomerObj.name);
                      if (completedGoods.length === 0) {
                        addToast(`该客商【${activeCustomerObj.name}】暂无已签收入库的WMS货位，无法一键导入。`);
                        return;
                      }
                      handleSyncInboundData();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-650 hover:bg-indigo-100 active:scale-95 text-xs font-bold rounded-lg cursor-pointer transition shadow-3xs"
                    title="专门同步该客户在WMS入库已核签的到货单品"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-hover" />
                    <span>同步本客商入库商品</span>
                  </button>

                  <button
                    onClick={() => setIsShelfMgmtOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 border border-slate-205 text-xs font-bold rounded-lg cursor-pointer transition shadow-3xs"
                    title="配置仓库预设货架储位以供选择并快捷打印货标"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>储位仓库配置</span>
                  </button>

                  <button
                    onClick={() => openAddModal(selectedCustomerId)}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>在此注册商品 SKU</span>
                  </button>
                </div>
              </div>

              {/* Bento Quick Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Metric 1 */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-3xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">设计注册产品数</span>
                    <span className="text-xl font-bold font-mono text-slate-800 tracking-tight mt-1 inline-block">
                      {activeCustomerProducts.length}
                    </span>
                    <span className="text-xs text-slate-500 ml-1 font-bold">款 SKU</span>
                  </div>
                  <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
                    <Tag className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-3xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">可用实物总仓储量</span>
                    <span className="text-xl font-bold font-mono text-indigo-700 tracking-tight mt-1 inline-block">
                      {activeSmsStock.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 ml-1 font-bold">件现货</span>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-3xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">绑定平台及经营状态</span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {activeCustomerObj.shops && activeCustomerObj.shops.length > 0 ? (
                        activeCustomerObj.shops.map(s => (
                          <span
                            key={s.id}
                            className={`px-2 py-0.2 rounded text-[8.5px] font-black uppercase border select-none ${
                              s.platform === "TikTok" 
                                ? "bg-slate-950 text-white border-transparent" 
                                : "bg-orange-50 text-orange-600 border-orange-100"
                            }`}
                          >
                            {s.platform}: {s.shopName.length > 8 ? s.shopName.slice(0, 7) + ".." : s.shopName}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold leading-none">未联通电商网店</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-650 rounded-xl flex flex-col items-center justify-center">
                    {outOfStockCount > 0 ? (
                      <span className="text-[9.5px] font-bold text-rose-550 flex items-center gap-0.5 animate-bounce">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{outOfStockCount}款断货</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600">库存充足</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub Search Container */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-96 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={secSearchQuery}
                    onChange={(e) => setSecSearchQuery(e.target.value)}
                    placeholder="在当前客商中快速搜索商品 SKU、储位、规格及名称..."
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-brand-500 text-slate-700 bg-slate-50 transition placeholder:text-slate-400 font-medium"
                  />
                </div>
                <div className="text-[11px] text-slate-400 font-bold w-full md:text-right select-none">
                  {secSearchQuery.trim() ? (
                    <span>已筛选匹配商品: <b className="text-brand-600 font-mono text-sm">{filteredActiveCustomerProducts.length}</b> 款 / 共 {activeCustomerProducts.length} 款</span>
                  ) : (
                    <span>当前显示该客商全部 <b className="text-slate-750 font-mono">{activeCustomerProducts.length}</b> 款已注册单品档案</span>
                  )}
                </div>
              </div>

              {/* Secondary Details Specific SKU Directory table list */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 select-none">
                    <Layers className="w-4 h-4 text-brand-600" />
                    <span>【{activeCustomerObj.name}】商品详细台账目录</span>
                  </span>
                  <span className="text-[10.5px] text-slate-400 font-bold bg-slate-50 px-2.5 py-0.5 border border-slate-150 rounded-full select-none">
                    二级明细页面 · 货品储位扫码打印一体化
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px] uppercase select-none tracking-wider">
                        <th className="px-5 py-3.5">货架单品 SKU 编码</th>
                        <th className="px-5 py-3.5">商品描述 / 销售名称</th>
                        <th className="px-5 py-3.5">设计规格尺寸</th>
                        <th className="px-5 py-3.5 text-right">可用在库库存</th>
                        <th className="px-5 py-3.5">WMS 货库储位</th>
                        <th className="px-5 py-3.5">备注信息</th>
                        <th className="px-5 py-3.5">最近物理盘点校准</th>
                        <th className="px-5 py-3.5 text-center">热敏标签贴生成</th>
                        <th className="px-5 py-3.5 text-center">管理操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold text-xs">
                      {filteredActiveCustomerProducts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-20 bg-slate-50/20 text-slate-400">
                            <div className="max-w-md mx-auto space-y-2 p-6 bg-white border border-slate-150 rounded-xl shadow-3xs">
                              <p className="font-bold text-slate-700 text-xs">没有查查找对应的 SKU 档案</p>
                              <p className="text-[10.5px] text-slate-400 leading-normal">
                                可以在右上方点击“在此注册商品 SKU”手动录入，或选择“同步本客商入库商品”将WMS上架箱数一键解析进系统。
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredActiveCustomerProducts.map(prod => (
                          <tr key={`${prod.id}-${prod.customerId}`} className="hover:bg-slate-50/50 transition">
                            {/* SKU Code */}
                            <td className="px-5 py-4 font-mono text-indigo-750 font-black whitespace-nowrap text-xs select-all">
                              {prod.id}
                            </td>

                            {/* SKU Name description */}
                            <td className="px-5 py-4 max-w-[220px] truncate animate-in duration-200" title={prod.name}>
                              <div className="flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                <span className="text-slate-800 font-bold text-xs">{prod.name}</span>
                              </div>
                            </td>

                            {/* Spec */}
                            <td className="px-5 py-4 text-slate-500 whitespace-nowrap truncate max-w-[120px]">
                              {prod.spec || <span className="text-slate-350 font-normal">未定义规格</span>}
                            </td>

                            {/* Inventory count with warn states */}
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <span className={`font-mono text-xs font-black ${
                                prod.inventory <= 0 
                                  ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100" 
                                  : prod.inventory <= 5 
                                  ? "text-amber-650 bg-amber-50 px-2 py-0.5 rounded border border-amber-100" 
                                  : "text-brand-650"
                              }`}>
                                {prod.inventory.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-0.5 font-bold">件</span>
                              {prod.inventory <= 0 && (
                                <span className="block text-[8px] text-rose-500 font-extrabold mt-0.5">缺货预警 *</span>
                              )}
                            </td>

                            {/* Shelf Location with inline direct quick click setup trigger */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${
                                  prod.shelfLocation 
                                    ? "bg-slate-900 border-slate-950 text-white shadow-3xs" 
                                    : "bg-rose-50 border-rose-150 text-rose-500"
                                }`}>
                                  {prod.shelfLocation || "未分配储位"}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openLocationModal(prod);
                                  }}
                                  className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="快捷设置商品的存放货架库位"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                {prod.shelfLocation && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintShelfLocationLabel(prod.shelfLocation!);
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                    title="打印该商品仓储货架储位的不干胶识别贴标纸"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Notes description */}
                            <td className="px-5 py-4 text-slate-450 text-[11px] max-w-[150px] truncate" title={prod.note}>
                              {prod.note || <span className="text-slate-300">—</span>}
                            </td>

                            {/* Physical stocktake history details logged */}
                            <td className="px-5 py-4 text-slate-450 text-[10.5px] whitespace-nowrap">
                              {prod.lastStocktakeTime ? (
                                <div>
                                  <p className="font-mono text-[10.1px] leading-tight text-slate-500">{prod.lastStocktakeTime}</p>
                                  {prod.lastStocktakeQty !== undefined && (
                                    <p className="text-[9.5px] text-slate-400 leading-none mt-0.5 font-medium">
                                      原本库存: <span className="font-bold font-mono text-slate-500">{prod.lastStocktakeQty}</span>
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 font-normal">暂无系统物理盘点</span>
                              )}
                            </td>

                            {/* Print barcodes & labels sticker printer */}
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPreviewModal(prod);
                                  }}
                                  className="px-2.5 py-1 bg-slate-55 border border-slate-200 text-slate-650 hover:bg-slate-150 active:scale-95 text-[10px] font-black rounded transition flex items-center gap-1 shadow-3xs cursor-pointer select-none"
                                >
                                  <QrCode className="w-3.5 h-3.5 text-slate-550" />
                                  <span>标签预览</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintLabel(prod);
                                  }}
                                  className="px-2.5 py-1 bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-100 active:scale-95 text-[10px] font-black rounded transition flex items-center gap-1 shadow-3xs cursor-pointer select-none font-bold"
                                >
                                  <Printer className="w-3.5 h-3.5 text-brand-550" />
                                  <span>标签打印</span>
                                </button>
                              </div>
                            </td>

                            {/* Operations panel */}
                            <td className="px-5 py-4 text-center text-[10.5px]">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openStocktakeModal(prod);
                                  }}
                                  className="px-2.5 py-0.5 bg-brand-55 border border-brand-100 text-brand-600 hover:bg-brand-100 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 cursor-pointer font-extrabold"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>物理盘点</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(prod);
                                  }}
                                  className="p-1 text-slate-550 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition cursor-pointer"
                                  title="修改商品规格以及基本信息"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProduct(prod.id, prod.customerId, prod.name);
                                  }}
                                  className="p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-605 rounded-lg transition cursor-pointer"
                                  title="从货架商品目录中移除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        // Render PRIMARY MASTER PAGE (客户大目录账册)
        <>
          {/* Search and filters bar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Search SKU or Name */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索SKU、商品名称规格、所属客商..."
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-brand-500 text-slate-700 bg-slate-50 transition placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Customer select filter */}
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer outline-none focus:ring-1 focus:ring-brand-500 hover:bg-slate-50 transition"
              >
                <option value="all">所有所属客户</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={handleSyncInboundData}
                title="一键抓取并累加WMS入库单已签收货物的SKU箱数，智能映射客商与库存"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-650 hover:bg-indigo-100 active:scale-95 text-xs font-bold rounded-lg cursor-pointer transition shadow-3xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-hover" />
                <span>获取入库管理数据同步</span>
              </button>
              
              <button
                onClick={() => setIsShelfMgmtOpen(true)}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="管理系统内已配置开辟的库房货架与标贴打印"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-300" />
                <span>智能储位仓库配置</span>
              </button>

              <button
                onClick={() => openAddModal()}
                className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>自建商品SKU</span>
              </button>
            </div>
          </div>

          {/* Grouped Catalog View: One customer - One row */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <span className="font-bold text-slate-800 text-xs sm:text-sm">客商仓储商品库存账册 (共包含 {customers.length} 位客户，注册 {products.length} 款 SKU)</span>
              </div>
              <div className="text-[11px] text-indigo-600 font-semibold px-2 py-0.5 rounded-full bg-indigo-50 flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>支持获取WMS入库已签收库存</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px] text-[13px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider select-none">
                    <th className="w-12 px-5 py-3.5 text-center">状态</th>
                    <th className="px-5 py-3.5">客商编号</th>
                    <th className="px-5 py-3.5">商户全称</th>
                    <th className="px-5 py-3.5 text-center">账目货币</th>
                    <th className="px-5 py-3.5 text-center">存仓商品品种数 (SKUS)</th>
                    <th className="px-5 py-3.5 text-right">总物理仓储量</th>
                    <th className="px-5 py-3.5 text-center">关联授权网店数</th>
                    <th className="px-5 py-3.5 text-center">二级产品台账</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400 font-semibold">
                        <div className="max-w-md mx-auto space-y-1.5 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <p className="font-bold text-slate-700 text-xs">暂无匹配的客商商品账目</p>
                          <p className="text-[10px] text-slate-400">您可以直接点击上方【获取入库管理数据同步】自动将入库报表的SKU与到货签收箱数同步导入这里！</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedGroups.map(group => {
                      const hasShops = group.customer.shops && group.customer.shops.length > 0;
                      
                      return (
                        <tr 
                          key={group.customer.id}
                          className="hover:bg-slate-55/70 border-b border-slate-100 transition duration-150 cursor-pointer"
                          onClick={() => setSelectedCustomerId(group.customer.id)}
                        >
                          {/* Left icon status */}
                          <td className="px-5 py-4 text-center">
                            <div className="p-1 text-brand-600 bg-brand-50/50 rounded-lg inline-flex items-center justify-center">
                              <Layers className="w-4 h-4 text-brand-650" />
                            </div>
                          </td>

                          {/* Customer ID */}
                          <td className="px-5 py-4 font-mono font-bold text-indigo-700">
                            {group.customer.id}
                          </td>

                          {/* Customer Corporate Name */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-850 text-xs leading-none">{group.customer.name}</span>
                              {group.customer.status === "disabled" && (
                                <span className="px-1.5 py-0.2 text-[8px] font-bold rounded bg-rose-50 text-rose-500 border border-rose-100 leading-none">
                                  已停用
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Settlement Currency */}
                          <td className="px-5 py-4 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-600 border border-blue-100">
                              {group.customer.currency}
                            </span>
                          </td>

                          {/* SKU Count */}
                          <td className="px-5 py-4 text-center font-bold text-slate-700">
                            {searchQuery.trim() ? (
                              <div className="text-xs">
                                <span className="text-brand-600 font-extrabold font-mono">{group.matchCount}</span>
                                <span className="text-slate-400"> / {group.productCount} 款</span>
                              </div>
                            ) : (
                              <span className="font-mono text-xs">{group.productCount} 款 Sku</span>
                            )}
                          </td>

                          {/* Stock Sum */}
                          <td className="px-5 py-4 text-right">
                            <span className={`font-mono text-xs font-black ${
                              group.totalInventory === 0 ? "text-slate-400" : "text-slate-800"
                            }`}>
                              {group.totalInventory.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1 font-bold">件</span>
                          </td>

                          {/* Store Binding badges */}
                          <td className="px-5 py-4 text-center">
                            {!hasShops ? (
                              <span className="text-[10px] text-slate-350">未绑定网店</span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                {group.customer.shops!.map(s => (
                                  <span 
                                    key={s.id} 
                                    title={`${s.platform}: ${s.shopName}`}
                                    className={`px-1.5 py-0.2 rounded font-extrabold text-[8px] uppercase select-none border whitespace-nowrap ${
                                      s.platform === "TikTok" 
                                        ? "bg-slate-950 text-white border-transparent" 
                                        : "bg-orange-50 text-orange-600 border-orange-100"
                                    }`}
                                  >
                                    {s.platform}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Go to secondary details page link button */}
                          <td className="px-5 py-4 text-center text-xs">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomerId(group.customer.id);
                              }}
                              className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[11px] font-black tracking-wide transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                            >
                              <span>查看商品明细</span>
                              <ChevronRight className="w-3.5 h-3.5 text-brand-600" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. Physical Stocktake inventory Edit popup */}
      {isStocktakeOpen && activeProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-brand-100 animate-pulse" />
                <div>
                  <h3 className="font-bold text-base tracking-wide">商品库存物理盘点正位</h3>
                  <p className="text-xs text-brand-200">SKU: {activeProduct.id}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsStocktakeOpen(false)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStocktake} className="p-6 space-y-5 flex-1 overflow-y-auto">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-1.5">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>重要：物理库存盘点正位提示</span>
                </p>
                <p className="text-xs text-amber-700/90 leading-normal">
                  您正在强行调整客户 <b>{activeProduct.customerName}</b> 下商品 <b>{activeProduct.name} ({activeProduct.id})</b> 的物理库存，盘点保存后将写入审计历史供核销参考。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">原本系统库存数 (只读)</label>
                  <div className="px-4 py-2.5 bg-slate-100 text-slate-500 font-mono font-bold text-sm rounded-xl border border-slate-200">
                    {activeProduct.inventory} 件
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">实测盘点后件数 <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    value={stocktakeQty}
                    onChange={(e) => setStocktakeQty(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-extrabold focus:bg-white bg-slate-50/50 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">存放库位编号代码</label>
                <input
                  type="text"
                  value={shelfLocationInput}
                  onChange={(e) => setShelfLocationInput(e.target.value)}
                  placeholder="如: A-12-05 或 B区-重货架01"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">盘点差异原因/备注</label>
                <textarea
                  value={stocktakeNote}
                  onChange={(e) => setStocktakeNote(e.target.value)}
                  placeholder="例如：年中大盘点重新校正、因包裹损坏破损核减、理货发现落箱等..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-semibold h-20 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsStocktakeOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-sm cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl transition text-sm cursor-pointer"
                >
                  确认盘点正位
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create or Edit Product Details Popup Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-100" />
                <h3 className="font-bold text-base tracking-wide">{editingProduct ? `编辑商品Sku资料` : "新注册商品Sku目录"}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 flex-1 overflow-y-auto text-sm font-semibold">
              <div className="grid grid-cols-2 gap-4">
                {/* SKU Code */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">商品 SKU 编码 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    disabled={!!editingProduct}
                    placeholder="如: SKU-849302"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold bg-slate-55 disabled:bg-slate-100 disabled:cursor-not-allowed uppercase font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">全局唯一的最小存货单元ID，不能重复</p>
                </div>

                {/* Customer owner */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">所属商户客商 <span className="text-rose-500">*</span></label>
                  <select
                    value={productCustomerId}
                    onChange={(e) => setProductCustomerId(e.target.value)}
                    disabled={!!editingProduct}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold bg-white"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">商品名称 / 销售描述 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="如：韩国3CE九色眼影盘 #波打樱花红"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Spec */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">规格大小/尺寸规格</label>
                  <input
                    type="text"
                    value={specInput}
                    onChange={(e) => setSpecInput(e.target.value)}
                    placeholder="如: 9色/盒, 100g"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500"
                  />
                </div>

                {/* Shelf Location */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">初始库位编码</label>
                  <input
                    type="text"
                    value={shelfLocationForm}
                    onChange={(e) => setShelfLocationForm(e.target.value)}
                    placeholder="可自定义输入，或从下方快捷选择"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-mono font-extrabold uppercase text-slate-800"
                  />
                  <div className="mt-1.5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">快捷选择已有储位:</span>
                    <div className="flex flex-wrap gap-1 max-h-[72px] overflow-y-auto p-1.5 bg-slate-50 border border-slate-100 rounded-lg select-none">
                      {shelfLocations.map(loc => {
                        const isOccupied = products.some(p => p.shelfLocation === loc);
                        const isCurrent = shelfLocationForm.trim().toUpperCase() === loc.toUpperCase();
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setShelfLocationForm(loc)}
                            className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold rounded border transition cursor-pointer select-none ${
                              isCurrent
                                ? "bg-slate-900 border-slate-950 text-white shadow-3xs"
                                : isOccupied
                                ? "bg-white border-emerald-250 text-emerald-700"
                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-350"
                            }`}
                          >
                            {loc}
                          </button>
                        );
                      })}
                      {shelfLocations.length === 0 && (
                        <span className="text-[10px] text-slate-400">系统尚无储位，您输入的新储位保存时会自动导入。</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Qty */}
              <div>
                <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">初始现货库存件数 (件)</label>
                <input
                  type="number"
                  value={initialInventory}
                  onChange={(e) => setInitialInventory(Math.max(0, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">商品描述备注</label>
                <textarea
                  value={productNote}
                  onChange={(e) => setProductNote(e.target.value)}
                  placeholder="可在此写入该SKU的出保及打包注意事项"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-medium h-20 resize-none"
                />
              </div>

              {/* Footer buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition text-sm cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl transition text-sm cursor-pointer"
                >
                  保存商品SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Direct Storage Location Quick Edit Popup Modal */}
      {isLocationModalOpen && locationProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-205">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-100 animate-bounce" />
                <div>
                  <h3 className="font-bold text-base tracking-wide">快捷配置商品特定储位货位</h3>
                  <p className="text-xs text-brand-200">SKU: {locationProduct.id}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsLocationModalOpen(false)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveLocation} className="p-6 space-y-5 text-sm font-semibold">
              <div className="p-4 bg-slate-50 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider block">当前处理商品 SKU 规格</span>
                <p className="font-bold text-slate-800 text-sm leading-tight">{locationProduct.name}</p>
                <p className="text-slate-500 mt-1">所属客商：<span className="font-extrabold text-indigo-600">{locationProduct.customerName}</span></p>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-500 uppercase tracking-wider text-xs">选择系统已有储位货架号</label>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-2.5 bg-slate-50 border border-slate-100 rounded-xl select-none">
                  {shelfLocations.map(loc => {
                    const isOccupied = products.some(p => p.shelfLocation === loc);
                    const isCurrent = locationValue.trim().toUpperCase() === loc.toUpperCase();
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocationValue(loc)}
                        className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition cursor-pointer select-none flex items-center gap-1 ${
                          isCurrent
                            ? "bg-slate-900 border-slate-950 text-white shadow-3xs"
                            : isOccupied
                            ? "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50/50"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-350"
                        }`}
                        title={isOccupied ? "部分商品正存放于此" : "空置可直接选用"}
                      >
                        {loc}
                        {isOccupied && !isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animation-pulse" />
                        )}
                      </button>
                    );
                  })}
                  {shelfLocations.length === 0 && (
                    <span className="text-xs text-slate-400 p-1">暂无建立的预定义储位，请直接点击下方手动快速新增。</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-2 uppercase tracking-wider text-xs">自定义/修改储位货架号 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  placeholder="如: A-04-12, B区-架05-层02 等 (可以输入已有储位或直接自定义输入新增)"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-extrabold uppercase text-slate-800 font-mono"
                />
                <p className="text-xs text-slate-400 mt-1.5 leading-normal">
                  储位编号指定后将同步到理货分拨、WMS一件代发、及拣货指导单中以供扫描及打印，若是新输入储位它将自动保存于预置库位字典中。
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-xl transition text-xs cursor-pointer select-none"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl transition text-xs flex items-center gap-1 cursor-pointer select-none"
                >
                  <Check className="w-4 h-4" />
                  <span>提交储位设置</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Interactive Barcode/QR Code Product Label Sticker Printer & Preview Center Modal */}
      {isPreviewOpen && previewProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-205">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-brand-100" />
                <div>
                  <h3 className="font-bold text-base tracking-wide">WMS 货储标签与防伪二维码中心</h3>
                  <p className="text-xs text-brand-200">一键生成系统唯一不干胶物流标贴与防伪认证</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPreviewOpen(false)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Preview Box Content */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Sticker Design Layout instructions */}
              <div className="text-xs text-slate-550 leading-normal bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                <p className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-brand-500" />
                  <span>不干胶标贴标准说明 (60mm × 40mm 打印热敏标尺寸)</span>
                </p>
                <p>该二维码标签可贴在商铺实物包裹表面或仓储隔板上，库房作业人员在入库上架、扫码拣货或发货盘点时，使用扫码枪对准此二维码扫码，可自动检索出商品档案，实现拣配校核。</p>
              </div>

              {/* Thermal Sticker Label Visual Mockup Canvas Card */}
              <div className="flex flex-col items-center justify-center py-6 bg-slate-100 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3.5 select-none">
                  🔍 物理标贴热敏打印图案效果高精度预览
                </span>
                
                {/* Visual Sticker Card */}
                <div className="w-[340px] h-[210px] bg-white border-2 border-slate-400 shadow-md rounded-lg p-3.5 flex flex-col justify-between font-sans select-none text-slate-900 border-dashed relative">
                  {/* Outer edge cuts indicator (fake) */}
                  <div className="absolute top-0 bottom-0 left-0 right-0 border border-slate-100 rounded-md pointer-events-none" />

                  {/* Top Header line inside sticker */}
                  <div className="border-b border-slate-900 pb-1 flex justify-between items-center text-[9px] font-black tracking-wider uppercase font-mono">
                    <span>WMS 仓配系统商品货位贴明细</span>
                    <span className="text-brand-650 bg-brand-50 px-1 border border-brand-100 rounded leading-none text-[8.5px]">
                      {previewProduct.customerName.length > 8 ? previewProduct.customerName.slice(0, 7) + ".." : previewProduct.customerName}
                    </span>
                  </div>

                  {/* Central details with QR Code */}
                  <div className="flex items-center justify-between gap-2.5 my-2 flex-1">
                    {/* Left: Product tags */}
                    <div className="flex-1 flex flex-col justify-between h-full">
                      <div>
                        {/* Dynamic SKU code */}
                        <span className="font-mono text-[14px] font-black text-black leading-tight block select-all">
                          {previewProduct.id}
                        </span>
                        
                        {/* Title */}
                        <p className="text-[10px] font-bold text-slate-800 leading-tight block mt-1 line-clamp-2 max-h-[28px]">
                          {previewProduct.name}
                        </p>
                      </div>

                      {/* Storage Shelf code */}
                      <div>
                        <span className="inline-block bg-black text-white px-1.5 py-0.5 rounded text-[10.5px] font-black tracking-wide font-mono mt-2 leading-none uppercase">
                          仓储储位: {previewProduct.shelfLocation || "A-区待理顺区"}
                        </span>
                      </div>
                    </div>

                    {/* Right: Generous QR Code Container */}
                    <div className="w-24 h-24 border border-slate-200 rounded p-1 flex items-center justify-center shrink-0 bg-white shadow-3xs">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(previewProduct.id)}`}
                        alt="Product SKU Tag QR Code"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Bottom tracker line inside sticker */}
                  <div className="border-t border-slate-900/50 pt-1 text-center text-[7.5px] font-extrabold text-slate-500 font-mono tracking-wide leading-none select-none">
                    * WMS 全球一件代发仓配中心自检有效标签 *
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="flex items-center gap-2 justify-center text-xs font-bold text-slate-500">
                <span className="flex items-center gap-0.5 text-emerald-600">
                  <Check className="w-4 h-4" />
                  <span>动态二维码生成就绪</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-0.5 text-indigo-650">
                  <Printer className="w-4 h-4" />
                  <span>支持打印终端直连不干胶打印机</span>
                </span>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer select-none"
              >
                关闭预览
              </button>
              
              <button
                type="button"
                onClick={() => handlePrintLabel(previewProduct)}
                className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer select-none"
              >
                <Printer className="w-4 h-4" />
                <span>立即发送本地打印机进行贴纸打印</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. System Warehouse Shelf Storage Location Configuration & Management Center Modal */}
      {isShelfMgmtOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base tracking-wide">智能储位库区配置与标签打印中心</h3>
                  <p className="text-xs text-slate-400">进行物理仓库货位注册登记，生成统一规格 60mm × 40mm 的库区货位识别不干胶条码标识贴</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setIsShelfMgmtOpen(false);
                  setNewShelfInput("");
                  setShelfSearchQuery("");
                }}
                className="text-slate-400 hover:text-white text-base p-1.5 hover:bg-slate-800 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Inner Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Register New Location Form & Real-time Stats */}
              <div className="md:col-span-1 space-y-5">
                {/* 1. Register Form */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-200 pb-2">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs uppercase tracking-wider">开辟登记全新储位</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">储位编码代码 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={newShelfInput}
                        onChange={(e) => setNewShelfInput(e.target.value.toUpperCase())}
                        placeholder="如: A-01-08 或 B-10-02"
                        className="w-full px-3 py-2 border border-slate-255 rounded-lg outline-none text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono font-bold uppercase text-slate-800"
                      />
                    </div>
                    
                    <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                      推荐使用标准编码格式: <span className="font-mono font-bold text-slate-600">区号-货架排-层列</span>（例如: A-02-05 表示 A区2号货架5层货位），便于后期拣货路径自动合并。
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        const clean = newShelfInput.trim().toUpperCase();
                        if (!clean) {
                          addToast("请输入储位货架号代码");
                          return;
                        }
                        if (shelfLocations.includes(clean)) {
                          addToast(`储位货位 "${clean}" 已经注册过了，请勿重复注册`);
                          return;
                        }
                        const updated = [...shelfLocations, clean].sort();
                        setShelfLocations(updated);
                        localStorage.setItem("wms_shelf_locations", JSON.stringify(updated));
                        setNewShelfInput("");
                        addToast(`【注册成功】全新库内货位 "${clean}" 已经成功开辟，可立时于商品清单中选择分配`);
                      }}
                      className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs transition cursor-pointer select-none text-center shadow-3xs"
                    >
                      确认开辟该储位
                    </button>
                  </div>
                </div>

                {/* 2. Real-time Warehouse Placement Stats */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-200 pb-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs uppercase tracking-wider">仓储储位实况统计</span>
                  </div>

                  {(() => {
                    const total = shelfLocations.length;
                    const occupiedLocs = Array.from(new Set(products.map(p => p.shelfLocation).filter(Boolean)));
                    const occupiedCount = shelfLocations.filter(loc => occupiedLocs.includes(loc)).length;
                    const freeCount = total - occupiedCount;
                    const usageRate = total > 0 ? Math.round((occupiedCount / total) * 100) : 0;

                    return (
                      <div className="grid grid-cols-2 gap-3 text-semibold text-xs pt-1">
                        <div className="bg-white border border-slate-150 p-2.5 rounded-lg flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold">储位库位总量</span>
                          <span className="text-sm font-extrabold text-slate-850 mt-1 font-mono">{total} <span className="text-[9px]">个</span></span>
                        </div>
                        <div className="bg-white border border-slate-150 p-2.5 rounded-lg flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold">空闲库位可用</span>
                          <span className="text-sm font-extrabold text-indigo-650 mt-1 font-mono">{freeCount} <span className="text-[9px]">个</span></span>
                        </div>
                        <div className="bg-white border border-slate-150 p-2.5 rounded-lg flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold">已堆件占用储位</span>
                          <span className="text-sm font-extrabold text-emerald-600 mt-1 font-mono">{occupiedCount} <span className="text-[9px]">个</span></span>
                        </div>
                        <div className="bg-white border border-slate-150 p-2.5 rounded-lg flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold">仓容储物占用率</span>
                          <span className="text-sm font-extrabold text-amber-600 mt-1 font-mono">{usageRate}%</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Column: Preconfigured Shelf Locations Grid & Printing Actions */}
              <div className="md:col-span-2 flex flex-col min-h-[300px] bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 overflow-hidden">
                {/* Filters */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-3 shrink-0">
                  <div className="flex items-center gap-1 text-slate-800 font-bold">
                    <MapPin className="w-4 h-4 text-slate-700" />
                    <span className="text-xs uppercase tracking-wider font-extrabold">仓储储位列表档案</span>
                  </div>

                  <div className="relative w-48 sm:w-60 shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={shelfSearchQuery}
                      onChange={(e) => setShelfSearchQuery(e.target.value)}
                      placeholder="模糊检索储位编码..."
                      className="w-full pl-8 pr-3 py-1 border border-slate-250 rounded-lg outline-none text-xs focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700 font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Table list of locations */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-white border border-slate-200/60 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold text-[10px] uppercase tracking-wider select-none">
                        <th className="px-4 py-2.5">储位位置号</th>
                        <th className="px-4 py-2.5">仓位暂放状态 / 所属绑定货架商品</th>
                        <th className="px-4 py-2.5 text-center w-28">操作面板</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                      {(() => {
                        const filtered = shelfLocations.filter(loc => 
                          loc.toLowerCase().includes(shelfSearchQuery.toLowerCase().trim())
                        );

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={3} className="text-center py-16 text-slate-400">
                                <p className="text-xs">暂无匹配搜寻的储位编码</p>
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map(loc => {
                          const matchedProds = products.filter(p => p.shelfLocation?.toUpperCase() === loc.toUpperCase());
                          const isOccupied = matchedProds.length > 0;

                          return (
                            <tr key={loc} className="hover:bg-slate-50/50 transition border-b border-slate-100 duration-150">
                              <td className="px-4 py-3 font-mono text-xs text-slate-900 font-extrabold tracking-wider">
                                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded uppercase font-black">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span>{loc}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {isOccupied ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1.5 py-0.2 px-1.5 text-[9px] font-extrabold bg-emerald-55 text-emerald-700 border border-emerald-150 rounded leading-none select-none">
                                      已存放 ({matchedProds.length} 款货品)
                                    </span>
                                    <div className="text-[10px] text-slate-500 leading-tight space-y-0.5 mt-1 font-semibold">
                                      {matchedProds.slice(0, 2).map(p => (
                                        <p key={p.id} className="truncate max-w-[280px]">
                                          <span className="font-mono text-indigo-650 font-black">[{p.id}]</span> {p.name}
                                        </p>
                                      ))}
                                      {matchedProds.length > 2 && (
                                        <p className="text-slate-400 text-[9px]">等其余 {matchedProds.length - 2} 款商品...</p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 py-0.2 px-1.5 text-[9px] font-extrabold bg-slate-100 text-slate-400 border border-slate-200 rounded leading-none select-none">
                                    此库位空置
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Print location sticker */}
                                  <button
                                    type="button"
                                    onClick={() => handlePrintShelfLocationLabel(loc)}
                                    className="p-1 px-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 active:scale-95 rounded transition cursor-pointer select-none font-black text-[10px] flex items-center gap-0.5"
                                    title="生成标准货位不干胶标识并打印"
                                  >
                                    <Printer className="w-3 h-3 shrink-0" />
                                    <span>打印</span>
                                  </button>

                                  {/* Delete location */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const associated = products.filter(p => p.shelfLocation?.toUpperCase() === loc.toUpperCase());
                                      if (associated.length > 0) {
                                        addToast(`无法删除储位 "${loc}"，因为有 ${associated.length} 款商品正暂用此库位（如: ${associated[0].name}）。请先更改这些商品的库位。`);
                                        return;
                                      }
                                      if (confirm(`确认注销并删除库内配置储位代码 "${loc}" 吗？`)) {
                                        const updated = shelfLocations.filter(l => l !== loc);
                                        setShelfLocations(updated);
                                        localStorage.setItem("wms_shelf_locations", JSON.stringify(updated));
                                        addToast(`【成功注销】储位 "${loc}" 已经从系统储位预置表中注销并删除。`);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded transition cursor-pointer select-none"
                                    title="注销删除该闲置储位"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-400 font-bold font-mono select-none">60mm x 40mm WMS 标准货位标识贴 • 支持各种热敏条码打印机直接出纸</span>
              
              <button
                type="button"
                onClick={() => {
                  setIsShelfMgmtOpen(false);
                  setNewShelfInput("");
                  setShelfSearchQuery("");
                }}
                className="px-6 py-2 bg-slate-900 border border-slate-950 text-white font-extrabold rounded-lg text-xs hover:bg-slate-800 shadow-sm transition active:scale-95 cursor-pointer select-none"
              >
                关闭并返回台账
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

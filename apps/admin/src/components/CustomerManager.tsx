import React, { useState } from "react";
import { 
  Plus, Search, Edit, Trash2, Shield, Eye, Settings, Check, X,
  ExternalLink, ToggleLeft, ToggleRight, DollarSign, Award, ShoppingBag, Globe, Info
} from "lucide-react";
import { Customer, ShopBinding } from "../types";

interface CustomerManagerProps {
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
  addToast: (msg: string) => void;
}

export function CustomerManager({ customers, onUpdateCustomers, addToast }: CustomerManagerProps) {
  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");

  // Edit / Add Customer Form Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [idInput, setIdInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [contactInput, setContactInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState("CNY");
  const [availableLimitInput, setAvailableLimitInput] = useState<number>(50000);
  const [creditLimitInput, setCreditLimitInput] = useState<number>(100000);
  const [billingTemplateInput, setBillingTemplateInput] = useState("WMS标准月结模版");

  // Store Bindings Modal states
  const [isBindingsOpen, setIsBindingsOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  
  // Create / Edit Bound Store Form
  const [newStorePlatform, setNewStorePlatform] = useState<"TikTok" | "Shopee">("TikTok");
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreId, setNewStoreId] = useState("");

  // Credit/Ledger transaction log systems
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
  const [txType, setTxType] = useState<"recharge" | "consumption">("recharge");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txNote, setTxNote] = useState<string>("");
  const [txOperator, setTxOperator] = useState<string>("财务出纳员");

  const openLedgerModal = (cust: Customer) => {
    setLedgerCustomer(cust);
    setTxType("recharge");
    setTxAmount(0);
    setTxNote("");
    setTxOperator("财务出纳员");
    setIsLedgerOpen(true);
  };

  const handleAddLedgerEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerCustomer) return;
    if (txAmount <= 0) {
      addToast("请输入大于 0 的有效发生金额");
      return;
    }
    if (!txNote.trim()) {
      addToast("请写入充值/费用扣减的用途或凭证备注");
      return;
    }

    const logAmt = txAmount;
    let nextAvailable = ledgerCustomer.availableLimit;
    if (txType === "recharge") {
      nextAvailable += logAmt;
    } else {
      nextAvailable -= logAmt;
    }

    const newLogEntry = {
      id: `tx-${Date.now()}`,
      type: txType,
      amount: logAmt,
      balanceAfter: nextAvailable,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      note: txNote.trim(),
      operator: txOperator.trim() || "系统出纳员"
    };

    const updated = customers.map(c => {
      if (c.id === ledgerCustomer.id) {
        const logs = c.creditLogs || [];
        const nextCustomer: Customer = {
          ...c,
          availableLimit: nextAvailable,
          creditLogs: [newLogEntry, ...logs]
        };
        setLedgerCustomer(nextCustomer);
        return nextCustomer;
      }
      return c;
    });

    onUpdateCustomers(updated);
    setTxAmount(0);
    setTxNote("");
    addToast(`【账款入账】${txType === "recharge" ? "充值加额" : "消耗核销"} ¥${logAmt.toLocaleString()} 已入账`);
  };

  // Filtered lists
  const filteredCustomers = customers.filter(cust => {
    const matchesSearch = 
      cust.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.contact.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && cust.status === statusFilter;
  });

  const openAddModal = () => {
    setEditingCustomer(null);
    setIdInput(`CUST-${100 + customers.length + 1}`);
    setNameInput("");
    setContactInput("");
    setCurrencyInput("CNY");
    setAvailableLimitInput(50000);
    setCreditLimitInput(100000);
    setBillingTemplateInput("WMS标准月结模版");
    setIsFormOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setIdInput(cust.id);
    setNameInput(cust.name);
    setContactInput(cust.contact);
    setCurrencyInput(cust.currency);
    setAvailableLimitInput(cust.availableLimit);
    setCreditLimitInput(cust.creditLimit);
    setBillingTemplateInput(cust.billingTemplate);
    setIsFormOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !contactInput.trim() || !idInput.trim()) {
      addToast("请填写必填字段 (客户ID、客户名称、对接人)");
      return;
    }

    if (!editingCustomer) {
      // Check duplicated ID
      if (customers.some(c => c.id === idInput.trim())) {
        addToast("该客户ID已存在，请维护唯一ID");
        return;
      }

      const newCustomer: Customer = {
        id: idInput.trim(),
        name: nameInput.trim(),
        contact: contactInput.trim(),
        currency: currencyInput,
        availableLimit: availableLimitInput,
        creditLimit: creditLimitInput,
        billingTemplate: billingTemplateInput,
        status: "enabled",
        shops: []
      };

      onUpdateCustomers([...customers, newCustomer]);
      addToast(`新增客户 "${newCustomer.name}" 成功！`);
    } else {
      const updated = customers.map(c => {
        if (c.id === editingCustomer.id) {
          return {
            ...c,
            name: nameInput.trim(),
            contact: contactInput.trim(),
            currency: currencyInput,
            availableLimit: availableLimitInput,
            creditLimit: creditLimitInput,
            billingTemplate: billingTemplateInput
          };
        }
        return c;
      });
      onUpdateCustomers(updated);
      addToast(`编辑客户信息已保存`);
    }
    setIsFormOpen(false);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`确定要删除客户 "${name}" 吗？该操作无法撤销。`)) {
      onUpdateCustomers(customers.filter(c => c.id !== id));
      addToast(`已成功删除客户: ${name}`);
    }
  };

  const toggleCustomerStatus = (id: string, currentStatus: "enabled" | "disabled") => {
    const nextStatus = currentStatus === "enabled" ? "disabled" : "enabled";
    onUpdateCustomers(customers.map(c => {
      if (c.id === id) {
        return { ...c, status: nextStatus };
      }
      return c;
    }));
    addToast(`客户状态已变更为: ${nextStatus === "enabled" ? "【启用】" : "【禁用】"}`);
  };

  // Open Bound Stores Panel
  const openBindingsModal = (cust: Customer) => {
    setActiveCustomer(cust);
    setNewStorePlatform("TikTok");
    setNewStoreName("");
    setNewStoreId("");
    setIsBindingsOpen(true);
  };

  // Bind a store
  const handleAddStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    if (!newStoreName.trim() || !newStoreId.trim()) {
      addToast("请输入店铺名称与店铺专属ID");
      return;
    }

    const newBinding: ShopBinding = {
      id: `shop-${Date.now()}`,
      platform: newStorePlatform,
      shopName: newStoreName.trim(),
      shopId: newStoreId.trim(),
      status: "enabled",
      authorizedAt: new Date().toISOString().split("T")[0]
    };

    const updated = customers.map(c => {
      if (c.id === activeCustomer.id) {
        const shops = [...c.shops, newBinding];
        // Keep active customer in sync for render
        setActiveCustomer({ ...c, shops });
        return { ...c, shops };
      }
      return c;
    });

    onUpdateCustomers(updated);
    setNewStoreName("");
    setNewStoreId("");
    addToast(`成功绑定零售店铺: ${newBinding.shopName} (${newBinding.platform})`);
  };

  // Unbind/Delete store
  const handleRemoveStore = (shopIdToDel: string) => {
    if (!activeCustomer) return;
    if (confirm("确定要解绑该零售店铺吗？解绑后订单数据抓取功能将不可用。")) {
      const updated = customers.map(c => {
        if (c.id === activeCustomer.id) {
          const shops = c.shops.filter(s => s.id !== shopIdToDel);
          setActiveCustomer({ ...c, shops });
          return { ...c, shops };
        }
        return c;
      });
      onUpdateCustomers(updated);
      addToast("店铺接合授权已成功解除");
    }
  };

  const toggleStoreStatus = (shopIdToToggle: string) => {
    if (!activeCustomer) return;
    const updated = customers.map(c => {
      if (c.id === activeCustomer.id) {
        const shops = c.shops.map(s => {
          if (s.id === shopIdToToggle) {
            const nextStat = s.status === "enabled" ? "disabled" : "enabled";
            return { ...s, status: nextStat as "enabled" | "disabled" };
          }
          return s;
        });
        setActiveCustomer({ ...c, shops });
        return { ...c, shops };
      }
      return c;
    });
    onUpdateCustomers(updated);
    addToast("网店授权连接状态已被成功更改");
  };

  return (
    <div className="space-y-4">
      {/* Top action/filters bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索客户ID、名称、对接人..."
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-brand-500 text-slate-700 bg-slate-50 transition placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Status select filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer outline-none focus:ring-1 focus:ring-brand-500 hover:bg-slate-50 transition"
          >
            <option value="all">所有状态</option>
            <option value="enabled">启用中</option>
            <option value="disabled">已禁用</option>
          </select>
        </div>

        {/* Create button */}
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新增合作客户</span>
        </button>
      </div>

      {/* Main Customers List Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-600" />
            <span className="font-bold text-slate-800 text-sm">WMS服务大客户名册 ({filteredCustomers.length} 个)</span>
          </div>
          <p className="text-[11px] text-slate-400">管理跨境商户及绑定托管的TikTok/Shopee电商渠道</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px] text-[13px]">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <th className="px-5 py-3.5">客户ID</th>
                <th className="px-5 py-3.5">客户名称</th>
                <th className="px-5 py-3.5">对接人 / 联系方式</th>
                <th className="px-5 py-3.5 text-center">结算货币</th>
                <th className="px-5 py-3.5 text-right">可用额度</th>
                <th className="px-5 py-3.5 text-right">信用额度</th>
                <th className="px-5 py-3.5 text-center">绑定授权店铺数</th>
                <th className="px-5 py-3.5">结算计费模版</th>
                <th className="px-5 py-3.5 text-center">运营状态</th>
                <th className="px-5 py-3.5 text-center">操作选项</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                    暂无可匹配的合作客户档案记录
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* ID */}
                    <td className="px-5 py-4 font-mono font-bold text-slate-500">
                      {cust.id}
                    </td>

                    {/* Name */}
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-800 text-xs">{cust.name}</span>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4 text-slate-650">
                      {cust.contact}
                    </td>

                    {/* Currency */}
                    <td className="px-5 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-600 border border-blue-100">
                        {cust.currency}
                      </span>
                    </td>

                    {/* Available Limit */}
                    <td className="px-5 py-4 text-right font-bold">
                      <div className="text-slate-800 text-xs font-mono">
                        ¥{(cust.availableLimit || 0).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => openLedgerModal(cust)}
                        className="text-[10px] text-brand-600 hover:text-brand-850 inline-flex items-center gap-0.5 mt-1 font-extrabold cursor-pointer hover:underline"
                        title="查看/登记充值与扣费记录"
                      >
                        <DollarSign className="w-2.5 h-2.5" />
                        <span>充值及账款明细</span>
                      </button>
                    </td>

                    {/* Credit Limit */}
                    <td className="px-5 py-4 text-right font-bold text-slate-600">
                      ¥{(cust.creditLimit || 0).toLocaleString()}
                    </td>

                    {/* Shops Limit */}
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => openBindingsModal(cust)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-600 group transition text-[11px] font-bold text-slate-700 cursor-pointer"
                        title="查看/追加绑定跨境电商店铺"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500" />
                        <span>{cust.shops?.length || 0} 个</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>

                    {/* Billing template */}
                    <td className="px-5 py-4 text-slate-500">
                      <span className="text-[11px] font-bold text-slate-700 border-l-2 border-brand-500 pl-1.5">
                        {cust.billingTemplate}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleCustomerStatus(cust.id, cust.status)}
                        className="cursor-pointer outline-none active:scale-95 transition"
                        title={cust.status === "enabled" ? "点击禁用该客户" : "点击启动该客户"}
                      >
                        {cust.status === "enabled" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100">
                            ● 运行中
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-500 border border-rose-100">
                            ● 已停用
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Control buttons */}
                    <td className="px-5 py-4 text-center font-bold">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => toggleCustomerStatus(cust.id, cust.status)}
                          className={`p-1.5 rounded-lg transition ${cust.status === "enabled" ? "text-amber-500 hover:bg-amber-50" : "text-emerald-500 hover:bg-emerald-50"}`}
                          title={cust.status === "enabled" ? "快速挂起禁用" : "快速授权解锁"}
                        >
                          {cust.status === "enabled" ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openLedgerModal(cust)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="充值与可用额度账目流水"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(cust)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 rounded-lg transition"
                          title="编辑修改档案支出额度"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition"
                          title="移除客户档案"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Forms Modal (Customer edit/create) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-100" />
                <h3 className="font-bold text-base tracking-wide">{editingCustomer ? `编辑客商档案` : "新开合作商客户户头"}</h3>
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
            <form onSubmit={handleSaveCustomer} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* ID Input */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">客户编号ID <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    disabled={!!editingCustomer}
                    placeholder="如: CUST-01"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-semibold bg-slate-50 disabled:bg-slate-100/80 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400 mt-1">全局唯一身份标识，保存后不可更改</p>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">客户全称 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="如: 上海跨境国际商贸有限公司"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Contact Input */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">业务对接人及电话 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    placeholder="如: 张经理 13800000000"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-semibold"
                  />
                </div>

                {/* Currency selection */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">结算货币单位</label>
                  <select
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold bg-white"
                  >
                    <option value="CNY">CNY - 人民币元</option>
                    <option value="USD">USD - 美元金</option>
                    <option value="THB">THB - 泰铢币</option>
                    <option value="MMK">MMK - 缅甸元</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Available Limit */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">当前可用额度 (RMB)</label>
                  <input
                    type="number"
                    value={availableLimitInput}
                    onChange={(e) => setAvailableLimitInput(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold"
                  />
                </div>

                {/* Credit Limit */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">授信总额 (RMB)</label>
                  <input
                    type="number"
                    value={creditLimitInput}
                    onChange={(e) => setCreditLimitInput(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold"
                  />
                </div>
              </div>

              {/* Billing template */}
              <div>
                <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">关联计费结算模版</label>
                <select
                  value={billingTemplateInput}
                  onChange={(e) => setBillingTemplateInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold bg-white"
                >
                  <option value="WMS标准月结模版">WMS标准月结模版（适用于大体量客户）</option>
                  <option value="日结极速入库计费">日结极速入库计费（一票一清一结）</option>
                  <option value="外贸一件代发专属模版">外贸一件代发专属模版（TK专线补贴通道）</option>
                </select>
              </div>

              {/* Footer buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3.5">
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
                  保存档案
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store Bindings Modal */}
      {isBindingsOpen && activeCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-205">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-100" />
                <div>
                  <h3 className="font-bold text-base tracking-wide">跨境销售网店授权绑定</h3>
                  <p className="text-xs text-brand-200">客户名称: {activeCustomer.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsBindingsOpen(false)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* List and form */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              {/* Form to Bind New store */}
              <form onSubmit={handleAddStore} className="bg-slate-50 border border-slate-150/60 rounded-xl p-5 space-y-4">
                <span className="block font-extrabold text-xs text-slate-500 uppercase tracking-widest mb-1">
                  💡 新联结网店授权绑定通道
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1.5 text-xs">电商平台</label>
                    <select
                      value={newStorePlatform}
                      onChange={(e) => setNewStorePlatform(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-semibold bg-white"
                    >
                      <option value="TikTok">TikTok Shop (TK网店)</option>
                      <option value="Shopee">Shopee Mall (虾皮网店)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 mb-1.5 text-xs">网店自定义描述名称</label>
                    <input
                      type="text"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      placeholder="例如：Tik韩国美妆海外一号店"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 mb-1.5 text-xs">电商平台店铺独有ID (Shop ID)</label>
                    <input
                      type="text"
                      value={newStoreId}
                      onChange={(e) => setNewStoreId(e.target.value)}
                      placeholder="例: tk-shop-849503"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-semibold font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-sm transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加绑定授权</span>
                  </button>
                </div>
              </form>

              {/* List of Bound stores */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-extrabold text-slate-550 uppercase tracking-widest">
                    当前已绑定授权店铺数 ({activeCustomer.shops?.length || 0} 个)
                  </span>
                  <span className="text-xs text-slate-400">已启用授权的可自动拉取并核销该店铺的零售订单</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-3xs max-h-[300px] overflow-y-auto">
                  {(activeCustomer.shops || []).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-medium bg-slate-50/20">
                      暂无关联绑定的销售店，无法运行API自动化拉单。
                    </div>
                  ) : (
                    activeCustomer.shops.map((shop) => (
                      <div key={shop.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/60 transition">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 border ${
                            shop.platform === "TikTok" 
                              ? "bg-slate-950 text-white border-transparent shadow-xs" 
                              : "bg-orange-50 text-orange-600 border-orange-150"
                          }`}>
                            {shop.platform} Shop
                          </span>
                          <div>
                            <p className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
                              <span>{shop.shopName}</span>
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              ID: {shop.shopId} • 授权日期: {shop.authorizedAt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleStoreStatus(shop.id)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer transition ${
                              shop.status === "enabled"
                                ? "bg-emerald-550 text-emerald-600 hover:bg-emerald-100 border border-emerald-150"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-150"
                            }`}
                          >
                            {shop.status === "enabled" ? "● 已开启" : "○ 已暂挂"}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveStore(shop.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="解除此店铺绑定"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-150 p-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBindingsOpen(false)}
                className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 font-extrabold text-white rounded-lg transition text-xs cursor-pointer shadow-3xs"
              >
                保存并关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Customer Ledger Accounting Center Modal */}
      {isLedgerOpen && ledgerCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand-100 animate-pulse" />
                <div>
                  <h3 className="font-bold text-base tracking-wide">客商专属可用额度记账中心 / 充值记账与费用累计明细</h3>
                  <p className="text-xs text-brand-200">
                    客户编号: {ledgerCustomer.id} | 开发商户名: {ledgerCustomer.name} (结算货币: {ledgerCustomer.currency})
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsLedgerOpen(false)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Split Grid Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
              {/* Left Side: Register New Top-up/Deduction Form (4cols) */}
              <div className="lg:col-span-4 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  ✍️ 登记新的资金充值或费用扣减
                </h4>
                
                <form onSubmit={handleAddLedgerEntry} className="space-y-4">
                  {/* Ledger transaction type selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">记账流水种类</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTxType("recharge")}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition cursor-pointer select-none ${
                          txType === "recharge"
                            ? "bg-emerald-600 border-emerald-500 text-white shadow-xs font-extrabold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        📥 新增资金充值 (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxType("consumption")}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition cursor-pointer select-none ${
                          txType === "consumption"
                            ? "bg-amber-550 border-amber-500 text-white shadow-xs font-extrabold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        📤 发生业务支出 (-)
                      </button>
                    </div>
                  </div>

                  {/* Transaction Amount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">变动金额 ({ledgerCustomer.currency})</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">
                        {ledgerCustomer.currency === "USD" ? "$" : "¥"}
                      </span>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={txAmount || ""}
                        onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl outline-none text-sm font-black text-slate-800 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      输入此次入账/扣除的具体数值。系统将自动加算或扣除可用余额。
                    </p>
                  </div>

                  {/* Usage / Voucher Note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">款项流水事由 / 凭证备注 <span className="text-rose-500">*</span></label>
                    <textarea
                      required
                      value={txNote}
                      onChange={(e) => setTxNote(e.target.value)}
                      placeholder="例 (充值): 汇丰网银汇入预付金，财务核销。
例 (消耗): TK订单拣件打包出库快递运费核销扣除。"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs text-slate-700 font-medium h-24 resize-none placeholder:text-slate-400"
                    />
                  </div>

                  {/* Operator */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">记账经办复核人</label>
                    <input
                      type="text"
                      value={txOperator}
                      onChange={(e) => setTxOperator(e.target.value)}
                      placeholder="财务出纳科-小张"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-xs text-slate-700 font-bold bg-white"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl transition text-xs cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>确认审核入账可用余额</span>
                  </button>
                </form>
              </div>

              {/* Right Side: Ledger Statistics list (8cols) */}
              <div className="lg:col-span-8 p-6 overflow-hidden flex flex-col space-y-4">
                
                {/* Statistics Cards Row */}
                <div className="grid grid-cols-3 gap-3.5 select-none">
                  {/* Available Limit */}
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl shadow-3xs">
                    <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest">当前可用余额</span>
                    <div className="text-[17px] font-black text-blue-800 font-mono mt-0.5 whitespace-nowrap">
                      {ledgerCustomer.currency === "USD" ? "$" : "¥"}
                      {ledgerCustomer.availableLimit.toLocaleString()}
                    </div>
                  </div>

                  {/* Total Topup */}
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl shadow-3xs">
                    <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest">累计充值(总费用)</span>
                    <div className="text-[17px] font-black text-emerald-800 font-mono mt-0.5 whitespace-nowrap">
                      {ledgerCustomer.currency === "USD" ? "$" : "¥"}
                      {(
                        (ledgerCustomer.creditLogs || [])
                          .filter(log => log.type === "recharge")
                          .reduce((sum, log) => sum + log.amount, 0)
                      ).toLocaleString()}
                    </div>
                  </div>

                  {/* Total Consumption */}
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl shadow-3xs">
                    <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-widest">累计消费(总支出)</span>
                    <div className="text-[17px] font-black text-amber-805 font-mono mt-0.5 whitespace-nowrap">
                      {ledgerCustomer.currency === "USD" ? "$" : "¥"}
                      {(
                        (ledgerCustomer.creditLogs || [])
                          .filter(log => log.type === "consumption")
                          .reduce((sum, log) => sum + log.amount, 0)
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Receipts table title */}
                <div className="flex justify-between items-center bg-white border-b border-slate-100 pb-2 select-none">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                    📜 全周期资金流向对账清单
                  </span>
                  <p className="text-[11px] text-slate-400">所有扣费和充值由系统审计并永久可溯源</p>
                </div>

                {/* Ledger entries list */}
                <div className="flex-1 overflow-y-auto border border-slate-200/85 rounded-xl bg-white shadow-3xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[10.5px] uppercase select-none">
                        <th className="px-3 py-2.5">流水交易时间</th>
                        <th className="px-3 py-2.5 text-center">流水账款类型</th>
                        <th className="px-3 py-2.5 text-right">交易变动额</th>
                        <th className="px-3 py-2.5 text-right">交易后余额</th>
                        <th className="px-3 py-2.5">明细备注/转手凭证说明</th>
                        <th className="px-3 py-2.5">核算人</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                      {(!ledgerCustomer.creditLogs || ledgerCustomer.creditLogs.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="text-center py-20 text-slate-400 font-medium">
                            暂无可用交易账面记录，支持通过左侧控制台登记第一笔充值或消费流水。
                          </td>
                        </tr>
                      ) : (
                        ledgerCustomer.creditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-3 py-3 font-mono text-slate-450 whitespace-nowrap text-[11px]">{log.createdAt}</td>
                            <td className="px-3 py-3 text-center">
                              {log.type === "recharge" ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[9px]">
                                  充值入账
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 font-bold text-[9px]">
                                  业务消耗
                                </span>
                              )}
                            </td>
                            <td className={`px-3 py-3 text-right font-black font-mono text-sm whitespace-nowrap ${
                              log.type === "recharge" ? "text-emerald-600" : "text-amber-600"
                            }`}>
                              {log.type === "recharge" ? "+" : "-"}
                              {log.amount.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-bold font-mono text-slate-700 whitespace-nowrap">
                              ¥{(log.balanceAfter || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-slate-500 break-all max-w-[220px] text-[11px] leading-relaxed">
                              {log.note}
                            </td>
                            <td className="px-3 py-3 text-slate-400 text-[11.5px]">{log.operator}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex justify-between items-center text-xs text-slate-400 font-semibold select-none">
              <span>WMS安全提示：可用额度影响网店API订单自动捕获锁定，请合理规划储备金池。</span>
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 font-extrabold text-white rounded-xl transition cursor-pointer shadow-3xs shrink-0 text-sm"
              >
                关闭账目窗口
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState } from "react";
import { 
  Plus, Search, Edit, Trash2, Shield, Eye, Settings, Check, X,
  ExternalLink, ToggleLeft, ToggleRight, DollarSign, Award, ShoppingBag, Globe, Info
} from "lucide-react";
import { Customer, ShopBinding } from "../types";
import { getTranslation, Language } from "../lib/i18n";

interface CustomerManagerProps {
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
  addToast: (msg: string) => void;
  lang?: Language;
}

export function CustomerManager({ customers, onUpdateCustomers, addToast, lang = "zh-CN" }: CustomerManagerProps) {

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
  const [addressInput, setAddressInput] = useState("");
  const [taxNoInput, setTaxNoInput] = useState("");
  const [bankAccountInput, setBankAccountInput] = useState("");
  const [bankNameInput, setBankNameInput] = useState("");

  // Store Bindings Modal states
  const [isBindingsOpen, setIsBindingsOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  
  // Detail Modal view state
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  
  // Cancel authorization confirmation state
  const [shopToUnbind, setShopToUnbind] = useState<{ shopId: string; shopName: string } | null>(null);
  
  // Authorization simulation state
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStep, setAuthStep] = useState(0);
  const [authStatusText, setAuthStatusText] = useState("");
  
  // Create / Edit Bound Store Form
  const [newStorePlatform, setNewStorePlatform] = useState<"TikTok" | "Shopee">("Shopee");
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
      addToast(lang === "en" ? "Please enter a valid amount greater than 0" : "请输入大于 0 的有效发生金额");
      return;
    }
    if (!txNote.trim()) {
      addToast(lang === "en" ? "Please enter the reason or description for the transaction" : "请写入充值/费用扣减的用途或凭证备注");
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
      operator: txOperator.trim() || (lang === "en" ? "System Cashier" : "系统出纳员")
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
    addToast(lang === "en" 
      ? `[Account Entry] ${txType === "recharge" ? "Recharge Credited" : "Expense Deducted"} ¥${logAmt.toLocaleString()} posted successfully.` 
      : `【账款入账】${txType === "recharge" ? "充值加额" : "消耗核销"} ¥${logAmt.toLocaleString()} 已入账`);
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
    // Find the maximum numeric part of existing customer IDs to safely increment and generate a unique ID
    const numericParts = customers
      .map(c => {
        const match = c.id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(num => !isNaN(num));
    const nextNum = numericParts.length > 0 ? Math.max(...numericParts) + 1 : 101;
    setIdInput(`CUST-${nextNum}`);
    setNameInput("");
    setContactInput("");
    setCurrencyInput("CNY");
    setAvailableLimitInput(50000);
    setCreditLimitInput(100000);
    setBillingTemplateInput("WMS标准月结模版");
    setAddressInput("");
    setTaxNoInput("");
    setBankAccountInput("");
    setBankNameInput("");
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
    setAddressInput(cust.address || "");
    setTaxNoInput(cust.taxNo || "");
    setBankAccountInput(cust.bankAccount || "");
    setBankNameInput(cust.bankName || "");
    setIsFormOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !contactInput.trim() || !idInput.trim()) {
      addToast(lang === "en" ? "Please fill in all required fields (ID, Name, Contact Person)" : "请填写必填字段 (客户ID、客户名称、对接人)");
      return;
    }

    if (!editingCustomer) {
      // Check duplicated ID
      if (customers.some(c => c.id === idInput.trim())) {
        addToast(lang === "en" ? "This customer ID already exists, please enter a unique ID" : "该客户ID已存在，请维护唯一ID");
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
        shops: [],
        address: addressInput.trim() || undefined,
        taxNo: taxNoInput.trim() || undefined,
        bankAccount: bankAccountInput.trim() || undefined,
        bankName: bankNameInput.trim() || undefined
      };

      onUpdateCustomers([...customers, newCustomer]);
      addToast(lang === "en" ? `Customer "${newCustomer.name}" added successfully!` : `新增客户 "${newCustomer.name}" 成功！`);
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
            billingTemplate: billingTemplateInput,
            address: addressInput.trim() || undefined,
            taxNo: taxNoInput.trim() || undefined,
            bankAccount: bankAccountInput.trim() || undefined,
            bankName: bankNameInput.trim() || undefined
          };
        }
        return c;
      });
      onUpdateCustomers(updated);
      addToast(lang === "en" ? "Customer profile changes saved successfully!" : `编辑客户信息已保存`);
    }
    setIsFormOpen(false);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    const confirmMessage = lang === "en" 
      ? `Are you sure you want to delete customer "${name}"? This action cannot be undone.` 
      : `确定要删除客户 "${name}" 吗？该操作无法撤销。`;
    if (confirm(confirmMessage)) {
      onUpdateCustomers(customers.filter(c => c.id !== id));
      addToast(lang === "en" ? `Customer "${name}" deleted successfully` : `已成功删除客户: ${name}`);
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
    const statusText = nextStatus === "enabled" 
      ? (lang === "en" ? "[Enabled]" : "【启用】") 
      : (lang === "en" ? "[Disabled]" : "【禁用】");
    addToast(lang === "en" 
      ? `Customer status updated to: ${statusText}` 
      : `客户状态已变更为: ${statusText}`);
  };

  // Open Bound Stores Panel
  const openBindingsModal = (cust: Customer) => {
    setActiveCustomer(cust);
    setNewStorePlatform("Shopee");
    setNewStoreName("");
    setNewStoreId("");
    setIsAuthorizing(false);
    setAuthStep(0);
    setAuthStatusText("");
    setIsBindingsOpen(true);
  };

  // Bind a store with realistic API authorization flow simulation
  const handleAddStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    if (!newStoreName.trim() || !newStoreId.trim()) {
      addToast(lang === "en" ? "Please enter custom store name and Shop ID" : "请输入店铺名称与店铺专属ID");
      return;
    }

    // Start simulation steps
    setIsAuthorizing(true);
    setAuthStep(1);
    setAuthStatusText(lang === "en"
      ? `Redirecting and initializing secure connection with ${newStorePlatform} open platform...`
      : `正在跳转并初始化对 ${newStorePlatform} 开放平台的安全鉴权对接...`);

    setTimeout(() => {
      setAuthStep(2);
      setAuthStatusText(lang === "en"
        ? `Requesting ${newStorePlatform} OAuth2 gateway, exchanging security keys for AccessToken...`
        : `正在请求 ${newStorePlatform} OAuth2 授权网关，安全握手获取 AccessToken 凭证...`);

      setTimeout(() => {
        setAuthStep(3);
        setAuthStatusText(lang === "en"
          ? `Verifying merchant shop ID: ${newStoreId} and retrieving shop metadata...`
          : `正在验证商户店铺专属ID: ${newStoreId} 并拉取远程网店基础元数据...`);

        setTimeout(() => {
          setAuthStep(4);
          setAuthStatusText(lang === "en"
            ? `API handshake verified! Mounting store to customer [${activeCustomer.name}]...`
            : `API核验通过！正在同步绑定至客户 [${activeCustomer.name}] 档案中...`);

          setTimeout(() => {
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
                const shops = [...(c.shops || []), newBinding];
                // Keep active customer in sync for render
                setActiveCustomer({ ...c, shops });
                return { ...c, shops };
              }
              return c;
            });

            onUpdateCustomers(updated);
            setNewStoreName("");
            setNewStoreId("");
            setIsAuthorizing(false);
            setAuthStep(0);
            setAuthStatusText("");
            addToast(lang === "en" 
              ? `Successfully bound store: ${newBinding.shopName} (${newBinding.platform})` 
              : `成功绑定授权店铺: ${newBinding.shopName} (${newBinding.platform})`);
          }, 800);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  // Unbind/Delete store
  const handleRemoveStore = (shopIdToDel: string, shopName: string) => {
    setShopToUnbind({ shopId: shopIdToDel, shopName });
  };

  const confirmRemoveStore = () => {
    if (!activeCustomer || !shopToUnbind) return;
    const { shopId, shopName } = shopToUnbind;
    const updated = customers.map(c => {
      if (c.id === activeCustomer.id) {
        const shops = c.shops.filter(s => s.id !== shopId);
        setActiveCustomer({ ...c, shops });
        return { ...c, shops };
      }
      return c;
    });
    onUpdateCustomers(updated);
    addToast(lang === "en" ? `Store [${shopName}] authorization has been removed` : `店铺 [${shopName}] 授权已成功解除`);
    setShopToUnbind(null);
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
    addToast(lang === "en" ? "Store authorization status updated successfully" : "网店授权连接状态已被成功更改");
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
              placeholder={getTranslation("cust_search_placeholder", lang)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-brand-500 text-slate-700 bg-slate-50 transition placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Status select filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer outline-none focus:ring-1 focus:ring-brand-500 hover:bg-slate-50 transition"
          >
            <option value="all">{getTranslation("cust_all_status", lang)}</option>
            <option value="enabled">{getTranslation("cust_status_enabled", lang)}</option>
            <option value="disabled">{getTranslation("cust_status_disabled", lang)}</option>
          </select>
        </div>

        {/* Create button */}
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{getTranslation("cust_add_btn", lang)}</span>
        </button>
      </div>

      {/* Main Customers List Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-600" />
            <span className="font-bold text-slate-800 text-sm">
              {getTranslation("cust_register_title", lang)} ({filteredCustomers.length} {lang === "en" ? "items" : "个"})
            </span>
          </div>
          {getTranslation("cust_register_desc", lang) && (
            <p className="text-[11px] text-slate-400">{getTranslation("cust_register_desc", lang)}</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px] text-[13px]">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <th className="px-5 py-3.5">{getTranslation("cust_th_id", lang)}</th>
                <th className="px-5 py-3.5">{getTranslation("cust_th_name", lang)}</th>
                <th className="px-5 py-3.5">{getTranslation("cust_th_contact", lang)}</th>
                <th className="px-5 py-3.5 text-center">{getTranslation("cust_th_currency", lang)}</th>
                <th className="px-5 py-3.5 text-right">{getTranslation("cust_th_balance", lang)}</th>
                <th className="px-5 py-3.5 text-right">{getTranslation("cust_th_credit", lang)}</th>
                <th className="px-5 py-3.5 text-center">{getTranslation("cust_th_shops", lang)}</th>
                <th className="px-5 py-3.5">{getTranslation("cust_th_template", lang)}</th>
                <th className="px-5 py-3.5 text-center">{getTranslation("cust_th_status", lang)}</th>
                <th className="px-5 py-3.5 text-center">{getTranslation("cust_th_actions", lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                    {getTranslation("cust_empty_records", lang)}
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
                        className="text-[10px] text-brand-600 hover:text-brand-805 inline-flex items-center gap-0.5 mt-1 font-extrabold cursor-pointer hover:underline"
                        title={lang === "en" ? "View/Register recharge and fee deduction" : "查看/登记充值与扣费记录"}
                      >
                        <DollarSign className="w-2.5 h-2.5" />
                        <span>{getTranslation("cust_recharge_detail_btn", lang)}</span>
                      </button>
                    </td>

                    {/* Credit Limit */}
                    <td className="px-5 py-4 text-right font-bold text-slate-600">
                      ¥{(cust.creditLimit || 0).toLocaleString()}
                    </td>

                    {/* Shops Count Trigger Modal Popup */}
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => openBindingsModal(cust)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 text-indigo-700 transition duration-150 cursor-pointer shadow-3xs"
                        title={lang === "en" ? "Click to view/manage authorized stores" : "点击打开弹窗查看/管理绑定的网店"}
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-extrabold text-indigo-850 text-xs">{cust.shops?.length || 0} {lang === "en" ? "Stores" : "个"}</span>
                        <span className="text-[10px] text-indigo-500 bg-white/80 border border-indigo-50 px-1.5 py-0.5 rounded font-black">{getTranslation("cust_btn_view", lang)}</span>
                      </button>
                    </td>

                    {/* Billing template */}
                    <td className="px-5 py-4 text-slate-500">
                      <span className="text-[11px] font-bold text-slate-705 border-l-2 border-brand-600 pl-1.5">
                        {cust.billingTemplate === "WMS标准月结模版" 
                          ? (lang === "en" ? "WMS Standard Monthly Billing" : "WMS标准月结模版") 
                          : cust.billingTemplate === "日结极速入库计费" 
                          ? (lang === "en" ? "Daily Billing Rapid Entry" : "日结极速入库计费") 
                          : cust.billingTemplate === "外贸一件代发专属模版" 
                          ? (lang === "en" ? "Dropshipping Exclusive Template" : "外贸一件代发专属模版") 
                          : cust.billingTemplate}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleCustomerStatus(cust.id, cust.status)}
                        className="cursor-pointer outline-none active:scale-95 transition"
                        title={cust.status === "enabled" 
                          ? (lang === "en" ? "Click to disable customer" : "点击禁用该客户") 
                          : (lang === "en" ? "Click to enable customer" : "点击启动该客户")}
                      >
                        {cust.status === "enabled" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-550 text-emerald-600 border border-emerald-100">
                            ● {getTranslation("cust_status_running", lang)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-500 border border-rose-100">
                            ● {getTranslation("cust_status_stopped", lang)}
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Control buttons */}
                    <td className="px-5 py-4 text-center font-bold">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setViewingCustomer(cust)}
                          className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-600 hover:text-teal-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-teal-100 cursor-pointer"
                          title={lang === "en" ? "View customer profile & transaction ledger" : "查看客户详细档案、授权网店及资金明细"}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{getTranslation("cust_btn_view", lang)}</span>
                        </button>
                        {cust.status === "enabled" ? (
                          <button
                            onClick={() => toggleCustomerStatus(cust.id, cust.status)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-amber-100 cursor-pointer"
                            title={lang === "en" ? "Suspend this customer" : "快速停用该客户"}
                          >
                            <ToggleLeft className="w-3.5 h-3.5" />
                            <span>{getTranslation("cust_btn_disable", lang)}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleCustomerStatus(cust.id, cust.status)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-emerald-100 cursor-pointer"
                            title={lang === "en" ? "Enable this customer" : "快速启用该客户"}
                          >
                            <ToggleRight className="w-3.5 h-3.5" />
                            <span>{getTranslation("cust_btn_enable", lang)}</span>
                          </button>
                        )}
                        <button
                          onClick={() => openLedgerModal(cust)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-blue-100 cursor-pointer"
                          title={lang === "en" ? "Register top-up/spending" : "查看/登记充值与扣费记录"}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{getTranslation("cust_btn_recharge", lang)}</span>
                        </button>
                        <button
                          onClick={() => openEditModal(cust)}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-slate-200 cursor-pointer"
                          title={lang === "en" ? "Edit customer details" : "编辑修改客户档案及额度"}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>{getTranslation("cust_btn_edit", lang)}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-rose-100 cursor-pointer"
                          title={lang === "en" ? "Delete customer profile" : "移除客户档案"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{getTranslation("cust_btn_delete", lang)}</span>
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
                <h3 className="font-bold text-base tracking-wide">
                  {editingCustomer 
                    ? getTranslation("cust_modal_edit_title", lang) 
                    : getTranslation("cust_modal_add_title", lang)}
                </h3>
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
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                    {getTranslation("cust_modal_id", lang)} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={idInput}
                    disabled={true}
                    placeholder={lang === "en" ? "Auto-generated" : "系统自动生成"}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm font-semibold bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {lang === "en" ? "System-generated unique ID, non-editable" : "系统默认生成的全局唯一ID，不可进行手动编辑"}
                  </p>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                    {getTranslation("cust_modal_name", lang)} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={lang === "en" ? "e.g., Shanghai Cross-Border Trading Co., Ltd." : "如: 上海跨境国际商贸有限公司"}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Contact Input */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                    {getTranslation("cust_modal_contact", lang)} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    placeholder={lang === "en" ? "e.g., Manager Zhang +8613800000000" : "如: 张经理 13800000000"}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-semibold"
                  />
                </div>

                {/* Currency selection */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                    {getTranslation("cust_modal_currency", lang)}
                  </label>
                  <select
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold bg-white"
                  >
                    <option value="CNY">{lang === "en" ? "CNY - Renminbi Yuan" : "CNY - 人民币元"}</option>
                    <option value="USD">{lang === "en" ? "USD - US Dollar" : "USD - 美元金"}</option>
                    <option value="THB">{lang === "en" ? "THB - Thai Baht" : "THB - 泰铢币"}</option>
                    <option value="MMK">{lang === "en" ? "MMK - Myanmar Kyat" : "MMK - 缅甸元"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Available Limit */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                    {getTranslation("cust_modal_balance", lang)} (RMB)
                  </label>
                  <input
                    type="number"
                    value={availableLimitInput}
                    onChange={(e) => setAvailableLimitInput(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold"
                  />
                </div>

                {/* Credit Limit */}
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                    {getTranslation("cust_modal_credit", lang)} (RMB)
                  </label>
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
                <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                  {getTranslation("cust_modal_template", lang)}
                </label>
                <select
                  value={billingTemplateInput}
                  onChange={(e) => setBillingTemplateInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold bg-white"
                >
                  <option value="WMS标准月结模版">
                    {lang === "en" ? "WMS Standard Monthly Billing (For high volume customers)" : "WMS标准月结模版（适用于大体量客户）"}
                  </option>
                  <option value="日结极速入库计费">
                    {lang === "en" ? "Daily Billing Rapid Entry (Pay-per-ticket)" : "日结极速入库计费（一票一清一结）"}
                  </option>
                  <option value="外贸一件代发专属模版">
                    {lang === "en" ? "Dropshipping Exclusive Template (TikTok Special Route)" : "外贸一件代发专属模版（TK专线补贴通道）"}
                  </option>
                </select>
              </div>

              {/* Optional Bank & Billing Info */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-450 uppercase tracking-wider mb-4 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  {lang === "en" ? "Additional Bank & Address Information (Optional)" : "附加财务及账项信息 (选填)"}
                </h4>

                <div className="space-y-4">
                  {/* Address Input */}
                  <div>
                    <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                      {getTranslation("cust_modal_address", lang)}
                    </label>
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      placeholder={lang === "en" ? "e.g., No. 88 Venture Road, Pudong New Area, Shanghai" : "如: 上海市浦东新区创业路88号"}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Tax ID Input */}
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                        {getTranslation("cust_modal_tax_no", lang)}
                      </label>
                      <input
                        type="text"
                        value={taxNoInput}
                        onChange={(e) => setTaxNoInput(e.target.value)}
                        placeholder={lang === "en" ? "e.g., 91310115MA1HXXXXXX" : "如: 91310115MA1HXXXXXX"}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-mono font-semibold"
                      />
                    </div>

                    {/* Bank Name Input */}
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                        {getTranslation("cust_modal_bank_name", lang)}
                      </label>
                      <input
                        type="text"
                        value={bankNameInput}
                        onChange={(e) => setBankNameInput(e.target.value)}
                        placeholder={lang === "en" ? "e.g., Industrial and Commercial Bank of China" : "如: 中国工商银行上海市分行"}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Bank Account Input */}
                  <div>
                    <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">
                      {getTranslation("cust_modal_bank_account", lang)}
                    </label>
                    <input
                      type="text"
                      value={bankAccountInput}
                      onChange={(e) => setBankAccountInput(e.target.value)}
                      placeholder={lang === "en" ? "e.g., 622202100100XXXXXXX" : "如: 622202100100XXXXXXX"}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition text-sm cursor-pointer"
                >
                  {getTranslation("cust_btn_cancel", lang)}
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl transition text-sm cursor-pointer"
                >
                  {getTranslation("cust_btn_save", lang)}
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
                  <h3 className="font-bold text-base tracking-wide">{getTranslation("cust_modal_bind_title", lang)}</h3>
                  <p className="text-xs text-brand-200">{getTranslation("cust_th_name", lang)}: {activeCustomer.name}</p>
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
              
              {/* Form to Bind New store or Loading progress */}
              {isAuthorizing ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center space-y-5 animate-in fade-in duration-300">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    {/* Animated spin outer */}
                    <div className="absolute inset-0 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin"></div>
                    {/* Platform logo badge inside */}
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">
                      {newStorePlatform}
                    </span>
                  </div>
                  
                  <div className="text-center space-y-2.5 max-w-md">
                    <h4 className="text-sm font-bold text-slate-800">
                      {lang === "en" 
                        ? `Requesting ${newStorePlatform} open API authorization gateway...`
                        : `正在请求 ${newStorePlatform} 开放授权接口...`}
                    </h4>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-3xs border border-slate-100">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                        </span>
                        <p className="text-xs font-semibold text-slate-600">
                          {authStatusText}
                        </p>
                      </div>
                      
                      {/* Step bullet indicators */}
                      <div className="flex gap-2 pt-2">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${authStep >= 1 ? "bg-brand-500" : "bg-slate-200"}`} />
                          <span className="text-[9px] font-bold text-slate-400">{lang === "en" ? "Setup Channel" : "建立通道"}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${authStep >= 2 ? "bg-brand-500" : "bg-slate-200"}`} />
                          <span className="text-[9px] font-bold text-slate-400">{lang === "en" ? "OAuth Handshake" : "OAuth握手"}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${authStep >= 3 ? "bg-brand-500" : "bg-slate-200"}`} />
                          <span className="text-[9px] font-bold text-slate-400">{lang === "en" ? "Fetch Store" : "拉取店铺"}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${authStep >= 4 ? "bg-brand-500" : "bg-slate-200"}`} />
                          <span className="text-[9px] font-bold text-slate-400">{lang === "en" ? "Verify Mount" : "挂载核验"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddStore} className="bg-slate-50 border border-slate-150/60 rounded-xl p-5 space-y-4">
                  <span className="block font-extrabold text-xs text-slate-500 uppercase tracking-widest mb-1">
                    💡 {getTranslation("cust_modal_new_channel", lang)}
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 text-xs">{lang === "en" ? "Platform" : "电商平台"}</label>
                      <select
                        value={newStorePlatform}
                        onChange={(e) => setNewStorePlatform(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-semibold bg-white"
                      >
                        <option value="Shopee">Shopee Mall</option>
                        <option value="TikTok">TikTok Shop</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 text-xs">{lang === "en" ? "Custom Store Name" : "网店自定义描述名称"}</label>
                      <input
                        type="text"
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        placeholder={lang === "en" 
                          ? (newStorePlatform === "Shopee" ? "e.g., Shopee Southeast Asia Shop" : "e.g., TikTok K-Beauty Store") 
                          : (newStorePlatform === "Shopee" ? "例如：虾皮东南亚特产屋" : "例如：TikTok韩国美妆海外一号店")}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 text-xs">{lang === "en" ? "Store Unique Shop ID" : "电商平台店铺独有ID (Shop ID)"}</label>
                      <input
                        type="text"
                        value={newStoreId}
                        onChange={(e) => setNewStoreId(e.target.value)}
                        placeholder={lang === "en" 
                          ? (newStorePlatform === "Shopee" ? "e.g., sp-748301" : "e.g., tk-shop-849503") 
                          : (newStorePlatform === "Shopee" ? "例: sp-748301" : "例: tk-shop-849503")}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-semibold font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-sm transition cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{getTranslation("cust_modal_start_auth", lang)}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* List of Bound stores */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-extrabold text-slate-550 uppercase tracking-widest">
                    {lang === "en" ? "Currently Bound Authorized Stores" : "当前已绑定授权店铺数"} ({activeCustomer.shops?.length || 0} {lang === "en" ? "" : "个"})
                  </span>
                  <span className="text-xs text-slate-400">
                    {lang === "en" 
                      ? "Enabled channels automatically fetch and sync shop retail orders" 
                      : "已启用授权的可自动拉取并核销该店铺的零售订单"}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-3xs max-h-[300px] overflow-y-auto">
                  {(activeCustomer.shops || []).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-medium bg-slate-50/20">
                      {lang === "en" 
                        ? "No stores bound yet. Unable to run API order synchronization." 
                        : "暂无关联绑定的销售店，无法运行API自动化拉单。"}
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
                              ID: {shop.shopId} • {lang === "en" ? "Auth Date" : "授权日期"}: {shop.authorizedAt}
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
                            {shop.status === "enabled" 
                              ? (lang === "en" ? "● Active" : "● 已开启") 
                              : (lang === "en" ? "○ Suspended" : "○ 已暂挂")}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveStore(shop.id, shop.shopName)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title={lang === "en" ? "Unbind this store" : "解除此店铺绑定"}
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
                {getTranslation("cust_btn_save_close", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Cancel Shop Authorization Double-Confirmation Pop-up */}
      {shopToUnbind && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header / Icon Accent */}
            <div className="bg-rose-50 p-4 flex items-center gap-3 border-b border-rose-100">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{lang === "en" ? "Unbind Store Authorization" : "取消店铺授权绑定"}</h3>
                <p className="text-[11px] text-slate-500">{lang === "en" ? "Security Verification Dual-Check" : "安全核验双重确认"}</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === "en" 
                  ? `Are you sure you want to unbind and de-authorize store [${shopToUnbind.shopName}]?` 
                  : `您确定要解除对店铺 [${shopToUnbind.shopName}] 的绑定授权吗？`}
              </p>
              <div className="bg-amber-50 border border-amber-200/60 rounded-lg p-3 text-[11px] text-amber-700 leading-relaxed">
                ⚠️ <strong className="font-bold">{lang === "en" ? "Warning:" : "警告提示："}</strong> {lang === "en" 
                  ? "After unbinding, the system will not be able to automatically fetch and settle shop orders via API, which might cause reconciliation data discrepancies." 
                  : "解除绑定后，系统将无法通过 API 自动拉取和核销该店铺对应的订单及消耗明细，可能会导致对账数据发生缺失。"}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-50 px-5 py-3.5 flex justify-end gap-2 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setShopToUnbind(null)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                {getTranslation("cust_btn_cancel", lang)}
              </button>
              <button
                type="button"
                onClick={confirmRemoveStore}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
              >
                {lang === "en" ? "Confirm Unbind" : "确认取消授权"}
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
                <DollarSign className="w-5 h-5 text-brand-100" />
                <div>
                  <h3 className="font-extrabold text-base tracking-normal">{getTranslation("cust_btn_recharge", lang)} / {lang === "en" ? "Ledger" : "记账"}</h3>
                  <p className="text-xs text-brand-100/90 font-medium">
                    {lang === "en" ? "Customer" : "客户"}: {ledgerCustomer.name} ({ledgerCustomer.id}) | {lang === "en" ? "Currency" : "结算货币"}: {ledgerCustomer.currency}
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
              <div className="lg:col-span-4 bg-slate-50 p-5 border-r border-slate-200 overflow-y-auto space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  {lang === "en" ? "Register Ledger Entry" : "登记收支账目"}
                </h4>
                
                <form onSubmit={handleAddLedgerEntry} className="space-y-4">
                  {/* Ledger transaction type selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{lang === "en" ? "Transaction Type" : "账目类型"}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTxType("recharge")}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition cursor-pointer select-none ${
                          txType === "recharge"
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm font-extrabold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-850"
                        }`}
                      >
                        {lang === "en" ? "Deposit (+)" : "账户充值 (+)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxType("consumption")}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition cursor-pointer select-none ${
                          txType === "consumption"
                            ? "bg-amber-500 border-amber-500 text-white shadow-sm font-extrabold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-850"
                        }`}
                      >
                        {lang === "en" ? "Fee Deduct (-)" : "费用扣减 (-)"}
                      </button>
                    </div>
                  </div>

                  {/* Transaction Amount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{lang === "en" ? "Amount" : "变动金额"} ({ledgerCustomer.currency})</label>
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
                  </div>

                  {/* Usage / Voucher Note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{lang === "en" ? "Purpose / Notes" : "事由备注"} <span className="text-rose-500">*</span></label>
                    <textarea
                      required
                      value={txNote}
                      onChange={(e) => setTxNote(e.target.value)}
                      placeholder={lang === "en" ? "e.g., Initial Deposit, Shipment Cost Deduction, etc." : "请输入账目描述，如首期充值、运费支出扣款等"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs text-slate-700 font-medium h-16 resize-none placeholder:text-slate-400"
                    />
                  </div>

                  {/* Operator */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{lang === "en" ? "Operator" : "经办人"}</label>
                    <input
                      type="text"
                      value={txOperator}
                      onChange={(e) => setTxOperator(e.target.value)}
                      placeholder={lang === "en" ? "Name (e.g. Accountant)" : "姓名（如财务）"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-xs text-slate-700 font-bold bg-white"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl transition text-xs cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Record Transaction" : "确认记账"}</span>
                  </button>
                </form>
              </div>

              {/* Right Side: Ledger Statistics list (8cols) */}
              <div className="lg:col-span-8 p-6 overflow-hidden flex flex-col space-y-4">
                
                {/* Statistics Cards Row */}
                <div className="grid grid-cols-3 gap-3.5 select-none">
                  {/* Available Limit */}
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl shadow-3xs">
                    <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest">{lang === "en" ? "Available Balance" : "当前可用余额"}</span>
                    <div className="text-[17px] font-black text-blue-800 font-mono mt-0.5 whitespace-nowrap">
                      {ledgerCustomer.currency === "USD" ? "$" : "¥"}
                      {ledgerCustomer.availableLimit.toLocaleString()}
                    </div>
                  </div>

                  {/* Total Topup */}
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl shadow-3xs">
                    <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{lang === "en" ? "Total Deposits" : "累计充值"}</span>
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
                    <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-widest">{lang === "en" ? "Total Spending" : "累计支出"}</span>
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
                  <span className="text-xs font-bold text-slate-500 block">
                    {lang === "en" ? "Account Ledger Statements" : "资金往来对账流水"}
                  </span>
                </div>

                {/* Ledger entries list */}
                <div className="flex-1 overflow-y-auto border border-slate-200/85 rounded-xl bg-white shadow-3xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[10.5px] uppercase select-none">
                        <th className="px-3 py-2.5">{lang === "en" ? "Date & Time" : "流水交易时间"}</th>
                        <th className="px-3 py-2.5 text-center">{lang === "en" ? "Type" : "流水账款类型"}</th>
                        <th className="px-3 py-2.5 text-right">{lang === "en" ? "Amount" : "交易变动额"}</th>
                        <th className="px-3 py-2.5 text-right">{lang === "en" ? "Balance After" : "交易后余额"}</th>
                        <th className="px-3 py-2.5">{lang === "en" ? "Description & Voucher" : "明细备注/转手凭证说明"}</th>
                        <th className="px-3 py-2.5">{lang === "en" ? "Operator" : "核算人"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                      {(!ledgerCustomer.creditLogs || ledgerCustomer.creditLogs.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="text-center py-20 text-slate-400 font-medium">
                            {lang === "en" ? "No ledger transactions found." : "暂无流水记账记录。"}
                          </td>
                        </tr>
                      ) : (
                        ledgerCustomer.creditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-3 py-3 font-mono text-slate-450 whitespace-nowrap text-[11px]">{log.createdAt}</td>
                            <td className="px-3 py-3 text-center">
                              {log.type === "recharge" ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-550 text-emerald-600 border border-emerald-100 font-bold text-[9px]">
                                  {lang === "en" ? "Deposit" : "充值入账"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 font-bold text-[9px]">
                                  {lang === "en" ? "Deduction" : "业务消耗"}
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
                            <td className="px-3 py-3 text-slate-400 text-[11px]">{log.operator}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-150 px-6 py-3.5 flex justify-end items-center select-none">
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 font-extrabold text-white rounded-xl transition cursor-pointer shadow-3xs shrink-0 text-xs"
              >
                {getTranslation("cust_btn_close", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details View Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-brand-100" />
                <div>
                  <h3 className="font-bold text-base tracking-wide">{lang === "en" ? "Customer Profile & Statements" : "客户详细档案与对账明细"}</h3>
                  <p className="text-xs text-brand-200">{lang === "en" ? "Partner Name" : "客商名称"}: {viewingCustomer.name} (ID: {viewingCustomer.id})</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setViewingCustomer(null)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Basic Profile & Financial overview */}
                <div className="space-y-6 lg:col-span-1">
                  
                  {/* Profile Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-3xs space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                      {lang === "en" ? "Basic Information" : "基本登记信息"}
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Customer Name" : "客户名称"}</span>
                        <span className="text-sm font-black text-slate-800">{viewingCustomer.name}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Customer ID" : "客户ID"}</span>
                          <span className="text-xs font-mono font-bold text-slate-600">{viewingCustomer.id}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Contact Person" : "对接联系人"}</span>
                          <span className="text-xs font-bold text-slate-700">{viewingCustomer.contact || "—"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Currency" : "结算币种"}</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600 border border-blue-100 font-extrabold mt-0.5">
                            {viewingCustomer.currency}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Status" : "当前状态"}</span>
                          {viewingCustomer.status === "enabled" ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] bg-brand-50 text-brand-600 border border-brand-100 font-bold mt-0.5">
                              ● {lang === "en" ? "Active" : "正常合作"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-500 border border-rose-100 font-bold mt-0.5">
                              ● {lang === "en" ? "Suspended" : "挂起停用"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Billing Template" : "默认扣费计算模版"}</span>
                        <span className="text-xs font-bold text-slate-700 border-l-2 border-brand-500 pl-1.5 block mt-1">
                          {viewingCustomer.billingTemplate === "WMS标准月结模版" 
                            ? (lang === "en" ? "WMS Standard Monthly Billing" : "WMS标准月结模版") 
                            : viewingCustomer.billingTemplate === "日结极速入库计费" 
                            ? (lang === "en" ? "Daily Billing Rapid Entry" : "日结极速入库计费") 
                            : viewingCustomer.billingTemplate === "外贸一件代发专属模版" 
                            ? (lang === "en" ? "Dropshipping Exclusive Template" : "外贸一件代发专属模版") 
                            : viewingCustomer.billingTemplate}
                        </span>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 space-y-3">
                        <div>
                          <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Customer Address" : "客户地址"}</span>
                          <span className="text-xs font-semibold text-slate-700 block mt-0.5 whitespace-pre-wrap">{viewingCustomer.address || "—"}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Tax ID" : "税号 ID"}</span>
                            <span className="text-xs font-mono font-semibold text-slate-600 block mt-0.5">{viewingCustomer.taxNo || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Opening Bank" : "开户银行机构"}</span>
                            <span className="text-xs font-semibold text-slate-700 block mt-0.5">{viewingCustomer.bankName || "—"}</span>
                          </div>
                        </div>

                        <div>
                          <span className="block text-[11px] font-bold text-slate-400">{lang === "en" ? "Bank Account Number" : "银行账户"}</span>
                          <span className="text-xs font-mono font-semibold text-slate-700 block mt-0.5">{viewingCustomer.bankAccount || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Limits Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-3xs space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                      {lang === "en" ? "Financial & Credit Limits" : "账户资金与信用授信"}
                    </h4>

                    <div className="grid grid-cols-1 gap-3">
                      {/* Available Limit */}
                      <div className="p-3 bg-brand-50/40 border border-brand-100 rounded-xl">
                        <span className="text-[10px] font-bold text-brand-600 block">{lang === "en" ? "Account Balance" : "账户余额"}</span>
                        <div className="text-xl font-black text-brand-600 font-mono mt-0.5">
                          {viewingCustomer.currency === "USD" ? "$" : "¥"}
                          {(viewingCustomer.availableLimit || 0).toLocaleString()}
                        </div>
                      </div>

                      {/* Credit Limit */}
                      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 block">{lang === "en" ? "Credit Limit" : "系统信用额"}</span>
                        <div className="text-xl font-black text-slate-700 font-mono mt-0.5">
                          {viewingCustomer.currency === "USD" ? "$" : "¥"}
                          {(viewingCustomer.creditLimit || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Bound Shops & Credit History logs */}
                <div className="space-y-6 lg:col-span-2 flex flex-col h-full">
                  
                  {/* Authorized Shops List */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-3xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                        {lang === "en" ? "Authorized Stores" : "授权绑定网店"} ({(viewingCustomer.shops || []).length} {lang === "en" ? "" : "个"})
                      </h4>
                    </div>

                    {(!viewingCustomer.shops || viewingCustomer.shops.length === 0) ? (
                      <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        {lang === "en" ? "No authorized TikTok or Shopee stores found for this customer." : "该客户目前尚未绑定授权任何 TikTok / Shopee 电商网店。"}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[10.5px]">
                              <th className="px-3 py-2">{lang === "en" ? "Platform" : "平台渠道"}</th>
                              <th className="px-3 py-2">{lang === "en" ? "Store Name" : "店铺名称"}</th>
                              <th className="px-3 py-2">{lang === "en" ? "Shop ID" : "平台店铺ID"}</th>
                              <th className="px-3 py-2">{lang === "en" ? "Authorized Date" : "授权日期"}</th>
                              <th className="px-3 py-2 text-center">{lang === "en" ? "Status" : "绑定状态"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {viewingCustomer.shops.map((shop) => (
                              <tr key={shop.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-3 py-2.5">
                                  {shop.platform === "TikTok" ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-white font-extrabold">
                                      TikTok
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-orange-500 text-white font-extrabold">
                                      Shopee
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 font-bold text-slate-800">{shop.shopName}</td>
                                <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">{shop.shopId}</td>
                                <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{shop.authorizedAt || "—"}</td>
                                <td className="px-3 py-2.5 text-center">
                                  {shop.status === "enabled" ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-100 text-[9px] font-bold">
                                      {lang === "en" ? "Active" : "已激活"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-bold">
                                      {lang === "en" ? "Suspended" : "已停用"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Ledger Logs List */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-3xs flex-1 flex flex-col min-h-[300px]">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        {lang === "en" ? "Recent Top-up & Ledger Transactions" : "近期账户充值与账款往来流水"}
                      </h4>
                    </div>

                    <div className="overflow-x-auto flex-1 max-h-[300px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[10.5px] uppercase select-none sticky top-0">
                            <th className="px-3 py-2.5">{lang === "en" ? "Date & Time" : "交易时间"}</th>
                            <th className="px-3 py-2.5 text-center">{lang === "en" ? "Type" : "流水账款类型"}</th>
                            <th className="px-3 py-2.5 text-right">{lang === "en" ? "Amount" : "交易变动额"}</th>
                            <th className="px-3 py-2.5 text-right">{lang === "en" ? "Balance After" : "交易后余额"}</th>
                            <th className="px-3 py-2.5">{lang === "en" ? "Description & Notes" : "凭证说明/款项备注"}</th>
                            <th className="px-3 py-2.5">{lang === "en" ? "Operator" : "核算经办人"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                          {(!viewingCustomer.creditLogs || viewingCustomer.creditLogs.length === 0) ? (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                                {lang === "en" ? "No recent ledger transactions found." : "暂无任何资金往来或充值记账流水。"}
                              </td>
                            </tr>
                          ) : (
                            viewingCustomer.creditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-3 py-2.5 font-mono text-slate-450 whitespace-nowrap text-[11px]">{log.createdAt}</td>
                                <td className="px-3 py-2.5 text-center">
                                  {log.type === "recharge" ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-100 font-bold text-[9px]">
                                      {lang === "en" ? "Deposit" : "充值入账"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 font-bold text-[9px]">
                                      {lang === "en" ? "Deduction" : "业务消耗"}
                                    </span>
                                  )}
                                </td>
                                <td className={`px-3 py-2.5 text-right font-black font-mono text-sm whitespace-nowrap ${
                                    log.type === "recharge" ? "text-brand-600" : "text-amber-600"
                                  }`}>
                                  {log.type === "recharge" ? "+" : "-"}
                                  {log.amount.toLocaleString()}
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold font-mono text-slate-700 whitespace-nowrap">
                                  ¥{(log.balanceAfter || 0).toLocaleString()}
                                </td>
                                <td className="px-3 py-2.5 text-slate-500 break-all max-w-[200px] text-[11px] leading-relaxed">
                                  {log.note}
                                </td>
                                <td className="px-3 py-2.5 text-slate-400 text-[11px]">{log.operator}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-150 px-6 py-3.5 flex justify-end items-center select-none">
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 font-extrabold text-white rounded-xl transition cursor-pointer shadow-3xs shrink-0 text-xs"
              >
                {getTranslation("cust_btn_close_details", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

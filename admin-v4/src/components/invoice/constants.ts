import { Language, Invoice, CustomerPreset } from "./types";

export const INVOICE_TYPE_TRANSLATIONS = {
  vat: {
    "zh-CN": "增值税专用发票",
    "zh-TW": "增值稅專用發票",
    "en": "Special VAT Invoice",
    "th": "ใบกำกับภาษีเต็มรูปแบบ (VAT)"
  },
  ordinary: {
    "zh-CN": "普通发票",
    "zh-TW": "普通發票",
    "en": "Ordinary Invoice",
    "th": "ใบเสร็จรับเงิน / ใบแจ้งหนี้ทั่วไป"
  },
  proforma: {
    "zh-CN": "形式发票",
    "zh-TW": "形式發票",
    "en": "Proforma Invoice",
    "th": "ใบแจ้งหนี้ชั่วคราว (Proforma)"
  }
};

export const getCleanInvoiceType = (type: string): "vat" | "ordinary" | "proforma" => {
  const clean = type ? type.toLowerCase() : "";
  if (clean.includes("vat") || clean.includes("专用") || clean.includes("special")) return "vat";
  if (clean.includes("proforma") || clean.includes("形式")) return "proforma";
  return "ordinary";
};

export const getInvoiceTypeLabel = (type: string, lang: Language) => {
  const cleanType = getCleanInvoiceType(type);
  return INVOICE_TYPE_TRANSLATIONS[cleanType][lang] || INVOICE_TYPE_TRANSLATIONS[cleanType]["zh-CN"];
};

export const getInvoiceTypeColor = (type: string) => {
  const t = getCleanInvoiceType(type);
  if (t === "vat") return "bg-red-50 text-red-700 border-red-200";
  if (t === "proforma") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
};

export const INVOICE_TRANSLATIONS: Record<string, Record<Language, string>> = {
  // Page headers & buttons
  "invoice_mgmt": { "zh-CN": "发票账单管理", "zh-TW": "發票賬單管理", "en": "Invoice Management", "th": "การจัดการใบแจ้งหนี้" },
  "new_invoice": { "zh-CN": "新开发票账单", "zh-TW": "新開發票賬單", "en": "Create New Invoice", "th": "สร้างใบแจ้งหนี้ใหม่" },
  "search_placeholder": { "zh-CN": "搜索发票号、客户公司名称...", "zh-TW": "搜索發票號、客戶公司名稱...", "en": "Search invoice No., customer...", "th": "ค้นหาเลขที่ใบเสร็จ, ลูกค้า..." },
  "type_all": { "zh-CN": "发票类型：全部", "zh-TW": "發票類型：全部", "en": "Invoice Type: All", "th": "ประเภทใบแจ้งหนี้: ทั้งหมด" },
  "filter_month": { "zh-CN": "按开票月份筛选", "zh-TW": "按開票月份篩選", "en": "Filter by month", "th": "กรองตามเดือน" },
  
  // Table columns
  "col_invoice_no": { "zh-CN": "发票号 / 编号", "zh-TW": "發票號 / 編編", "en": "Invoice No. / ID", "th": "เลขที่ / รหัสใบเสร็จ" },
  "col_seller": { "zh-CN": "开票主体 / 销售方", "zh-TW": "開票主體 / 銷售方", "en": "Seller Company", "th": "ผู้ให้บริการ / ผู้ขาย" },
  "col_buyer": { "zh-CN": "合作客户 / 购买方", "zh-TW": "合作客戶 / 購買方", "en": "Partner Customer / Buyer", "th": "ลูกค้าคู่ค้า / ผู้ซื้อ" },
  "col_type": { "zh-CN": "发票类型", "zh-TW": "發票類型", "en": "Invoice Type", "th": "ประเภทใบเสร็จ" },
  "col_dates": { "zh-CN": "开票及截止日期", "zh-TW": "開票及截止日期", "en": "Issue & Due Date", "th": "วันที่ออกและครบกำหนด" },
  "col_amount": { "zh-CN": "开票结算金额", "zh-TW": "開票結算金額", "en": "Settlement Amount", "th": "ยอดชำระเงิน" },
  "col_actions": { "zh-CN": "操作", "zh-TW": "操作", "en": "Actions", "th": "ดำเนินการ" },
  "no_records": { "zh-CN": "未检索到匹配的开票账单记录", "zh-TW": "未檢索到匹配的開票賬單記錄", "en": "No matching invoice records found", "th": "ไม่พบประวัติการเรียกเก็บเงิน" },
  
  // Action tooltips
  "tooltip_view": { "zh-CN": "查看发票详情与打印", "zh-TW": "查看發票詳情與打印", "en": "View Invoice Details & Print", "th": "ดูรายละเอียดใบเสร็จและพิมพ์" },
  "tooltip_edit": { "zh-CN": "编辑发票与实时预览", "zh-TW": "編輯發票與實時預覽", "en": "Edit Invoice & Live Preview", "th": "แก้ไขใบเสร็จและแสดงผลจริง" },
  "tooltip_delete": { "zh-CN": "删除发票记录", "zh-TW": "刪除發票記錄", "en": "Delete Invoice Record", "th": "ลบข้อมูลใบแจ้งหนี้" },
  
  // Modals & form buttons
  "btn_confirm": { "zh-CN": "确认", "zh-TW": "確認", "en": "Confirm", "th": "ยืนยัน" },
  "btn_cancel": { "zh-CN": "取消", "zh-TW": "取消", "en": "Cancel", "th": "ยกเลิก" },
  "invoice_details_preview": { "zh-CN": "发票账单详情预览", "zh-TW": "發票賬單詳情預覽", "en": "Invoice Bill Details Preview", "th": "ตัวอย่างรายละเอียดใบแจ้งหนี้" },
  "print_pdf": { "zh-CN": "打印 / 导出PDF", "zh-TW": "打印 / 導出PDF", "en": "Print / Export PDF", "th": "พิมพ์ / ส่งออก PDF" },
  
  // Invoice Inner layout Labels
  "address_lbl": { "zh-CN": "地址", "zh-TW": "地址", "en": "Address", "th": "ที่อยู่" },
  "phone_lbl": { "zh-CN": "电话", "zh-TW": "电话", "en": "Phone", "th": "โทรศัพท์" },
  "contact_lbl": { "zh-CN": "联系人", "zh-TW": "聯絡人", "en": "Contact", "th": "ผู้ติดต่อ" },
  "tax_no_lbl": { "zh-CN": "纳税人识别号", "zh-TW": "納稅人識別號", "en": "Tax ID No.", "th": "เลขประจำตัวผู้เสียภาษี" },
  "bank_lbl": { "zh-CN": "开户银行", "zh-TW": "開戶銀行", "en": "Bank Name", "th": "ธนาคาร" },
  "account_lbl": { "zh-CN": "账号", "zh-TW": "帳號", "en": "Account No.", "th": "เลขที่บัญชี" },
  "buyer_lbl": { "zh-CN": "客户", "zh-TW": "客戶 / BUYER", "en": "BUYER", "th": "ลูกค้า / BUYER" },
  "buyer_tax_lbl": { "zh-CN": "纳税人代码", "zh-TW": "納稅人代碼", "en": "Buyer Tax Code", "th": "รหัสผู้เสียภาษีผู้ซื้อ" },
  "buyer_bank_lbl": { "zh-CN": "开户银行", "zh-TW": "開戶銀行", "en": "Buyer Bank", "th": "ธนาคารผู้ซื้อ" },
  "buyer_account_lbl": { "zh-CN": "银行账户", "zh-TW": "銀行帳戶", "en": "Buyer Account", "th": "บัญชีธนาคารผู้ซื้อ" },
  "buyer_address_lbl": { "zh-CN": "客户送达地址", "zh-TW": "開票/送達地址", "en": "Billing / Delivery Address", "th": "ที่อยู่ออกใบเสร็จ/ส่งสินค้า" },
  "buyer_phone_lbl": { "zh-CN": "联系电话", "zh-TW": "聯繫電話", "en": "Contact Phone", "th": "เบอร์ติดต่อ" },
  
  "details_lbl": { "zh-CN": "账单信息", "zh-TW": "賬單信息 / DETAILS", "en": "DETAILS", "th": "ข้อมูลบิล / DETAILS" },
  "doc_no_lbl": { "zh-CN": "发票编号", "zh-TW": "發票編號", "en": "Doc No.", "th": "เลขที่เอกสาร (Doc No.)" },
  "date_lbl": { "zh-CN": "开票日期", "zh-TW": "開票日期", "en": "Date of Issue", "th": "วันที่ออก (Date)" },
  "due_date_lbl": { "zh-CN": "付款截止日", "zh-TW": "付款截止日", "en": "Due Date", "th": "ครบกำหนดชำระ" },
  "currency_lbl": { "zh-CN": "结算币种", "zh-TW": "結算幣種", "en": "Currency", "th": "สกุลเงิน" },
  "unlimited_lbl": { "zh-CN": "无限制", "zh-TW": "無限制", "en": "No Limit", "th": "ไม่มีข้อจำกัด" },
  
  "items_sec_lbl": { "zh-CN": "明细清单", "zh-TW": "明細清單", "en": "ITEMS & SERVICES", "th": "รายการและบริการ / ITEMS & SERVICES" },
  "th_hash": { "zh-CN": "#", "zh-TW": "#", "en": "#", "th": "#" },
  "th_description": { "zh-CN": "项目及服务描述", "zh-TW": "項目及服務描述", "en": "Description", "th": "รายการและบริการ" },
  "th_qty": { "zh-CN": "数量", "zh-TW": "數量", "en": "Qty", "th": "จำนวน" },
  "th_unit": { "zh-CN": "单位", "zh-TW": "單位", "en": "Unit", "th": "หน่วย" },
  "th_price": { "zh-CN": "单价", "zh-TW": "單價", "en": "Unit Price", "th": "ราคา/หน่วย" },
  "th_amount": { "zh-CN": "金额", "zh-TW": "金額", "en": "Amount", "th": "จำนวนเงิน" },
  
  "unit_item": { "zh-CN": "项", "zh-TW": "項", "en": "Item", "th": "รายการ" },
  "unit_piece": { "zh-CN": "件", "zh-TW": "件", "en": "Pcs", "th": "ชิ้น" },
  "no_items_lbl": { "zh-CN": "暂无结算明细项目", "zh-TW": "暫無結算明細項目", "en": "No items loaded yet", "th": "ยังไม่มีรายการชำระเงิน" },
  "subtotal_lbl": { "zh-CN": "小计:", "zh-TW": "小計 (Subtotal):", "en": "Subtotal:", "th": "ยอดรวม (Subtotal):" },
  "tax_lbl": { "zh-CN": "销项税", "zh-TW": "稅金 (Tax ", "en": "Tax (", "th": "ภาษีมูลค่าเพิ่ม (Tax " },
  "grand_total_lbl": { "zh-CN": "总计金额:", "zh-TW": "總計 (TOTAL AMOUNT):", "en": "TOTAL AMOUNT:", "th": "ยอดรวมสุทธิ (TOTAL AMOUNT):" },
  "amount_in_words_lbl": { "zh-CN": "大写金额", "zh-TW": "金額大寫", "en": "Amount in Words", "th": "จำนวนเงินตัวอักษร" },
  
  "terms_sec_lbl": { "zh-CN": "款项说明与付款条款", "zh-TW": "款項說明與付款條款", "en": "Terms & Conditions", "th": "เงื่อนไขและการชำระเงิน" },
  "seller_signature_lbl": { "zh-CN": "开票方授权盖章", "zh-TW": "開票主體授權蓋章 / 簽字", "en": "Authorized Signature & Official Seal", "th": "ลายมือชื่อและตราประทับผู้มีอำนาจ" },
  "authorized_rep": { "zh-CN": "财务授权代表签字", "zh-TW": "財務授權代表簽字", "en": "Authorized Representative", "th": "ผู้มีอำนาจลงนาม" },
  "official_stamp": { "zh-CN": "单位公章", "zh-TW": "公章 / 財務專用章", "en": "Official Company Seal", "th": "ตราประทับบริษัท" },
  
  // Editor form titles
  "edit_invoice_title": { "zh-CN": "修改结算发票账单 (可实时预览)", "zh-TW": "編輯發票賬單 (實時A4預覽模式)", "en": "Edit Invoice (Real-Time A4 Preview)", "th": "แก้ไขใบแจ้งหนี้ (ดูตัวอย่างขนาด A4)" },
  "create_invoice_title": { "zh-CN": "开立新结算发票 (实时高保真 A4 预览)", "zh-TW": "開具結算發票 (實時A4預覽模式)", "en": "Create Settle Invoice (Real-Time A4 Preview)", "th": "ออกใบแจ้งหนี้ใหม่ (ดูตัวอย่างขนาด A4)" },
  "save_and_ledger": { "zh-CN": "保存并登账", "zh-TW": "保存並登帳", "en": "Save & Settle", "th": "บันทึกและลงบัญชี" },
  "form_tab_edit": { "zh-CN": "✍️ 填写开票单据", "zh-TW": "✍️ 填寫開票單據", "en": "✍️ Fill Invoice Form", "th": "✍️ กรอกเอกสารใบเสร็จ" },
  "form_tab_preview": { "zh-CN": "👁️ 实时高保真 A4 预览", "zh-TW": "👁️ 實時高保真 A4 預覽", "en": "👁️ Real-time A4 Preview", "th": "👁️ ตัวอย่างขนาด A4 จริง" },
  "sec_meta": { "zh-CN": "1. 结算发票基本信息", "zh-TW": "1. 結算發票基本信息", "en": "1. Invoice Metadata", "th": "1. ข้อมูลพื้นฐานใบแจ้งหนี้ (Metadata)" },
  "invoice_num_lbl": { "zh-CN": "发票及账单号 *", "zh-TW": "發票及賬單號 *", "en": "Invoice & Bill Number *", "th": "เลขที่ใบแจ้งหนี้ *" },
  "random_btn": { "zh-CN": "随机重构", "zh-TW": "隨機重構", "en": "Regenerate", "th": "สร้างแบบสุ่ม" },
  "invoice_type_lbl": { "zh-CN": "发票种类 *", "zh-TW": "發票種類 *", "en": "Invoice Type *", "th": "ประเภทใบแจ้งหนี้ *" },
  "invoice_type_placeholder": { "zh-CN": "例：增值税专用发票 / 形式发票 / 普通发票", "zh-TW": "例：增值稅專用發票 / 形式發票 / 普通發票", "en": "e.g., Special VAT Invoice / Proforma / Ordinary", "th": "เช่น ใบกำกับภาษีเต็มรูปแบบ / ชั่วคราว / ทั่วไป" },
  "issue_due_dates_lbl": { "zh-CN": "开票及结算日期 *", "zh-TW": "開票及結算日期 *", "en": "Issue Date *", "th": "วันที่ออกและชำระ *" },
  "due_date_lbl_form": { "zh-CN": "付款截止日期 *", "zh-TW": "付款截止日期 *", "en": "Payment Due Date *", "th": "วันครบกำหนดชำระ *" },
  "tax_rate_lbl": { "zh-CN": "销项税率 (%)", "zh-TW": "銷项稅率 (%)", "en": "Output Tax Rate (%)", "th": "อัตราภาษีขาย (%)" },
  "tax_free_proforma": { "zh-CN": "(形式发票免税)", "zh-TW": "(形式發票免稅)", "en": "(Proforma is tax free)", "th": "(ใบแจ้งหนี้ชั่วคราวเว้นภาษี)" },
  "currency_settle_lbl": { "zh-CN": "结算币种", "zh-TW": "結算幣種", "en": "Settlement Currency", "th": "สกุลเงินเรียกเก็บ" },
  "cur_option_cny": { "zh-CN": "人民币 (CNY ￥)", "zh-TW": "人民幣 (CNY ￥)", "en": "CNY (￥)", "th": "หยวนจีน (CNY ￥)" },
  "cur_option_thb": { "zh-CN": "泰铢 (THB ฿)", "zh-TW": "泰銖 (THB ฿)", "en": "THB (฿)", "th": "บาทไทย (THB ฿)" },
  "cur_option_usd": { "zh-CN": "美元 (USD $)", "zh-TW": "美元 (USD $)", "en": "USD ($)", "th": "ดอลลาร์สหรัฐ (USD $)" },
  "cur_option_eur": { "zh-CN": "欧元 (EUR €)", "zh-TW": "歐元 (EUR €)", "en": "EUR (€)", "th": "ยูโร (EUR €)" },
  
  "sec_seller": { "zh-CN": "2. 开票方资料", "zh-TW": "2. 開票方資料", "en": "2. Seller Company Details", "th": "2. ข้อมูลบริษัทผู้ออกบิล (Seller)" },
  "logo_seller_lbl": { "zh-CN": "开票方企业LOGO", "zh-TW": "開票方企業LOGO", "en": "Seller Company Logo", "th": "โลโก้บริษัทผู้ออกบิล (Seller)" },
  "select_file_btn": { "zh-CN": "选择文件上传 (2MB内)", "zh-TW": "選擇文件上傳 (2MB內)", "en": "Choose File (Max 2MB)", "th": "เลือกไฟล์อัปโหลด (ไม่เกิน 2MB)" },
  "seller_name_input": { "zh-CN": "开票企业/名称 *", "zh-TW": "開票企業/名稱 *", "en": "Seller Company Name *", "th": "ชื่อบริษัทผู้ออกบิล *" },
  "seller_tax_input": { "zh-CN": "纳税人信用代码/税号", "zh-TW": "納稅人信用代碼/稅號", "en": "Seller Tax No.", "th": "รหัสผู้เสียภาษีผู้ขาย" },
  "seller_contact_input": { "zh-CN": "联系人", "zh-TW": "聯絡人", "en": "Contact Person", "th": "ผู้ติดต่อ" },
  "seller_phone_input": { "zh-CN": "联系电话/传真", "zh-TW": "聯繫電話/傳真", "en": "Phone / Fax", "th": "เบอร์ติดต่อ/แฟกซ์" },
  "seller_bank_input": { "zh-CN": "开户银行机构", "zh-TW": "開戶銀行機構", "en": "Bank Name", "th": "สถาบันธนาคาร" },
  "seller_account_input": { "zh-CN": "银行收汇账号", "zh-TW": "銀行收匯賬號", "en": "Bank Account Number", "th": "เลขที่บัญชีรับเงิน" },
  "seller_address_input": { "zh-CN": "企业注册地址/开票地址", "zh-TW": "企業註冊地址/開票地址", "en": "Registered / Billing Address", "th": "ที่อยู่จดทะเบียน/ออกใบเสร็จ" },
  
  "sec_buyer": { "zh-CN": "3. 购买方/关联客户资料", "zh-TW": "3. 購買方/關聯客戶資料", "en": "3. Buyer / Partner CRM Info", "th": "3. ข้อมูลผู้ซื้อ / ลูกค้าจากระบบ CRM" },
  "crm_link_lbl": { "zh-CN": "关联客户", "zh-TW": "關聯客戶", "en": "Link to CRM Partner:", "th": "เชื่อมโยงกับลูกค้า CRM:" },
  "crm_custom_opt": { "zh-CN": "请选择客户", "zh-TW": "請選擇客戶", "en": "-- ✍ " + "Manual Custom Input (Do Not Link CRM) --", "th": "-- ✍️ ป้อนด้วยตนเอง (ไม่เชื่อมโยง CRM) --" },
  "crm_link_prefix": { "zh-CN": "🤝 关联：", "zh-TW": "🤝 關聯：", "en": "🤝 Link: ", "th": "🤝 เชื่อมโยง: " },
  "logo_buyer_lbl": { "zh-CN": "购买方LOGO", "zh-TW": "購買方LOGO", "en": "Buyer / Customer Logo", "th": "โลโก้ผู้ซื้อ / ลูกค้า (เลือกได้):" },
  "logo_buyer_tip": { "zh-CN": "推荐比例为长方形，支持PNG/JPG", "zh-TW": "推薦比例為長方形，支持PNG/JPG", "en": "Rectangle ratio recommended, PNG/JPG supported", "th": "แนะนำสัดส่วนสี่เหลี่ยมผืนผ้า, รองรับ PNG/JPG" },
  "buyer_name_input": { "zh-CN": "客户公司名称 *", "zh-TW": "客戶公司名稱 *", "en": "Buyer Company Name *", "th": "ชื่อบริษัทลูกค้า / ผู้ซื้อ *" },
  "buyer_tax_input": { "zh-CN": "客户税号", "zh-TW": "客戶稅號", "en": "Buyer Tax No.", "th": "รหัสผู้เสียภาษีลูกค้า" },
  "buyer_contact_input": { "zh-CN": "客户联系人", "zh-TW": "客戶聯絡人", "en": "Buyer Contact Person", "th": "ผู้ติดต่อลูกค้า" },
  "buyer_phone_input": { "zh-CN": "客户电话/传真", "zh-TW": "客戶電話/傳真", "en": "Buyer Phone / Fax", "th": "เบอร์ติดต่อ/แฟกซ์ลูกค้า" },
  "buyer_bank_input": { "zh-CN": "客户开户银行机构", "zh-TW": "客戶開戶銀行機構", "en": "Buyer Bank Name", "th": "ธนาคารลูกค้า" },
  "buyer_account_input": { "zh-CN": "客户银行账户", "zh-TW": "客戶銀行賬戶", "en": "Buyer Bank Account", "th": "บัญชีธนาคารลูกค้า" },
  "buyer_address_input": { "zh-CN": "客户送达/开票地址", "zh-TW": "客戶送達/開票地址", "en": "Delivery / Billing Address", "th": "ที่อยู่จัดส่ง/ที่อยู่ออกบิลลูกค้า" },
  
  "sec_items": { "zh-CN": "4. 发票服务明细项目", "zh-TW": "4. 發票服務明細項目", "en": "4. Billing Line Items", "th": "4. รายละเอียดค่าบริการในใบแจ้งหนี้" },
  "item_desc_lbl": { "zh-CN": "结算服务/费用描述 (如：6月WMS拣货贴单打包费) *", "zh-TW": "結算服務/費用描述 (如：6月WMS揀貨貼單打包費) *", "en": "Service/Fee Description *", "th": "คำอธิบายค่าบริการ/ค่าใช้จ่าย *" },
  "item_qty_lbl": { "zh-CN": "结算数量 *", "zh-TW": "結算數量 *", "en": "Quantity *", "th": "จำนวนเรียกเก็บ *" },
  "item_price_lbl": { "zh-CN": "计价单价 *", "zh-TW": "計價單價 *", "en": "Unit Price *", "th": "ราคาต่อหน่วย *" },
  "item_add_btn": { "zh-CN": "➕ 插入该结算项到明细表", "zh-TW": "➕ 插入該結算項到明細表", "en": "➕ Insert Item to List", "th": "➕ เพิ่มรายการนี้ไปยังตาราง" },
  "form_no_items_tip": { "zh-CN": "⚠️ 暂无结算明细项目，请在上方表单中进行添加", "zh-TW": "⚠️ 暫無結算明細項目，請在上方表單中進行添加", "en": "⚠️ No items added yet. Please use form above to insert.", "th": "⚠️ ยังไม่มีรายการเรียกเก็บเงิน โปรดใช้ฟอร์มด้านบนเพิ่มรายการ" },
  
  "sec_notes": { "zh-CN": "5. 发票附言条款", "zh-TW": "5. 發票附言條款", "en": "5. Notes & Terms", "th": "5. ข้อกำหนดเพิ่มเติมในใบแจ้งหนี้ (Notes)" },
  "notes_placeholder": { 
    "zh-CN": "选填。可填写例如：“汇率按开票当日中国人民银行公布的中间价核算，请在收到发票10日内汇至指定收账账号。”", 
    "zh-TW": "選填。可填寫例如：“匯率按開票當日中國人民銀行公布的中間價核算，請在收到發票10日內匯至指定收賬賬號。”", 
    "en": "Optional. E.g. All exchange rates based on PBOC official rate. Please wire transfer within 10 days upon receipt.", 
    "th": "ระบุหรือไม่ก็ได้ เช่น ชำระเงินภายใน 10 วันนับจากวันที่ได้รับใบแจ้งหนี้" 
  },
  
  "sec_auth": { "zh-CN": "6. 签名与印章授权", "zh-TW": "6. 簽名與印章授權", "en": "6. Signature & Seal Authorization", "th": "6. การลงนามและการประทับตรา" },
  "upload_stamp_lbl": { "zh-CN": "开票主体公章图片 (推荐透明背景PNG)", "zh-TW": "開票主體公章圖片 (推薦透明背景PNG)", "en": "Company Official Seal (Transparent PNG)", "th": "รูปตราประทับบริษัท (แนะนำ PNG โปร่งใส)" },
  "upload_sig_lbl": { "zh-CN": "财务授权签字 (图片或画板手签)", "zh-TW": "財務授權簽字 (圖片或畫板手簽)", "en": "Finance Signature (Image or Pad)", "th": "ลายมือชื่อผู้มีอำนาจ (รูปภาพหรือเซ็นสด)" },
  "draw_sig_btn": { "zh-CN": "✍️ 在线手写签名画板", "zh-TW": "✍️ 在線手寫簽名畫板", "en": "✍️ Draw Signature on Pad", "th": "✍️ เซ็นลายมือชื่อสด" },
  "clear_btn": { "zh-CN": "清除", "zh-TW": "清除", "en": "Clear", "th": "ล้าง" },
  "sig_modal_title": { "zh-CN": "电子签名画板 (签字将自动载入发票授权栏)", "zh-TW": "電子簽名畫板 (簽字將自動載入發票授權欄)", "en": "Digital Signature Pad (Auto applied to invoice)", "th": "กระดานเซ็นชื่อดิจิทัล (แทรกลงในใบเสร็จอัตโนมัติ)" },
  "canvas_tip": { "zh-CN": "请在下方框内手写签署：", "zh-TW": "請在下方框內手寫簽署：", "en": "Please sign in the box below:", "th": "กรุณาเซ็นชื่อในช่องด้านล่าง:" },
  "sig_pen_color": { "zh-CN": "笔触颜色：", "zh-TW": "筆觸顏色：", "en": "Ink Color:", "th": "สีหมึก:" },
  "pen_navy": { "zh-CN": "深蓝", "zh-TW": "深藍", "en": "Navy", "th": "น้ำเงินเข้ม" },
  "pen_black": { "zh-CN": "黑色", "zh-TW": "黑色", "en": "Black", "th": "ดำ" },
  "pen_red": { "zh-CN": "印泥红", "zh-TW": "印泥紅", "en": "Red", "th": "แดง" },
  "apply_sig_btn": { "zh-CN": "✅ 确认保存此签名", "zh-TW": "✅ 確認保存此簽名", "en": "✅ Apply Signature", "th": "✅ ยืนยันใช้ลายเซ็นนี้" },
  
  "drag_tip_title": { "zh-CN": "印章与签名位置自由拖拽调整说明：", "zh-TW": "印章與簽名位置自由拖拽調整說明：", "en": "Draggable Seal & Signature Instructions:", "th": "คำแนะนำการปรับตำแหน่งตราประทับและลายเซ็นต์:" },
  "drag_tip_desc": { "zh-CN": "在右侧发票预览底部的签字印章区域，按住印章或签字徽标可以直接拖动到任意合适位置。系统将自动记住并应用该坐标位置用于打印及导出！", "zh-TW": "在右側發票預覽底部的簽字印章區域，按住印章或簽字徽標可以直接拖動到任意合適位置。系統將自動記住並應用該坐標位置用於打印及導出！", "en": "In the preview panel on the right, you can directly drag and drop the official seal or signature to any desired position. The system will memorize the coordinates for PDF printing!", "th": "ที่ส่วนท้ายของตัวอย่างใบเสร็จด้านขวา คุณสามารถคลิกค้างเพื่อลากตราประทับหรือลายเซ็นไปยังตำแหน่งที่ต้องการได้ ระบบจะบันทึกพิกัดเพื่อใช้พิมพ์ต่อไป!" },
  
  // Stats Bar Labels
  "stat_total_invoices": { "zh-CN": "总发票数", "zh-TW": "總發票數", "en": "Total Invoices", "th": "ใบแจ้งหนี้ทั้งหมด" },
  "stat_total_amount": { "zh-CN": "总开票金额", "zh-TW": "總開票金額", "en": "Total Invoiced Amount", "th": "ยอดรวมทั้งหมด" },
  "stat_paid_invoices": { "zh-CN": "已结清发票", "zh-TW": "已結清發票", "en": "Paid Invoices", "th": "ชำระแล้ว" },
  "stat_paid_amount": { "zh-CN": "已收回款金额", "zh-TW": "已收回款金額", "en": "Settled Revenue", "th": "ยอดชำระแล้ว" },
  "stat_pending_invoices": { "zh-CN": "待付款发票", "zh-TW": "待付款發票", "en": "Pending Invoices", "th": "รอชำระ" },
  "stat_pending_amount": { "zh-CN": "在途应收款", "zh-TW": "在途應收款", "en": "Pending Receivables", "th": "ยอดค้างชำระ" },
  "stat_overdue_invoices": { "zh-CN": "逾期账单", "zh-TW": "逾期賬單", "en": "Overdue Invoices", "th": "เกินกำหนดชำระ" },
  "stat_overdue_amount": { "zh-CN": "逾期款项金额", "zh-TW": "逾期款項金額", "en": "Overdue Amount", "th": "ยอดเกินกำหนด" },
  
  // Table Action Buttons
  "btn_view": { "zh-CN": "预览", "zh-TW": "預覽", "en": "View", "th": "ดู" },
  "btn_edit": { "zh-CN": "编辑", "zh-TW": "編輯", "en": "Edit", "th": "แก้ไข" },
  "btn_delete": { "zh-CN": "删除", "zh-TW": "刪除", "en": "Delete", "th": "ลบ" },
  "btn_clear_filter": { "zh-CN": "重置筛选", "zh-TW": "重置篩選", "en": "Reset Filters", "th": "ล้างตัวกรอง" },
  "all_status": { "zh-CN": "全部状态", "zh-TW": "全部狀態", "en": "All Status", "th": "สถานะทั้งหมด" },
  
  // Status Labels in Filter
  "status_draft": { "zh-CN": "草稿", "zh-TW": "草稿", "en": "Draft", "th": "ร่าง" },
  "status_pending": { "zh-CN": "待付款", "zh-TW": "待付款", "en": "Pending Payment", "th": "ค้างชำระ" },
  "status_paid": { "zh-CN": "已结清", "zh-TW": "已結清", "en": "Paid & Settled", "th": "ชำระแล้ว" },
  "status_overdue": { "zh-CN": "已逾期", "zh-TW": "已逾期", "en": "Overdue", "th": "เกินกำหนด" },
  "status_canceled": { "zh-CN": "已作废", "zh-TW": "已作廢", "en": "Canceled", "th": "ยกเลิก" },
  
  // Validation Messages
  "val_invoice_no_req": { "zh-CN": "请填写发票及账单号", "zh-TW": "請填寫發票及賬單號", "en": "Please enter invoice number", "th": "กรุณากรอกเลขที่ใบแจ้งหนี้" },
  "val_seller_name_req": { "zh-CN": "请填写开票企业主体名称", "zh-TW": "請填寫開票企業主體名稱", "en": "Please enter seller company name", "th": "กรุณากรอกชื่อบริษัทผู้ออกบิล" },
  "val_buyer_name_req": { "zh-CN": "请填写或关联购买方客户名称", "zh-TW": "請填寫或關聯購買方客戶名稱", "en": "Please enter or link buyer company name", "th": "กรุณากรอกชื่อลูกค้าคู่ค้า" },
  "val_items_req": { "zh-CN": "请至少添加一项开票服务或货物结算明细", "zh-TW": "請至少添加一項開票服務或貨物結算明細", "en": "Please add at least one line item", "th": "กรุณาเพิ่มรายการสินค้าหรือบริการอย่างน้อย 1 รายการ" },
  "toast_saved": { "zh-CN": "发票已成功保存并登账！", "zh-TW": "發票已成功保存並登帳！", "en": "Invoice saved and settled successfully!", "th": "บันทึกและลงบัญชีใบแจ้งหนี้เรียบร้อยแล้ว!" },
  "toast_deleted": { "zh-CN": "发票已成功删除", "zh-TW": "發票已成功刪除", "en": "Invoice deleted successfully", "th": "ลบใบแจ้งหนี้เรียบร้อยแล้ว" },
  
  // Dialog Texts
  "del_confirm_title": { "zh-CN": "确认删除此发票记录？", "zh-TW": "確認刪除此發票記錄？", "en": "Delete Invoice Record?", "th": "ยืนยันการลบใบแจ้งหนี้นี้?" },
  "del_confirm_desc": { "zh-CN": "此操作无法撤销。该发票的所有明细、已关联款项记录将从系统中永久移除。", "zh-TW": "此操作無法撤銷。該發票的所有明細、已關聯款項記錄將從系統中永久移除。", "en": "This action cannot be undone. All billing details will be permanently removed.", "th": "การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลทั้งหมดจะถูกลบออกจากระบบอย่างถาวร" },
  "btn_confirm_delete": { "zh-CN": "确认删除", "zh-TW": "確認刪除", "en": "Delete", "th": "ยืนยันการลบ" },
  
  // Form placeholders & tooltips
  "search_customer_placeholder": { "zh-CN": "输入关键词搜索客户...", "zh-TW": "輸入關鍵詞搜索客戶...", "en": "Search customer...", "th": "ค้นหาลูกค้า..." },
  "add_item_title": { "zh-CN": "添加结算项目:", "zh-TW": "添加結算項目:", "en": "Add line item:", "th": "เพิ่มรายการเรียกเก็บเงิน:" },
  "item_desc_placeholder": { "zh-CN": "服务/货物内容描述 (例如：海外仓拣货费-6月)", "zh-TW": "服務/貨物內容描述 (例如：海外倉揀貨費-6月)", "en": "Item/service description (e.g. WMS Picking Fee - June)", "th": "คำอธิบายบริการ/สินค้า (เช่น ค่าบรรจุสินค้า WMS - มิ.ย.)" },
  "item_qty_placeholder": { "zh-CN": "结算数量", "zh-TW": "結算數量 (Qty)", "en": "Quantity (Qty)", "th": "จำนวน (Qty)" },
  "item_price_placeholder": { "zh-CN": "单价", "zh-TW": "單價 (Unit Price)", "en": "Unit Price", "th": "ราคา/หน่วย (Unit Price)" },
  "item_add_btn_text": { "zh-CN": "添加此项细项至账单", "zh-TW": "添加此項細項至帳單", "en": "Add item to bill", "th": "เพิ่มรายการลงใบเสร็จ" },
  "added_items_title": { "zh-CN": "已添加的结算细项", "zh-TW": "已添加的結算細項", "en": "Added Line Items", "th": "รายการที่เพิ่มแล้ว" },
  "form_no_items_tip_text": { "zh-CN": "暂无结算明细。请在上方输入服务名称、数量和单价点击添加", "zh-TW": "暫無結算明細。請在上方輸入服務名稱、數量和單價點擊添加", "en": "No items loaded yet. Please input name, quantity, and unit price above.", "th": "ยังไม่มีรายการเรียกเก็บเงิน กรุณาระบุชื่อ จำนวน และราคาเหนือตารางนี้" },
  "buyer_name_placeholder": { "zh-CN": "请输入合作客户全称", "zh-TW": "請輸入合作客戶全稱", "en": "Please enter full customer name", "th": "กรุณากรอกชื่อเต็มลูกค้าคู่ค้า" },
  "print_current": { "zh-CN": "导出PDF", "zh-TW": "導出PDF", "en": "Export PDF", "th": "ส่งออก PDF" },
  "num_items_count": { "zh-CN": "个项目", "zh-TW": "個項目", "en": "items", "th": "รายการ" },
  "invoice_preview_title": { "zh-CN": "发票账单详情预览", "zh-TW": "發票帳單詳情預覽", "en": "Invoice Bill Preview", "th": "ตัวอย่างใบแจ้งหนี้อย่างละเอียด" },
  "btn_print_pdf": { "zh-CN": "导出PDF", "zh-TW": "導出PDF", "en": "Export PDF", "th": "ส่งออก PDF" },
  "click_to_upload": { "zh-CN": "点击自定义上传 Logo", "zh-TW": "點击自定義上傳 Logo", "en": "Click to Upload Custom Logo", "th": "คลิกเพื่ออัปโหลดโลโก้" },
  "upload_logo_short": { "zh-CN": "上传 Logo", "zh-TW": "上傳 Logo", "en": "Upload Logo", "th": "อัปโหลดโลโก้" },
  "copy_text_lbl": { "zh-CN": "联次说明", "zh-TW": "聯次說明", "en": "Copy Designation", "th": "คำอธิบายประเภทเอกสาร" },
  "copy_text_placeholder": { "zh-CN": "输入联次 (例如：第一联 记账联)", "zh-TW": "輸入聯次 (例如：ต้นฉบับ / ORIGINAL)", "en": "e.g. ต้นฉบับ / ORIGINAL", "th": "เช่น ต้นฉบับ / ORIGINAL" },
  "total_lbl": {"zh-CN":"应付总金额:","zh-TW":"應付總金額 (Total Due):","en":"Total Due:","th":"ยอดรวมชำระ (Total Due):"},
  "notes_terms_lbl": {"zh-CN":"说明条款:","zh-TW":"說明條款:","en":"Notes & Terms:","th":"ข้อกำหนดและเงื่อนไข (Notes / Payment Terms):"},
  "default_notes_desc": {"zh-CN":"暂无其他条款说明。如有任何账目结算疑问，请在收到账单之日起3个工作日内向财务管理部提出复核，逾期将视为完全认可本账单。","zh-TW":"暫無其他條款說明。如有任何賬目結算疑問，請在收到賬單之日起3個工作日內向財務管理部提出複核，逾期將視為完全認可本賬單。","en":"No other notes. For billing questions, please appeal within 3 business days, otherwise invoice is deemed approved.","th":"ไม่มีข้อกำหนดอื่นๆ หากมีข้อสงสัยเกี่ยวกับยอดบิล โปรดติดต่อฝ่ายการเงินภายใน 3 วันทำการ มิฉะนั้นจะถือว่ายอมรับยอดนี้"},
  "client_sig_lbl": {"zh-CN":"客户签收","zh-TW":"客戶簽收","en":"CLIENT SIGNATURE","th":"ลูกค้าลงนาม / CLIENT SIGNATURE"},
  "auth_sig_lbl": {"zh-CN":"开票人签名","zh-TW":"開票人簽名","en":"AUTHORIZED SIGNATURE","th":"ลงชื่อผู้ให้บริการ / AUTHORIZED SIGNATURE"},
  "rep_placeholder": {"zh-CN":"客户授权代表人","zh-TW":"客戶授權代表人","en":"Authorized Client Representative","th":"ตัวแทนผู้มีอำนาจของลูกค้า"},
  "date_cn_year": {"zh-CN":"___________ 年 _______ 月 _______ 日","zh-TW":"___________ 年 _______ 月 _______ 日","en":"Date: _______________________","th":"วันที่: _______________________"},
  "date_prefix_lbl": {"zh-CN":"日期: ","zh-TW":"日期: ","en":"Date: ","th":"วันที่: "},
  "back_to_list": {"zh-CN":"返回发票列表","zh-TW":"返回發票列表","en":"Back to List","th":"กลับไปยังรายการ"},
  "workspace_title_edit": {"zh-CN":"修改结算发票账单 (可实时预览)","zh-TW":"修改結算發票賬單 (可實時預覽)","en":"Edit Invoice Settle Bill","th":"แก้ไขใบเรียกเก็บเงิน (ดูตัวอย่างเรียลไทม์)"},
  "workspace_title_create": {"zh-CN":"开立新结算发票 (实时高保真 A4 预览)","zh-TW":"開立新結算發票 (實時高保真 A4 預覽)","en":"Create Settle Invoice (Real-Time A4 Preview)","th":"ออกใบแจ้งหนี้ใหม่ (ดูตัวอย่างขนาด A4)"},
  "preview_title_live": {"zh-CN":"💡 A4 账单实时高保真预览","zh-TW":"💡 A4 帳單實時高保真預覽","en":"💡 Real-time High-fidelity A4 Preview","th":"💡 ตัวอย่างใบแจ้งหนี้ขนาด A4 เรียลไทม์"},
  "preview_sync_tip": {"zh-CN":"● 正在同步编辑数据","zh-TW":"● 正在同步編輯數據","en":"● Syncing editing data","th":"● กำลังซิงค์ข้อมูลเรียลไทม์"},
  "crm_tip": {"zh-CN":"支持补关联已有关联客户","zh-TW":"支持補關聯已有關聯客戶","en":"Supports linking to existing customers","th":"รองรับการเชื่อมโยงกับลูกค้าปัจจุบัน"},
  "btn_cancel_short": {"zh-CN":"取消","zh-TW":"取消","en":"Cancel","th":"ยกเลิก"},
  "add_item_sec": {"zh-CN":"添加结算项目:","zh-TW":"添加結算項目:","en":"Add line item:","th":"เพิ่มรายการเรียกเก็บเงิน:"}
};

export const getInvoiceTrans = (key: string, currentLang: Language) => {
  const translations = INVOICE_TRANSLATIONS[key];
  if (translations) {
    if (translations[currentLang]) {
      return translations[currentLang];
    }
    if (translations["zh-CN"]) {
      return translations["zh-CN"];
    }
    if (translations["en"]) {
      return translations["en"];
    }
    const values = Object.values(translations);
    if (values.length > 0) return values[0];
  }
  return key;
};

export const STATUS_TRANSLATIONS = {
  draft: { "zh-CN": "草稿", "zh-TW": "草稿", "en": "Draft", "th": "ร่าง" },
  pending: { "zh-CN": "待付款", "zh-TW": "待付款", "en": "Pending Payment", "th": "ค้างชำระ" },
  paid: { "zh-CN": "已结清", "zh-TW": "已結清", "en": "Paid & Settled", "th": "ชำระแล้ว" },
  overdue: { "zh-CN": "已逾期", "zh-TW": "已逾期", "en": "Overdue", "th": "เกินกำหนด" },
  canceled: { "zh-CN": "已作废", "zh-TW": "已作廢", "en": "Canceled", "th": "ยกเลิก" }
};

export const getStatusTrans = (status: string, currentLang: Language) => {
  const st = status?.toLowerCase() as keyof typeof STATUS_TRANSLATIONS;
  if (STATUS_TRANSLATIONS[st] && STATUS_TRANSLATIONS[st][currentLang]) {
    return STATUS_TRANSLATIONS[st][currentLang];
  }
  return status;
};

export const getStatusColor = (status: string) => {
  const s = status ? status.toLowerCase() : "";
  if (s === "draft") return "bg-slate-100 text-slate-700 border-slate-200";
  if (s === "pending") return "bg-orange-50 text-orange-700 border-orange-200";
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "overdue") return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
  return "bg-gray-100 text-gray-400 border-gray-200 line-through";
};

export const STATUS_LABELS = {
  draft: { cn: "草稿", color: "bg-slate-100 text-slate-700 border-slate-200" },
  pending: { cn: "待付款", color: "bg-orange-50 text-orange-700 border-orange-200" },
  paid: { cn: "已结清", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue: { cn: "已逾期", color: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" },
  canceled: { cn: "已作废", color: "bg-gray-100 text-gray-400 border-gray-200 line-through" }
};

export const CUSTOMER_PRESETS: Record<string, CustomerPreset> = {
  "CUST-101": {
    taxNo: "91310115MA1H7CUST0",
    bankName: "招商银行上海徐家汇支行",
    bankAccount: "6214 8301 2294 3301",
    address: "上海市徐汇区虹桥路355号凯科国际大厦12楼",
    phone: "+86 21 5489 2000",
    contact: "林经理",
  },
  "CUST-102": {
    taxNo: "91440300MA5FJ9B99U",
    bankName: "中国工商银行深圳科技园支行",
    bankAccount: "4000 0230 1920 0348 112",
    address: "深圳市南山区科苑路金融基地大厦A座801",
    phone: "+86 755 8620 9988",
    contact: "陈经理",
  },
  "CUST-103": {
    taxNo: "91110108MA017TRT0X",
    bankName: "中信银行北京中关村支行",
    bankAccount: "7111 0021 3491 5820 901",
    address: "北京市海淀区中关村大街28号海龙大厦15层",
    phone: "+86 10 6278 1234",
    contact: "王经理",
  }
};

export const DEFAULT_MOCK_INVOICES: Invoice[] = [
  {
    id: "INV-202607-001",
    invoiceNo: "WMS-INV-2026070101",
    customerId: "CUST-101",
    customerName: "上海凯信国际贸易商社",
    amount: 24500,
    currency: "CNY",
    issueDate: "2026-07-01",
    dueDate: "2026-07-31",
    status: "paid",
    taxRate: 6,
    taxAmount: 1386.79,
    subtotal: 23113.21,
    invoiceType: "vat",
    note: "2026年6月份跨境海外仓拣货打包服务费及一站式仓储租金结算",
    sellerName: "WMS HR 物流供应链有限公司",
    sellerTaxNo: "91310115MA1H7XW5XT",
    sellerBankName: "中国建设银行上海浦东分行",
    sellerBankAccount: "6217 0021 3004 5589 101",
    sellerAddress: "上海市浦东新区张江高科园区博雅路455号",
    sellerPhone: "+66 2 123 4567",
    sellerLogo: "",
    buyerTaxNo: "91310115MA1H7CUST0",
    buyerBankName: "招商银行上海徐家汇支行",
    buyerBankAccount: "6214 8301 2294 3301",
    buyerAddress: "上海市徐汇区虹桥路355号凯科国际大厦12楼",
    buyerPhone: "+86 21 5489 2000",
    buyerLogo: "",
    items: [
      { id: "item-1", description: "跨境件海外仓一件代发处理服务费 (拣货、贴单、套袋)", qty: 15000, unitPrice: 1.2, amount: 18000 },
      { id: "item-2", description: "立体货架仓储使用月度托管费 (按板计价)", qty: 10, unitPrice: 350, amount: 3500 },
      { id: "item-3", description: "跨境包裹逆向物流检测、重新包装与上架上色服务费", qty: 200, unitPrice: 15, amount: 3000 }
    ]
  },
  {
    id: "INV-202607-002",
    invoiceNo: "WMS-INV-2026070202",
    customerId: "CUST-102",
    customerName: "香港盛天数码供应链",
    amount: 8800,
    currency: "CNY",
    issueDate: "2026-07-02",
    dueDate: "2026-08-02",
    status: "pending",
    taxRate: 6,
    taxAmount: 498.11,
    subtotal: 8301.89,
    invoiceType: "ordinary",
    note: "海外仓集中配送集装箱清关卡派服务代垫费及派送操作服务",
    sellerName: "WMS HR 物流供应链有限公司",
    sellerTaxNo: "91310115MA1H7XW5XT",
    sellerBankName: "中国建设银行上海浦东分行",
    sellerBankAccount: "6217 0021 3004 5589 101",
    sellerAddress: "上海市浦东新区张江高科园区博雅路455号",
    sellerPhone: "+66 2 123 4567",
    sellerLogo: "",
    buyerTaxNo: "91440300MA5FJ9B99U",
    buyerBankName: "中国工商银行深圳科技园支行",
    buyerBankAccount: "4000 0230 1920 0348 112",
    buyerAddress: "深圳市南山区科苑路金融基地大厦A座801",
    buyerPhone: "+86 755 8620 9988",
    buyerLogo: "",
    items: [
      { id: "item-4", description: "海外港口拼箱/整柜提货提柜操作基础手续服务费", qty: 2, unitPrice: 1500, amount: 3000 },
      { id: "item-5", description: "泰国/缅甸派送车队卡车派送至各零售分销档口点位", qty: 4, unitPrice: 1450, amount: 5800 }
    ]
  },
  {
    id: "INV-202607-003",
    invoiceNo: "WMS-INV-2026070503",
    customerId: "CUST-103",
    customerName: "泰国正大商贸分销有限公司",
    amount: 1500,
    currency: "USD",
    issueDate: "2026-07-05",
    dueDate: "2026-07-15",
    status: "overdue",
    taxRate: 0,
    taxAmount: 0,
    subtotal: 1500,
    invoiceType: "proforma",
    note: "Proforma Invoice for Custom Clearance and Insurance pre-payout.",
    sellerName: "WMS HR 物流供应链有限公司",
    sellerTaxNo: "91310115MA1H7XW5XT",
    sellerBankName: "中国建设银行上海浦东分行",
    sellerBankAccount: "6217 0021 3004 5589 101",
    sellerAddress: "上海市浦东新区张江高科园区博雅路455号",
    sellerPhone: "+66 2 123 4567",
    sellerLogo: "",
    buyerTaxNo: "91110108MA017TRT0X",
    buyerBankName: "中信银行北京中关村支行",
    buyerBankAccount: "7111 0021 3491 5820 901",
    buyerAddress: "北京市海淀区中关村大街28号海龙大厦15层",
    buyerPhone: "+86 10 6278 1234",
    buyerLogo: "",
    items: [
      { id: "item-6", description: "Customs declaration fee & port terminal handling pre-charge", qty: 1, unitPrice: 1000, amount: 1000 },
      { id: "item-7", description: "Cargo international transit insurance (Premium coverage $50k)", qty: 1, unitPrice: 500, amount: 500 }
    ]
  }
];

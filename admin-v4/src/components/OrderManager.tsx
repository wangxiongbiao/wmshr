import React, { useState } from "react";
import { 
  Search, RefreshCw, ShoppingCart, Printer, ShieldAlert, CheckSquare, 
  Trash2, Play, AlertTriangle, Eye, Sparkles, MapPin, Phone, User, 
  Truck, X, Check, Barcode
} from "lucide-react";
import { CustomerOrder, Customer, Product } from "../types";
import { Language } from "../lib/i18n";

const ordTranslations = {
  search_ph: {
    "zh-CN": "搜索订单流水、平台单号、Sku、收件人...",
    "zh-TW": "搜索訂單流水、平台單號、Sku、收件人...",
    "en": "Search order ID, plat ID, SKU, receiver...",
    "th": "ค้นหาหมายเลขใบสั่งซื้อ SKU ผู้รับ..."
  },
  all_customers: {
    "zh-CN": "所有所属客户",
    "zh-TW": "所有所屬客戶",
    "en": "All Customers",
    "th": "ลูกค้าทั้งหมด"
  },
  get_shop_orders: {
    "zh-CN": "获取店铺订单 (抓取TikTok/Shopee)",
    "zh-TW": "獲取店鋪訂單 (抓取TikTok/Shopee)",
    "en": "Get Shop Orders (Fetch TikTok/Shopee)",
    "th": "ดึงข้อมูลคำสั่งซื้อร้านค้า (TikTok/Shopee)"
  },
  tab_pending_print: {
    "zh-CN": "待打单 (等候标签)",
    "zh-TW": "待打單 (等候標籤)",
    "en": "Pending Print (Wait Label)",
    "th": "รอพิมพ์ใบปะหน้า (รอแท็ก)"
  },
  tab_printed: {
    "zh-CN": "已打单 (等待快递扫描)",
    "zh-TW": "已打單 (等待快遞掃描)",
    "en": "Printed (Wait Scan)",
    "th": "พิมพ์แล้ว (รอสแกน)"
  },
  tab_shipped: {
    "zh-CN": "已发货 (完成物理揽派)",
    "zh-TW": "已發貨 (完成物理攬派)",
    "en": "Shipped (Outbound Complete)",
    "th": "จัดส่งแล้ว (เสร็จสิ้น)"
  },
  tab_anomaly: {
    "zh-CN": "异常单 (拣货缺货报错)",
    "zh-TW": "異常單 (揀貨缺貨報錯)",
    "en": "Anomaly (Picking Lack Error)",
    "th": "คำสั่งซื้อที่ผิดปกติ (ขาดแคลนสินค้า)"
  },
  tab_canceled: {
    "zh-CN": "已作废 (注销解压)",
    "zh-TW": "已作廢 (註銷解壓)",
    "en": "Voided (Cancelled)",
    "th": "ยกเลิกแล้ว (คลายการล็อค)"
  },
  th_order_id: {
    "zh-CN": "交易订单 ID",
    "zh-TW": "交易訂單 ID",
    "en": "Order ID",
    "th": "ID คำสั่งซื้อ"
  },
  th_platform_channel: {
    "zh-CN": "网店渠道来源",
    "zh-TW": "網店渠道來源",
    "en": "Platform Channel",
    "th": "ช่องทางร้านค้า"
  },
  th_merchant: {
    "zh-CN": "所属商户",
    "zh-TW": "所屬商戶",
    "en": "Merchant",
    "th": "ผู้ประกอบการ"
  },
  th_sku_detail: {
    "zh-CN": "下单商品 SKU • 明细",
    "zh-TW": "下單商品 SKU • 明細",
    "en": "Ordered SKU • Spec",
    "th": "รายละเอียดสินค้า SKU"
  },
  th_qty: {
    "zh-CN": "订购数量",
    "zh-TW": "訂購數量",
    "en": "Qty",
    "th": "จำนวน"
  },
  th_total_amount: {
    "zh-CN": "结算总额",
    "zh-TW": "結算總額",
    "en": "Total Amount",
    "th": "ยอดชำระเงินรวม"
  },
  th_receiver: {
    "zh-CN": "买家姓名与收件地址",
    "zh-TW": "買家姓名與收件地址",
    "en": "Receiver Name & Address",
    "th": "ชื่อผู้รับและที่อยู่จัดส่ง"
  },
  th_logistics: {
    "zh-CN": "物流承运商 • 快递单号",
    "zh-TW": "物流承運商 • 快遞單號",
    "en": "Logistics Carrier • Tracking No",
    "th": "ผู้ขนส่งและหมายเลขติดตาม"
  },
  th_anomaly_reason: {
    "zh-CN": "异常原因描述",
    "zh-TW": "異常原因描述",
    "en": "Anomaly Reason Description",
    "th": "คำอธิบายเหตุผลที่ผิดปกติ"
  },
  th_actions: {
    "zh-CN": "快捷控制台",
    "zh-TW": "快捷控制台",
    "en": "Quick Actions",
    "th": "แผงควบคุม"
  },
  empty_title: {
    "zh-CN": "当前列表暂无过滤订单记录",
    "zh-TW": "當前列表暫無過濾訂單記錄",
    "en": "No matching orders in current list",
    "th": "ไม่มีบันทึกคำสั่งซื้อในรายการตัวกรอง"
  },
  empty_desc: {
    "zh-CN": "请点击右上方【获取店铺订单】API接口获取TikTok和Shopee绑定店铺零售订单，核对库存通过即可自动流向此列。",
    "zh-TW": "請點擊右上方【獲取店鋪訂單】API接口獲取TikTok和Shopee綁定店鋪零售訂單，核對庫存通過即可自動流向此列。",
    "en": "Please click 'Get Shop Orders' above to pull TikTok and Shopee shop retail orders, which will automatically flow here after inventory check.",
    "th": "โปรดคลิก 'ดึงข้อมูลคำสั่งซื้อร้านค้า' เพื่อรับใบสั่งซื้อ และจะไหลมาที่คอลัมน์นี้เมื่อผ่านการตรวจสอบคลังสินค้า"
  },
  plat_no: {
    "zh-CN": "平台单号",
    "zh-TW": "平台單號",
    "en": "Plat ID",
    "th": "หมายเลขแพลตฟอร์ม"
  },
  pcs: {
    "zh-CN": "件",
    "zh-TW": "件",
    "en": "pcs",
    "th": "ชิ้น"
  },
  no_waybill: {
    "zh-CN": "尚未分配面单",
    "zh-TW": "尚未分配面單",
    "en": "No Waybill Assigned",
    "th": "ยังไม่ได้จัดสรรใบปะหน้า"
  },
  no_anomaly_desc: {
    "zh-CN": "拣货员标记异常，未写明描述",
    "zh-TW": "揀貨員標記異常，未寫明描述",
    "en": "No description written by picker",
    "th": "ผู้หยิบระบุข้อผิดพลาด แต่ไม่มีคำอธิบาย"
  },
  btn_print_waybill: {
    "zh-CN": "打印电子面单",
    "zh-TW": "打印電子面單",
    "en": "Print Waybill",
    "th": "พิมพ์ใบปะหน้า"
  },
  btn_picking_anomaly: {
    "zh-CN": "拣货异常",
    "zh-TW": "揀貨異常",
    "en": "Picking Anomaly",
    "th": "ข้อผิดพลาดการหยิบ"
  },
  btn_simulate_scan: {
    "zh-CN": "模拟快递揽件扫码",
    "zh-TW": "模擬快遞攬件掃碼",
    "en": "Simulate Courier Pick-up Scan",
    "th": "จำลองการสแกนรับพัสดุ"
  },
  btn_anomaly_retry: {
    "zh-CN": "异常重新处理",
    "zh-TW": "異常重新處理",
    "en": "Resolve Anomaly",
    "th": "จัดการสิ่งผิดปกติใหม่"
  },
  btn_void: {
    "zh-CN": "作废",
    "zh-TW": "作廢",
    "en": "Void",
    "th": "ยกเลิก"
  },
  flow_terminated: {
    "zh-CN": "流转已终绪",
    "zh-TW": "流轉已終緒",
    "en": "Flow Terminated",
    "th": "กระบวนการเสร็จสิ้น"
  },
  modal_pull_title: {
    "zh-CN": "TikTok / Shopee 电商API订单抓取核销中枢",
    "zh-TW": "TikTok / Shopee 電商API訂單抓取核銷中樞",
    "en": "TikTok / Shopee E-commerce API Order Fetch & Settle Center",
    "th": "ศูนย์กลางการดึงข้อมูลและชำระคำสั่งซื้อ TikTok / Shopee"
  },
  modal_pull_logic_title: {
    "zh-CN": "自动化订单预同步与可用库存核验逻辑：",
    "zh-TW": "自動化訂單預同步與可用庫存核驗邏輯：",
    "en": "Automated Order Pre-Sync & Available Stock Check Logic:",
    "th": "ลอจิกการซิงค์คำสั่งซื้อล่วงหน้าและตรวจสอบสต็อกอัตโนมัติ:"
  },
  modal_pull_logic_desc: {
    "zh-CN": "系统在通过 Webhook/API 网卡抓取未付款/未发货的境外平台包裹时，必须核检此商品SKU在本仓的物理可用货位库存。如库存足值，完成账项扣减并生成物流卡片，如库存缺乏，直接拦截拉单并不予出库。",
    "zh-TW": "系統在通過 Webhook/API 網卡抓取未付款/未發貨的境外平台包裹時，必須核檢此商品SKU在本倉的物理可用貨位庫存。如庫存足值，完成賬項扣減並生成物流卡片，如庫存缺乏，直接攔截拉單並不予出庫。",
    "en": "When the system fetches unpaid/unshipped cross-border packages via Webhook/API, it must check the physical available stock of this product SKU in our warehouse. If stock is sufficient, the account is deducted and waybills generated; if stock is insufficient, the order sync is directly blocked.",
    "th": "เมื่อระบบดึงข้อมูลพัสดุผ่าน API จะต้องตรวจสอบสต็อกของสินค้าชิ้นนี้ในคลังสินค้า หากสต็อกเพียงพอจะหักยอดและสร้างใบปะหน้า หากสต็อกไม่พอระบบจะระงับการดึงข้อมูลทันที"
  },
  modal_pull_select_cust: {
    "zh-CN": "选择对应托管客商",
    "zh-TW": "選擇對應託管客商",
    "en": "Select Associated Custodian Merchant",
    "th": "เลือกผู้ค้าที่เกี่ยวข้อง"
  },
  modal_pull_select_shop: {
    "zh-CN": "该客商已授权绑定的销售零售店铺渠道",
    "zh-TW": "該客商已授權綁定的銷售零售店鋪渠道",
    "en": "Authorized Sales/Retail Store Channels for this Merchant",
    "th": "ช่องทางร้านค้าที่ได้รับการอนุมัติสำหรับผู้ค้ารายนี้"
  },
  modal_pull_select_shop_empty: {
    "zh-CN": "（请去客户列表先授权绑定店铺）",
    "zh-TW": "（請去客戶列表先授權綁定店鋪）",
    "en": "(Please go to Customer List to bind store authorization first)",
    "th": "(โปรดไปที่รายชื่อลูกค้าเพื่อเชื่อมต่อร้านค้าก่อน)"
  },
  modal_pull_queue_title: {
    "zh-CN": "API网关检测到外部店铺等候回传的订单队列 ({n} 个)",
    "zh-TW": "API網關檢測到外部店鋪等候回傳的訂單隊列 ({n} 個)",
    "en": "External Store Wait-to-Sync Order Queue ({n} items) Detected via API Gateway",
    "th": "ตรวจพบรายการคำสั่งซื้อจากร้านค้าภายนอกผ่าน API ({n} รายการ)"
  },
  modal_pull_queue_desc: {
    "zh-CN": "我们将根据 these 外部SKU拉取并匹配物理库存",
    "zh-TW": "我們將根據 these 外部SKU拉取並匹配物理庫存",
    "en": "We will pull and match physical inventory based on these external SKUs",
    "th": "เราจะดึงข้อมูลสต็อกเพื่อจับคู่กับ SKU เหล่านี้"
  },
  modal_pull_receiver: {
    "zh-CN": "邮寄客户",
    "zh-TW": "郵寄客戶",
    "en": "Receiver",
    "th": "ผู้รับ"
  },
  modal_pull_address: {
    "zh-CN": "地址",
    "zh-TW": "地址",
    "en": "Address",
    "th": "ที่อยู่"
  },
  modal_pull_unit_price: {
    "zh-CN": "单价",
    "zh-TW": "單價",
    "en": "Unit Price",
    "th": "ราคาต่อหน่วย"
  },
  modal_pull_avail_stock: {
    "zh-CN": "本仓可用库存",
    "zh-TW": "本倉可用庫存",
    "en": "Available Stock in Warehouse",
    "th": "สต็อกสินค้าคงเหลือจริง"
  },
  modal_pull_stock_enough: {
    "zh-CN": "库位存足",
    "zh-TW": "庫位存足",
    "en": "In Stock",
    "th": "สต็อกพอเพียง"
  },
  modal_pull_stock_lack: {
    "zh-CN": "缺件拦截阻断",
    "zh-TW": "缺件攔截阻斷",
    "en": "Blocked due to Out of Stock",
    "th": "ระงับเนื่องจากขาดแคลนสินค้า"
  },
  modal_pull_btn_discard: {
    "zh-CN": "放弃拉取",
    "zh-TW": "放棄拉取",
    "en": "Discard",
    "th": "ยกเลิก"
  },
  modal_pull_btn_confirm: {
    "zh-CN": "核对库存并一键拉回待打单 ({n} 笔)",
    "zh-TW": "核對庫存並一鍵拉回待打單 ({n} 筆)",
    "en": "Check Stock & Import to Pending Print ({n} items)",
    "th": "ตรวจสอบสต็อกและดึงข้อมูล ({n} รายการ)"
  },
  modal_pull_loading: {
    "zh-CN": "正在API验证锁定物理库存量...",
    "zh-TW": "正在API驗證鎖定物理庫存量...",
    "en": "Verifying API & Pre-locking physical stock...",
    "th": "กำลังตรวจสอบสิทธิ์ API และสำรองสินค้า..."
  },
  modal_print_title: {
    "zh-CN": "电子装箱物流面单 (一单多配)",
    "zh-TW": "電子裝箱物流面單 (一單多配)",
    "en": "Electronic Packing Waybill (Single Order Multi-Package)",
    "th": "ใบปะหน้าสินค้าอิเลคทรอนิกส์"
  },
  modal_print_label: {
    "zh-CN": "闪送官方托管",
    "zh-TW": "閃送官方託管",
    "en": "Flash Express Standard",
    "th": "Flash Express มาตรฐาน"
  },
  modal_print_cod: {
    "zh-CN": "COD 现结",
    "zh-TW": "COD 現結",
    "en": "COD (Cash on Delivery)",
    "th": "เก็บเงินปลายทาง"
  },
  modal_print_receiver_lbl: {
    "zh-CN": "收件",
    "zh-TW": "收件",
    "en": "To",
    "th": "ผู้รับ"
  },
  modal_print_sender_lbl: {
    "zh-CN": "寄件",
    "zh-TW": "寄件",
    "en": "From",
    "th": "ผู้ส่ง"
  },
  modal_print_sender_name: {
    "zh-CN": "Global WMS-HR 3号总储仓",
    "zh-TW": "Global WMS-HR 3號總儲倉",
    "en": "Global WMS-HR Whse No.3",
    "th": "Global WMS-HR คลังสินค้า 3"
  },
  modal_print_sender_addr: {
    "zh-CN": "中国保税物流中心 A区中枢分拨处5楼",
    "zh-TW": "中國保稅物流中心 A區中樞分撥處5樓",
    "en": "5th Fl, Zone A Distribution Center, China Bonded Port",
    "th": "ชั้น 5 โซน A ศูนย์กระจายสินค้า ท่าเรือปลอดภาษีจีน"
  },
  modal_print_packing_lbl: {
    "zh-CN": "📦 质检配货报箱明细 (PACKING DETAIL)",
    "zh-TW": "📦 質檢配貨報箱明細 (PACKING DETAIL)",
    "en": "📦 QC & Packing Details (PACKING DETAIL)",
    "th": "📦 รายละเอียดการตรวจสอบคุณภาพและการบรรจุหีบห่อ"
  },
  modal_print_auth_time: {
    "zh-CN": "印票授权时间: {t} | 派单流水: {id}",
    "zh-TW": "印票授權時間: {t} | 派單流水: {id}",
    "en": "Label Auth Time: {t} | Settle ID: {id}",
    "th": "เวลาพิมพ์ใบปะหน้า: {t} | ID รายการ: {id}"
  },
  modal_print_btn_cancel: {
    "zh-CN": "取消打印",
    "zh-TW": "取消打印",
    "en": "Cancel Print",
    "th": "ยกเลิกการพิมพ์"
  },
  modal_print_btn_confirm: {
    "zh-CN": "完成纸质标签出库打印",
    "zh-TW": "完成紙質標籤出庫打印",
    "en": "Complete Paper Waybill Printing",
    "th": "พิมพ์ใบปะหน้าสำเร็จ"
  },
  modal_exception_title: {
    "zh-CN": "标记拣货异常单 (货架缺货报错/损纸)",
    "zh-TW": "標記揀貨異常單 (貨架缺貨報錯/損紙)",
    "en": "Mark Picking Anomaly (Shelf Out of Stock / Damaged)",
    "th": "ระบุสิ่งผิดปกติในการหยิบสินค้า"
  },
  modal_exception_note_title: {
    "zh-CN": "拣货员标记说明",
    "zh-TW": "揀貨員標記說明",
    "en": "Picker Instruction Note",
    "th": "คำแนะนำการระบุสำหรับผู้หยิบ"
  },
  modal_exception_note_desc: {
    "zh-CN": "当拣散货架发现货物丢失、商品破损漏液导致无法核销出单时，在此填写问题原因。这能第一时间通知财务将锁定额度释放。",
    "zh-TW": "當揀散貨架發現貨物丟失、商品破損漏液導致無法核銷出單時，在此填寫問題原因。這能第一時間通知財務將鎖定額度釋放。",
    "en": "When goods are found lost or damaged on shelves during picking, fill in the cause. This immediately notifies finance to release the locked credit limits.",
    "th": "เมื่อพบว่าสินค้าสูญหายหรือเสียหายระหว่างการจัดเตรียม ให้กรอกสาเหตุเพื่อที่ทางฝ่ายการเงินจะคืนยอดเครดิตที่สำรองไว้โดยเร็ว"
  },
  modal_exception_order_lbl: {
    "zh-CN": "原本配货订单 ID (流水)",
    "zh-TW": "原本配貨訂單 ID (流水)",
    "en": "Original Allocation Order ID",
    "th": "ID ใบสั่งซื้อเดิม"
  },
  modal_exception_reason_lbl: {
    "zh-CN": "实测异常反馈原因原因描述",
    "zh-TW": "實測異常反饋原因原因描述",
    "en": "Actual Anomaly Feedback Description",
    "th": "คำอธิบายข้อผิดพลาดจริง"
  },
  modal_exception_reason_ph: {
    "zh-CN": "如：货架 A-02-05 标记有 5 件，但实际纸盒只剩 1 件，且有挤压破损漏液情况！缺少可用数量配货。",
    "zh-TW": "如：貨架 A-02-05 標記有 5 件，但實際紙盒只剩 1 件，且有擠壓破損漏液情況！缺少可用數量配貨。",
    "en": "e.g., Shelf A-02-05 is marked with 5 pcs, but actually only 1 pc remains in box with leakage! Not enough quantity to allocate.",
    "th": "เช่น ชั้น A-02-05 ระบุว่ามี 5 ชิ้น แต่จริงเหลือแค่ 1 ชิ้นและชำรุดชำรุดซึม! ไม่มีจำนวนพอลักษณะ"
  },
  modal_exception_btn_save: {
    "zh-CN": "确认标记异常挂起",
    "zh-TW": "確認標記異常掛起",
    "en": "Confirm Mark Anomaly",
    "th": "ยืนยันการตั้งข้อผิดพลาด"
  },
  alert_select_channel: {
    "zh-CN": "请选择关联要进行拉取数据的客户与店铺渠道！",
    "zh-TW": "請選擇關聯要進行拉取數據的客戶與店鋪渠道！",
    "en": "Please select a customer and store channel to pull data!",
    "th": "โปรดเลือกผู้ค้าและช่องทางร้านค้าเพื่อดึงข้อมูล!"
  },
  toast_connecting: {
    "zh-CN": "正在通过 API 网关连接 TikTok/Shopee 电商数据端...",
    "zh-TW": "正在通過 API 網關連接 TikTok/Shopee 電商數據端...",
    "en": "Connecting to TikTok/Shopee e-commerce data end via API gateway...",
    "th": "กำลังเชื่อมต่อกับช่องทางร้านค้า TikTok/Shopee ผ่าน API..."
  },
  alert_out_of_stock_title: {
    "zh-CN": "【API拉单异常拦截报告】\n\n核验到所有待拉取商品均存货不足！无法获取任何订单。\n\n详细明细：\n",
    "zh-TW": "【API拉單異常攔截報告】\n\n核驗到所有待拉取商品均存貨不足！無法獲取任何訂單。\n\n詳細明細：\n",
    "en": "【API Sync Exception Report】\n\nInsufficient stock for all products to be pulled! Cannot fetch any orders.\n\nDetail list:\n",
    "th": "【รายงานข้อผิดพลาดการดึงข้อมูล API】\n\nพบสินค้าไม่มีในคลังสินค้าทั้งหมด! ไม่สามารถดึงรายการคำสั่งซื้อใดๆ ได้\n\nรายละเอียด:\n"
  },
  toast_out_of_stock_blocked: {
    "zh-CN": "库存不足，拉取订单受阻拦截",
    "zh-TW": "庫存不足，拉取訂單受阻攔截",
    "en": "Insufficient stock, order pulling blocked",
    "th": "สต็อกไม่เพียงพอ การดึงคำสั่งซื้อถูกระงับ"
  },
  feedback_partial_sync: {
    "zh-CN": "成功自动API拉取 {s} 个存货相符订单进入【待打单】，另有 {f} 个订单因【实物零库存/库存不足】而被阻止同步！",
    "zh-TW": "成功自動API拉取 {s} 個存貨相符訂單進入【待打單】，另有 {f} 個訂單因【實物零庫存/庫存不足】而被阻止同步！",
    "en": "Successfully pulled {s} stock-matching orders into [Pending Print], while {f} orders were blocked due to [No Inventory/Insufficient Stock]!",
    "th": "ดึงข้อมูลสำเร็จ {s} รายการ (สต็อกพอ) ส่วนอีก {f} รายการถูกระงับเนื่องจากสต็อกไม่พอ!"
  },
  feedback_perfect_sync: {
    "zh-CN": "完美匹配！成功抓取 {s} 个 TikTok/Shopee 网店订单归集入库，实物预锁定成功！",
    "zh-TW": "完美匹配！成功抓取 {s} 個 TikTok/Shopee 網店訂單歸集入庫，實物預鎖定成功！",
    "en": "Perfect match! Successfully grabbed {s} TikTok/Shopee store orders, inventory pre-locked successfully!",
    "th": "จับคู่สมบูรณ์แบบ! ดึงคำสั่งซื้อสำเร็จ {s} รายการจากร้านค้า และจองสินค้าในระบบสำเร็จ!"
  },
  blocked_details_lbl: {
    "zh-CN": "\n\n被拦截订单明细：\n",
    "zh-TW": "\n\n被攔截訂單明細：\n",
    "en": "\n\nBlocked order details:\n",
    "th": "\n\nรายละเอียดรายการที่ระงับ:\n"
  },
  toast_pull_done: {
    "zh-CN": "API订单拉取完成",
    "zh-TW": "API訂單拉取完成",
    "en": "API order pulling completed",
    "th": "ดึงข้อมูลคำสั่งซื้อผ่าน API สำเร็จ"
  },
  toast_print_success: {
    "zh-CN": "【纸质面单打印成功】订单 \"{id}\" 状态已更新为: 已打单，进入等待快递揽件列表。",
    "zh-TW": "【紙質面單打印成功】訂單 \"{id}\" 狀態已更新為: 已打單，進入等待快遞攬件列表。",
    "en": "【Waybill Printed Successfully】Order \"{id}\" state updated to: Printed, waiting for courier pick-up.",
    "th": "【พิมพ์ใบปะหน้าสำเร็จ】สถานะคำสั่งซื้อ \"{id}\" เปลี่ยนเป็น: พิมพ์แล้ว, รอกระบวนการจัดส่งต่อไป"
  },
  toast_scan_ship: {
    "zh-CN": "【快递员扫码出库】API网卡反馈：面单核卷成功，订单 {id} 已装车发货。",
    "zh-TW": "【快遞員掃碼出庫】API網卡反饋：面單核卷成功，訂單 {id} 已裝車發貨。",
    "en": "【Courier Scan Outbound】API Feedback: Waybill verified, order {id} loaded and shipped.",
    "th": "【สแกนออกจากคลังสำเร็จ】ผลตอบกลับ API: ยืนยันพัสดุสำเร็จ คำสั่งซื้อ {id} ขึ้นรถจัดส่งแล้ว"
  },
  default_exception_reason: {
    "zh-CN": "货架缺件找不到了，需要通知买家补款或理货重新核准库位",
    "zh-TW": "貨架缺件找不到了，需要通知買家補款或理貨重新核準庫位",
    "en": "Shelf missing parts, need to notify buyer for payment/refund, or count stock again to re-verify location",
    "th": "ไม่พบชิ้นส่วนบนชั้นวาง จำเป็นต้องแจ้งผู้ซื้อหรือตรวจสอบสินค้าและตำแหน่งสินค้าใหม่อีกครั้ง"
  },
  toast_marked_exception: {
    "zh-CN": "订单已被拣货员标记为「拣货异常单」，请及时排查库位！",
    "zh-TW": "訂單已被揀貨員標記為「揀貨異常單」，請及時排查庫位！",
    "en": "Order has been marked as 'Picking Anomaly' by picker, please check shelf location!",
    "th": "รายการสั่งซื้อนี้ถูกระบุว่า 'หยิบผิดปกติ' โปรดตรวจสอบสต็อกในทันที!"
  },
  toast_resolved_exception: {
    "zh-CN": "差异重新核准！订单 {id} 已写回待打单流重新处理。",
    "zh-TW": "差異重新核準！訂單 {id} 已寫回待打單流重新處理。",
    "en": "Discrepancy re-approved! Order {id} written back to pending print flow.",
    "th": "แก้ไขความผิดปกติเรียบร้อย! คำสั่งซื้อ {id} กลับเข้าสู่ขั้นตอนรอพิมพ์ใบปะหน้า"
  },
  confirm_void_order: {
    "zh-CN": "确定要将订单 \"{id}\" 手工作废吗？作废后被预占的仓库 SKU【{skuId}】共 {qty} 件库存将直接退回给商户！",
    "zh-TW": "確定要將訂單 \"{id}\" 手工作廢嗎？作廢後被預占的倉庫 SKU【{skuId}】共 {qty} 件庫存將直接退回給商戶！",
    "en": "Are you sure you want to void order \"{id}\"? Once voided, the pre-occupied WMS SKU [{skuId}] of {qty} pcs will be directly returned to merchant!",
    "th": "คุณแน่ใจหรือไม่ว่าจะยกเลิกคำสั่งซื้อ \"{id}\"? สินค้า SKU [{skuId}] จำนวน {qty} ชิ้นที่สำรองไว้จะคืนเข้าสต็อกผู้ค้าโดยตรง!"
  },
  void_reason: {
    "zh-CN": "操作员手动作废注销，库存安全解锁定回库",
    "zh-TW": "操作員手動作廢註銷，庫存安全解鎖定回庫",
    "en": "Operator manual voided, inventory safety unlocked and returned to stock.",
    "th": "ยกเลิกโดยเจ้าหน้าที่ คลายล็อกและคืนสินค้าเข้าคลังสินค้าเรียบร้อย"
  },
  toast_void_success: {
    "zh-CN": "已成功手工作废该订单，实物库存已归还到位。",
    "zh-TW": "已成功手工作廢該訂單，實物庫存已歸還到位。",
    "en": "Successfully voided this order, inventory returned to stock.",
    "th": "ยกเลิกคำสั่งซื้อสำเร็จและคืนสินค้ากลับคลังสินค้าเรียบร้อย"
  },
  toast_need_cust: {
    "zh-CN": "请先在【客户管理】页添加可用电商品牌客户档案！",
    "zh-TW": "請先在【客戶管理】頁添加可用電商品牌客戶檔案！",
    "en": "Please add active e-commerce brand customer profiles on the [Customer Mgmt] page first!",
    "th": "โปรดเพิ่มประวัติของลูกค้าในหน้า 'การจัดการลูกค้า' ก่อน!"
  }
};

interface OrderManagerProps {
  orders: CustomerOrder[];
  onUpdateOrders: (orders: CustomerOrder[]) => void;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  customers: Customer[];
  addToast: (msg: string) => void;
  lang?: Language;
}

export function OrderManager({ 
  orders, onUpdateOrders, 
  products, onUpdateProducts, 
  customers, addToast,
  lang = "zh-CN"
}: OrderManagerProps) {

  const getOrdText = (key: keyof typeof ordTranslations) => {
    const dict = ordTranslations[key];
    if (dict && dict[lang]) {
      return dict[lang];
    }
    return dict ? dict["zh-CN"] : key;
  };
  // Active Tab Filter
  const [activeTab, setActiveTab] = useState<'pending_print' | 'printed' | 'shipped' | 'anomaly' | 'canceled'>('pending_print');
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");

  // API Pull Store Modal states
  const [isPullModalOpen, setIsPullModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedShopId, setSelectedShopId] = useState("");
  const [activeShops, setActiveShops] = useState<any[]>([]);

  // Simulation Pulling loading or state
  const [isPulling, setIsPulling] = useState(false);
  const [previewChannelOrders, setPreviewChannelOrders] = useState<any[]>([]);

  // Waybill and printer preview states
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<CustomerOrder | null>(null);

  // Exception Reason modal
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionOrder, setExceptionOrder] = useState<CustomerOrder | null>(null);
  const [exceptionReason, setExceptionReason] = useState("");

  // Simulated API store orders data awaiting download (TK / Shopee API mock backend queue)
  const MOCK_CHANNEL_WAITING_ORDERS = [
    { orderNo: "TK-73940294-A", platform: "TikTok", skuId: "SKU-3CE", qty: 2, price: 89, receiverName: "Maria Lin", receiverPhone: "089-123-4567", receiverAddress: "泰国曼谷市廊曼区12-5巷3号" },
    { orderNo: "TK-94850384-B", platform: "TikTok", skuId: "SKU-3CE", qty: 5, price: 89, receiverName: "Arisara Ong", receiverPhone: "081-998-3849", receiverAddress: "泰国清迈府沙拉批区兰花村路112号" },
    { orderNo: "SP-23049583-C", platform: "Shopee", skuId: "SKU-9色/盒", qty: 10, price: 120, receiverName: "Somsak Som", receiverPhone: "085-748-2910", receiverAddress: "泰国普吉岛卡图区椰子海滩公寓358房" },
    { orderNo: "SP-84739209-D", platform: "Shopee", skuId: "SKU-3CE", qty: 1, price: 89, receiverName: "Zin Zin Min", receiverPhone: "099-284-1849", receiverAddress: "仰光甘马育镇大金塔路489号" },
    { orderNo: "TK-20394857-E", platform: "TikTok", skuId: "SKU-999-DUMMY", qty: 3, price: 45, receiverName: "Tony Stark", receiverPhone: "138-1111-2222", receiverAddress: "上海市浦东新区张江高科技园区" }
  ];

  // Helper when user selects Customer, populate active shops
  const handleClientChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const selectedCust = customers.find(c => c.id === custId);
    if (selectedCust && selectedCust.shops) {
      setActiveShops(selectedCust.shops);
      setSelectedShopId(selectedCust.shops[0]?.id || "");
    } else {
      setActiveShops([]);
      setSelectedShopId("");
    }

    // Set preview channel orders (using appropriate customer-specific mock or SKU mapping list)
    // Map existing products of this customer to make the simulator realistic
    const custProducts = products.filter(p => p.customerId === custId);
    
    const transformed = MOCK_CHANNEL_WAITING_ORDERS.map((ord, idx) => {
      // Re-map skuId to a product that customer actually has or keep standard if none
      const activeSku = custProducts[idx % custProducts.length]?.id || "SKU-3CE";
      const activeSkuName = custProducts[idx % custProducts.length]?.name || "3CE 九色腮红修容礼盒";
      return {
        ...ord,
        id: `plat-ord-${idx}-${Date.now().toString().slice(-4)}`,
        skuId: activeSku,
        skuName: activeSkuName,
        price: 99 + idx * 25
      };
    });
    setPreviewChannelOrders(transformed);
  };

  // Run the core: "获取订单" 自动拉取，检查系统库存是否有库存，有库存可拉取，无库存不可拉取
  const handleExecuteAPIOrderPull = () => {
    if (!selectedCustomerId || !selectedShopId) {
      addToast("请选择关联要进行拉取数据的客户与店铺渠道！");
      return;
    }

    setIsPulling(true);
    addToast("正在通过 API 网关连接 TikTok/Shopee 电商数据端...");

    setTimeout(() => {
      let successfullySynced: CustomerOrder[] = [];
      let failedLog: string[] = [];
      
      const newProductsState = [...products];

      // Scan preloaded preview channel orders
      previewChannelOrders.forEach((channelOrd) => {
        // Find corresponding product for inventory check
        const prodIdx = newProductsState.findIndex(
          p => p.id === channelOrd.skuId && p.customerId === selectedCustomerId
        );

        if (prodIdx === -1) {
          failedLog.push(`外部订单 ${channelOrd.orderNo} 对应的 SKU 编码【${channelOrd.skuId}】尚未在系统创建对应商品，拒绝导入！`);
          return;
        }

        const product = newProductsState[prodIdx];
        if (product.inventory >= channelOrd.qty) {
          // Has inventory, pull allowed! Deduct product inventory
          newProductsState[prodIdx].inventory -= channelOrd.qty;

          const client = customers.find(c => c.id === selectedCustomerId)!;
          const shop = client.shops.find(s => s.id === selectedShopId)!;

          const syncedOrder: CustomerOrder = {
            id: `ord-${Date.now().toString().slice(-4)}-${channelOrd.orderNo.slice(-3)}`,
            orderNo: channelOrd.orderNo,
            customerId: selectedCustomerId,
            customerName: client.name,
            platform: shop.platform,
            shopName: shop.shopName,
            shopId: shop.shopId,
            skuId: channelOrd.skuId,
            skuName: channelOrd.skuName,
            qty: channelOrd.qty,
            price: channelOrd.price,
            currency: client.currency || "CNY",
            receiverName: channelOrd.receiverName,
            receiverPhone: channelOrd.receiverPhone,
            receiverAddress: channelOrd.receiverAddress,
            status: "pending_print", // 拉取成功，直接流入「待打单」状态列表
            createdAt: new Date().toISOString().replace("T", " ").substring(0, 19)
          };

          successfullySynced.push(syncedOrder);
        } else {
          // No inventory, reject pull!
          failedLog.push(`外部订单 ${channelOrd.orderNo} 需要 SKU [${channelOrd.skuId}] 共 ${channelOrd.qty} 件，实物可用现货仅为 ${product.inventory} 件（库存不足），拉取失败！`);
        }
      });

      setIsPulling(false);

      if (successfullySynced.length === 0) {
        alert(`【API拉单异常拦截报告】\n\n核验到所有待拉取商品均存货不足！无法获取任何订单。\n\n详细明细：\n` + failedLog.join("\n"));
        addToast("库存不足，拉取订单受阻拦截");
        return;
      }

      // Commit changes to states
      onUpdateProducts(newProductsState);
      onUpdateOrders([...orders, ...successfullySynced]);

      const feedback = failedLog.length > 0 
        ? `成功自动API拉取 ${successfullySynced.length} 个存货相符订单进入【待打单】，另有 ${failedLog.length} 个订单因【实物零库存/库存不足】而被阻止同步！`
        : `完美匹配！成功抓取 ${successfullySynced.length} 个 TikTok/Shopee 网店订单归集入库，实物预锁定成功！`;

      alert(feedback + (failedLog.length > 0 ? `\n\n被拦截订单明细：\n` + failedLog.join("\n") : ""));
      addToast(`API订单拉取完成`);
      setIsPullModalOpen(false);
      setActiveTab('pending_print');
    }, 1500);
  };

  // Actions transitions
  // 1. Process Printing
  const handleOpenPrintPreview = (ord: CustomerOrder) => {
    setPrintingOrder(ord);
    setIsPrintPreviewOpen(true);
  };

  const executePrintLabel = () => {
    if (!printingOrder) return;
    
    // Transition status to 'printed'
    const updated = orders.map(o => {
      if (o.id === printingOrder.id) {
        return {
          ...o,
          status: 'printed' as const,
          carrier: "闪送国际速递 (FlashExpress)",
          trackingNo: `FLE-${Math.floor(100000000 + Math.random() * 900000000)}`
        };
      }
      return o;
    });

    onUpdateOrders(updated);
    setIsPrintPreviewOpen(false);
    addToast(`【纸质面单打印成功】订单 "${printingOrder.id}" 状态已更新为: 已打单，进入等待快递揽件列表。`);
  };

  // 2. Courier Scan Waybill -> Shipped
  const handleCourierAPIConfirmShip = (ord: CustomerOrder) => {
    const updated = orders.map(o => {
      if (o.id === ord.id) {
        return {
          ...o,
          status: 'shipped' as const,
          trackingNo: o.trackingNo || `FLE-${Math.floor(100000000 + Math.random() * 900000000)}`
        };
      }
      return o;
    });

    onUpdateOrders(updated);
    addToast(`【快递员扫码出库】API网卡反馈：面单核卷成功，订单 ${ord.id} 已装车发货。`);
  };

  // 3. Mark Picking Anomaly
  const handleOpenException = (ord: CustomerOrder) => {
    setExceptionOrder(ord);
    setExceptionReason("货架缺件找不到了，需要通知买家补款或理货重新核准库位");
    setIsExceptionModalOpen(true);
  };

  const handleSaveException = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionOrder) return;

    const updated = orders.map(o => {
      if (o.id === exceptionOrder.id) {
        return {
          ...o,
          status: 'anomaly' as const,
          reason: exceptionReason.trim()
        };
      }
      return o;
    });

    onUpdateOrders(updated);
    setIsExceptionModalOpen(false);
    addToast(`订单已被拣货员标记为「拣货异常单」，请及时排查库位！`);
  };

  // Resolve / Re-process anomaly back to pending print or deduct cancel
  const handleResolveAnomaly = (ord: CustomerOrder) => {
    const updated = orders.map(o => {
      if (o.id === ord.id) {
        return {
          ...o,
          status: 'pending_print' as const,
          reason: undefined
        };
      }
      return o;
    });
    onUpdateOrders(updated);
    addToast(`差异重新核准！订单 ${ord.id} 已写回待打单流重新处理。`);
  };

  // 4. Manual Void Order -> "已作废" (Deduction returning storage)
  const handleVoidOrder = (ord: CustomerOrder) => {
    if (confirm(`确定要将订单 "${ord.id}" 手工作废吗？作废后被预占的仓库 SKU【${ord.skuId}】共 ${ord.qty} 件库存将直接退回给商户！`)) {
      // 1. Return stock to Product inventory
      const newProductsState = products.map(p => {
        if (p.id === ord.skuId && p.customerId === ord.customerId) {
          return { ...p, inventory: p.inventory + ord.qty };
        }
        return p;
      });

      // 2. Change order status to Canceled
      const newOrdersState = orders.map(o => {
        if (o.id === ord.id) {
          return {
            ...o,
            status: 'canceled' as const,
            reason: "操作员手动作废注销，库存安全解锁定回库"
          };
        }
        return o;
      });

      onUpdateProducts(newProductsState);
      onUpdateOrders(newOrdersState);
      addToast(`已成功手工作废该订单，实物库存已归还到位。`);
    }
  };

  // Row filtering inside the tables
  const filteredRows = orders.filter(ord => {
    // Stage Filter
    if (ord.status !== activeTab) return false;

    // Search Box query
    const matchesQuery = 
      ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.skuId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (customerFilter === "all") return matchesQuery;
    return matchesQuery && ord.customerId === customerFilter;
  });

  // Count tabs
  const getTabCount = (statusToCheck: string) => {
    return orders.filter(o => o.status === statusToCheck).length;
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Query Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索订单流水、平台单号、Sku、收件人..."
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-brand-500 text-slate-700 bg-slate-50 transition placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Customer Choice Filter */}
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

        {/* Sync Pull trigger */}
        <button
          onClick={() => {
            if (customers.length === 0) {
              addToast("请先在【客户管理】页添加可用电商品牌客户档案！");
              return;
            }
            // Init pull select choices
            handleClientChange(customers[0].id);
            setIsPullModalOpen(true);
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-650 hover:bg-indigo-100 active:scale-95 text-xs font-bold rounded-lg cursor-pointer transition shadow-3xs"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-hover text-indigo-505" />
          <span>获取店铺订单 (抓取TikTok/Shopee)</span>
        </button>
      </div>

      {/* Tabs list based on the actual sub-workflow */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex border-b border-slate-150 bg-slate-50 overflow-x-auto divide-x divide-slate-150">
          <button
            onClick={() => setActiveTab('pending_print')}
            className={`px-5 py-3.5 text-xs font-extrabold cursor-pointer transition shrink-0 flex items-center gap-2 ${
              activeTab === 'pending_print' ? "bg-white text-brand-650 font-black border-t-2 border-t-brand-600" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>待打单 (等候标签)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-600 font-extrabold border border-amber-100">
              {getTabCount('pending_print')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('printed')}
            className={`px-5 py-3.5 text-xs font-extrabold cursor-pointer transition shrink-0 flex items-center gap-2 ${
              activeTab === 'printed' ? "bg-white text-brand-650 font-black border-t-2 border-t-brand-600" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <CheckSquare className="w-4 h-4 text-slate-400" />
            <span>已打单 (等待快递扫描)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-650 font-extrabold border border-blue-100">
              {getTabCount('printed')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shipped')}
            className={`px-5 py-3.5 text-xs font-extrabold cursor-pointer transition shrink-0 flex items-center gap-2 ${
              activeTab === 'shipped' ? "bg-white text-brand-650 font-black border-t-2 border-t-brand-600" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Truck className="w-4 h-4 text-slate-400" />
            <span>已发货 (完成物理揽派)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-600 font-extrabold border border-emerald-100">
              {getTabCount('shipped')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('anomaly')}
            className={`px-5 py-3.5 text-xs font-extrabold cursor-pointer transition shrink-0 flex items-center gap-2 ${
              activeTab === 'anomaly' ? "bg-white text-rose-650 font-black border-t-2 border-t-rose-600" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>异常单 (拣货缺货报错)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-600 font-extrabold border border-rose-100">
              {getTabCount('anomaly')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('canceled')}
            className={`px-5 py-3.5 text-xs font-extrabold cursor-pointer transition shrink-0 flex items-center gap-2 ${
              activeTab === 'canceled' ? "bg-white text-slate-700 font-black border-t-2 border-t-slate-600" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
            <span>已作废 (注销解压)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500 font-extrabold">
              {getTabCount('canceled')}
            </span>
          </button>
        </div>

        {/* Content list based on Filtered Tab */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px] text-[13px]">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <th className="px-5 py-3.5">交易订单 ID</th>
                <th className="px-5 py-3.5">网店渠道来源</th>
                <th className="px-5 py-3.5">所属商户</th>
                <th className="px-5 py-3.5">下单商品 SKU • 明细</th>
                <th className="px-5 py-3.5 text-right">订购数量</th>
                <th className="px-5 py-3.5 text-right">结算总额</th>
                <th className="px-5 py-3.5">买家姓名与收件地址</th>
                <th className="px-5 py-3.5">物流承运商 • 快递单号</th>
                {activeTab === 'anomaly' && <th className="px-5 py-3.5 text-rose-500">异常原因描述</th>}
                <th className="px-5 py-3.5 text-center">快捷控制台</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400 font-medium bg-slate-50/10">
                    <div className="max-w-md mx-auto space-y-1.5 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="font-bold text-slate-700 text-xs">当前列表暂无过滤订单记录</p>
                      <p className="text-[10px] text-slate-400">请点击右上方【获取店铺订单】API接口获取TikTok和Shopee绑定店铺零售订单，核对库存通过即可自动流向此列。</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map(ord => (
                  <tr key={ord.id} className="hover:bg-slate-50/40 transition">
                    {/* ID */}
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-slate-900 leading-none">{ord.id}</p>
                      <span className="text-[10px] font-mono text-slate-450 mt-1.5 block">
                        平台单号: {ord.orderNo}
                      </span>
                    </td>

                    {/* Shop details */}
                    <td className="px-5 py-4 font-bold">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                        ord.platform === "TikTok" 
                          ? "bg-slate-950 text-white border-transparent" 
                          : "bg-orange-50 text-orange-600 border-orange-120"
                      }`}>
                        {ord.platform}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">{ord.shopName}</p>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4 text-slate-500 text-[11px]">
                      {ord.customerName}
                    </td>

                    {/* Product / SKU */}
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-slate-900 uppercase text-[11px] bg-slate-100 px-1 rounded inline-block max-w-[120px] truncate">{ord.skuId}</p>
                      <p className="text-[10.5px] font-bold text-slate-700 line-clamp-1 mt-1" title={ord.skuName}>
                        {ord.skuName}
                      </p>
                    </td>

                    {/* Qty */}
                    <td className="px-5 py-4 text-right font-bold text-slate-900 font-mono">
                      {ord.qty} 件
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 text-right font-extrabold text-slate-800">
                      ¥{((ord.price || 0) * ord.qty).toLocaleString()}
                    </td>

                    {/* Receiver */}
                    <td className="px-5 py-4 text-[11px] max-w-[180px]">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <User className="w-3 h-3 text-slate-450 shrink-0" />
                        <span>{ord.receiverName} • {ord.receiverPhone}</span>
                      </div>
                      <p className="text-slate-500 truncate mt-1" title={ord.receiverAddress}>
                        {ord.receiverAddress}
                      </p>
                    </td>

                    {/* Waybills logistics */}
                    <td className="px-5 py-4 text-[11px]">
                      {ord.carrier ? (
                        <div>
                          <p className="font-bold text-slate-800">{ord.carrier}</p>
                          <p className="font-mono text-slate-500 font-bold tracking-wider underline mt-0.5">{ord.trackingNo}</p>
                        </div>
                      ) : (
                        <span className="text-slate-350 italic">尚未分配面单</span>
                      )}
                    </td>

                    {/* Anomaly Description label */}
                    {activeTab === 'anomaly' && (
                      <td className="px-5 py-4 text-rose-600 bg-rose-50/20 text-[11px] font-bold">
                        {ord.reason || "拣货员标记异常，未写明描述"}
                      </td>
                    )}

                    {/* Actions control buttons based on current state */}
                    <td className="px-5 py-4 text-center font-bold">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* 1. STATE: PENDING PRINT */}
                        {ord.status === 'pending_print' && (
                          <>
                            <button
                              onClick={() => handleOpenPrintPreview(ord)}
                              className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-extrabold rounded-lg text-[10.5px] cursor-pointer transition flex items-center gap-0.5"
                              title="生成并打印官方物流标签"
                            >
                              <Printer className="w-3 h-3" />
                              <span>打印电子面单</span>
                            </button>
                            
                            <button
                              onClick={() => handleOpenException(ord)}
                              className="p-1 px-1.5 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              title="标记商品缺件等货架异常"
                            >
                              拣货异常
                            </button>
                          </>
                        )}

                        {/* 2. STATE: PRINTED */}
                        {ord.status === 'printed' && (
                          <>
                            <button
                              onClick={() => handleCourierAPIConfirmShip(ord)}
                              className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-750 active:scale-95 text-white font-extrabold rounded-lg text-[10.5px] cursor-pointer transition flex items-center gap-1"
                              title="快递员扫描面单API回写已发货"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>模拟快递揽件扫码</span>
                            </button>

                            <button
                              onClick={() => handleOpenException(ord)}
                              className="p-1 px-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition text-[11px]"
                              title="标记商品缺件等货架异常"
                            >
                              拣货异常
                            </button>
                          </>
                        )}

                        {/* 3. STATE: ANOMALY */}
                        {ord.status === 'anomaly' && (
                          <button
                            onClick={() => handleResolveAnomaly(ord)}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10.5px] transition"
                            title="重新核对实物归库，流回待打单"
                          >
                            异常重新处理
                          </button>
                        )}

                        {/* CANCELLATION FOR ALL ACTIVE STATES except Canceled & Shipped */}
                        {ord.status !== 'canceled' && ord.status !== 'shipped' && (
                          <button
                            onClick={() => handleVoidOrder(ord)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition"
                            title="手工作废该订单扣减并返还可用实存物料"
                          >
                            作废
                          </button>
                        )}

                        {/* No actions for Shipped & Canceled */}
                        {(ord.status === 'shipped' || ord.status === 'canceled') && (
                          <span className="text-slate-400 font-semibold text-[11px] italic">流转已终绪</span>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. API Shop Download Order Sync console overlay */}
      {isPullOpenCustom(isPullModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-100" />
                <h3 className="font-bold text-base tracking-wide">TikTok / Shopee 电商API订单抓取核销中枢</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPullModalOpen(false)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Form & Checker List */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4 font-semibold text-sm text-slate-700">
              
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-brand-850 text-xs">自动化订单预同步与可用库存核验逻辑：</p>
                  <p className="text-xs text-slate-550 leading-normal">
                    系统在通过 Webhook/API 网卡抓取未付款/未发货的境外平台包裹时，<b>必须核检此商品SKU在本仓的物理可用货位库存</b>。如库存足值，完成账项扣减并生成物流卡片，如库存缺乏，直接拦截拉单并不予出库。
                  </p>
                </div>
              </div>

              {/* Selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 text-xs">选择对应托管客商</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold bg-white"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1.5 text-xs">该客商已授权绑定的销售零售店铺渠道</label>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-bold bg-white"
                  >
                    {activeShops.length === 0 ? (
                      <option value="">（请去客户列表先授权绑定店铺）</option>
                    ) : (
                      activeShops.map(s => (
                        <option key={s.id} value={s.id}>{s.platform} - {s.shopName}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Platform Orders queue preview */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-extrabold text-brand-600 uppercase tracking-wider">
                    API网关检测到外部店铺等候回传的订单队列 ({previewChannelOrders.length} 个)
                  </span>
                  <span className="text-xs text-slate-400">我们将根据这些外部SKU拉取并匹配物理库存</span>
                </div>

                <div className="border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-3xs max-h-[220px] overflow-y-auto">
                  {previewChannelOrders.map((ord, idx) => {
                    const matchedProd = products.find(p => p.id === ord.skuId && p.customerId === selectedCustomerId);
                    const stock = matchedProd ? matchedProd.inventory : 0;
                    const canPull = stock >= ord.qty;

                    return (
                      <div key={ord.id} className="p-3 hover:bg-slate-50/50 transition flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-500 font-bold">{ord.orderNo}</span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-650 px-1.5 rounded uppercase font-mono font-bold">
                              {ord.skuId}
                            </span>
                          </div>
                          <p className="text-[10.5px] font-bold text-slate-700 line-clamp-1">{ord.skuName}</p>
                          <p className="text-[10px] text-slate-400">邮寄客户: {ord.receiverName} • 地址: {ord.receiverAddress}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-slate-900 font-mono">
                            {ord.qty} 件 <span className="text-[10px] text-slate-400">单价: ¥{ord.price}</span>
                          </p>
                          <div className="mt-1 flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-slate-500">
                              本仓可用库存: <span className="font-extrabold font-mono text-slate-705">{stock}</span>
                            </span>
                            {canPull ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold">
                                库位存足
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] bg-rose-50 text-rose-600 border border-rose-100 font-bold">
                                缺件拦截阻断
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pull executing panel */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsPullModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl transition cursor-pointer"
                >
                  放弃拉取
                </button>
                <button
                  onClick={handleExecuteAPIOrderPull}
                  disabled={isPulling || activeShops.length === 0}
                  className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-450 disabled:cursor-not-allowed text-white font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer text-sm"
                >
                  {isPulling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>正在API验证锁定物理库存量...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>核对库存并一键拉回待打单 ({previewChannelOrders.length} 笔)</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 2. Realistic Logistic Shipping Note Printer Modal */}
      {isPrintPreviewOpen && printingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <Printer className="w-5 h-5 text-brand-100" />
                <span className="text-base tracking-wide">电子装箱物流面单 (一单多配)</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPrintPreviewOpen(false)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Note Content */}
            <div className="p-6 overflow-y-auto bg-slate-100/70 border-b border-slate-200 select-none">
              
              {/* Waybill card paper visualizer */}
              <div className="bg-white border-2 border-slate-800 p-6 font-bold text-sm text-slate-900 space-y-5 shadow-sm relative max-w-2xl mx-auto rounded-lg">
                
                {/* Header of paper waybill */}
                <div className="flex items-center justify-between border-b-2 border-dashed border-slate-800 pb-4">
                  <div className="flex items-center gap-1.5">
                    <Barcode className="w-10 h-10 text-slate-900" />
                    <div>
                      <h4 className="text-base font-black tracking-widest bg-slate-900 text-white px-2.5 py-1 rounded uppercase">
                        {printingOrder.platform} SHIP
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">WMS-CROSS-BORDER-LABEL</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-sans">闪送官方托管</p>
                    <p className="text-xl font-black tracking-tighter text-slate-900">COD 现结</p>
                  </div>
                </div>

                {/* Routing Barcode block */}
                <div className="py-3 flex flex-col items-center justify-center bg-slate-50 border border-slate-300 rounded-lg space-y-1.5">
                  <div className="h-12 w-4/5 flex items-center justify-center opacity-90">
                    {/* Simulated vertical stripes for barcode */}
                    <div className="flex items-center w-full h-full justify-center select-none">
                      <div className="w-1.5 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-0.5 h-full bg-slate-900 mr-1.5"></div>
                      <div className="w-2 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-0.5 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-1 h-full bg-slate-900 mr-1.5"></div>
                      <div className="w-1 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-0.5 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-3 h-full bg-slate-900 mr-1"></div>
                      <div className="w-0.5 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-1.5 h-full bg-slate-900 mr-1.5"></div>
                      <div className="w-0.5 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-2 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-0.5 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-1.5 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-1 h-full bg-slate-900 mr-1"></div>
                      <div className="w-1 h-full bg-slate-900 mr-0.5"></div>
                      <div className="w-0.5 h-full bg-slate-900 mr-1.5"></div>
                      <div className="w-1.5 h-full bg-slate-900 mr-0.5"></div>
                    </div>
                  </div>
                  <span className="font-mono text-center block text-xs tracking-[0.25em] font-bold text-slate-800">
                    *FLE-SHIPPING-{printingOrder.id.toUpperCase()}*
                  </span>
                </div>

                {/* Receiver and Sender particulars */}
                <div className="grid grid-cols-2 gap-4 border-y border-slate-300 py-4 text-xs leading-tight">
                  <div className="space-y-1.5">
                    <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded font-extrabold uppercase">
                      收件
                    </span>
                    <p className="font-black text-slate-900 text-sm">{printingOrder.receiverName}</p>
                    <p className="font-mono font-bold text-slate-700">{printingOrder.receiverPhone}</p>
                    <p className="text-slate-500 font-semibold text-xs leading-normal">{printingOrder.receiverAddress}</p>
                  </div>

                  <div className="space-y-1.5 border-l border-slate-300 pl-4">
                    <span className="text-[10px] bg-slate-400 text-white px-1.5 py-0.5 rounded font-semibold uppercase">
                      寄件
                    </span>
                    <p className="font-bold text-slate-800">Global WMS-HR 3号总储仓</p>
                    <p className="font-mono text-slate-600">021-9989020</p>
                    <p className="text-slate-400 font-medium text-xs leading-normal">
                      中国保税物流中心 A区中枢分拨处5楼
                    </p>
                  </div>
                </div>

                {/* SKU Details block inside the label */}
                <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                    📦 质检配货报箱明细 (PACKING DETAIL)
                  </span>
                  <div className="flex justify-between items-center text-slate-900">
                    <div>
                      <p className="font-mono font-black text-sm">[SKU] {printingOrder.skuId}</p>
                      <p className="text-xs text-slate-600 font-bold mt-1">{printingOrder.skuName}</p>
                    </div>
                    <p className="text-lg font-black font-mono text-brand-600 shrink-0">
                      x{printingOrder.qty} <span className="text-xs">件</span>
                    </p>
                  </div>
                </div>

                {/* Bottom branding and barcode */}
                <p className="text-[10px] text-slate-400 font-bold text-center italic pt-1">
                  印票授权时间: {printingOrder.createdAt} | 派单流水: {printingOrder.id}
                </p>

              </div>

            </div>

            {/* Action footer */}
            <div className="p-4 bg-slate-150 flex justify-end gap-3 font-bold text-sm select-none">
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(false)}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl transition text-slate-700 cursor-pointer"
              >
                取消打印
              </button>
              <button
                type="button"
                onClick={executePrintLabel}
                className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>完成纸质标签出库打印</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. Mark Picker Exception/Picking error Dialog Popover Overlay */}
      {isExceptionModalOpen && exceptionOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-brand-100 animate-pulse" />
                <h3 className="font-bold text-base tracking-wide">标记拣货异常单 (货架缺货报错/损纸)</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsExceptionModalOpen(false)}
                className="text-brand-200 hover:text-white text-base p-1.5 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Form list */}
            <form onSubmit={handleSaveException} className="p-6 space-y-5 text-sm font-semibold">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs leading-normal leading-relaxed">
                <p className="font-extrabold text-xs flex items-center gap-1 mb-1.5 text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>拣货员标记说明</span>
                </p>
                当拣散货架发现货物丢失、商品破损漏液导致无法核销出单时，在此填写问题原因。这能第一时间通知财务将锁定额度释放。
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">原本配货订单 ID (流水)</label>
                <div className="px-4 py-2.5 bg-slate-100 font-mono text-slate-550 border border-slate-200 rounded-xl text-sm">
                  {exceptionOrder.id} (SKU: {exceptionOrder.skuId})
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-xs">实测异常反馈原因原因描述 <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="如：货架 A-02-05 标记有 5 件，但实际纸盒只剩 1 件，且有挤压破损漏液情况！缺少可用数量配货。"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-850 font-bold h-28 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsExceptionModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl transition cursor-pointer shadow-xs hover:shadow-sm text-sm"
                >
                  确认标记异常挂起
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Custom safety wrapper for JSX compilation
function isPullOpenCustom(openState: boolean): boolean {
  return openState;
}

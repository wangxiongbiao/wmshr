const fs = require('fs');

let content = fs.readFileSync('admin-v4/src/components/invoice/constants.ts', 'utf8');

// 1. Precise updates for zh-CN:
// Restore original package copy where possible, and remove/replace English copy
const updates = {
  // Restore original package table headers
  col_invoice_no: '发票号 / 编号',
  col_seller: '开票主体 / 销售方',
  col_buyer: '合作客户 / 购买方',
  col_dates: '开票及截止日期',
  col_amount: '开票结算金额',
  
  // Clean English from bilingual preview labels
  buyer_lbl: '客户',
  details_lbl: '账单信息',
  subtotal_lbl: '小计:',
  tax_lbl: '销项税',
  total_lbl: '应付总金额:',
  grand_total_lbl: '总计金额:',
  amount_in_words_lbl: '大写金额',

  // Restore original package preview labels
  notes_terms_lbl: '说明条款:',
  default_notes_desc: '暂无其他条款说明。如有任何账目结算疑问，请在收到账单之日起3个工作日内向财务管理部提出复核，逾期将视为完全认可本账单。',
  client_sig_lbl: '客户签收',
  auth_sig_lbl: '开票人签名',
  date_cn_year: '___________ 年 _______ 月 _______ 日',
  date_prefix_lbl: '日期: ',
  
  // Restore original package editor titles & tabs
  edit_invoice_title: '修改结算发票账单 (可实时预览)',
  create_invoice_title: '开立新结算发票 (实时高保真 A4 预览)',
  form_tab_edit: '✍️ 填写开票单据',
  form_tab_preview: '👁️ 实时高保真 A4 预览',
  
  // Sections (faithful to original package)
  sec_meta: '1. 结算发票基本信息',
  sec_seller: '2. 开票方资料',
  sec_buyer: '3. 购买方/关联客户资料',
  sec_items: '4. 发票服务明细项目',
  sec_notes: '5. 发票附言条款',
  
  // Clean English from placeholders
  item_qty_placeholder: '结算数量',
  item_price_placeholder: '单价',
  copy_text_placeholder: '输入联次 (例如：第一联 记账联)',
  
  // Restore original package placeholders and buttons
  invoice_type_placeholder: '例：增值税专用发票 / 形式发票 / 普通发票',
  item_desc_lbl: '结算服务/费用描述 (如：6月WMS拣货贴单打包费) *',
  item_desc_placeholder: '服务/货物内容描述 (例如：海外仓拣货费-6月)',
  upload_stamp_lbl: '开票主体公章图片 (推荐透明背景PNG)',
  upload_sig_lbl: '财务授权签字 (图片或画板手签)',
  sig_modal_title: '电子签名画板 (签字将自动载入发票授权栏)',
  cur_option_cny: '人民币 (CNY ￥)',
  cur_option_thb: '泰铢 (THB ฿)',
  cur_option_usd: '美元 (USD $)',
  cur_option_eur: '欧元 (EUR €)',
  logo_seller_lbl: '开票方企业LOGO',
  logo_buyer_lbl: '购买方LOGO',
  logo_buyer_tip: '推荐比例为长方形，支持PNG/JPG',
  seller_name_input: '开票企业/名称 *',
  seller_tax_input: '纳税人信用代码/税号',
  seller_phone_input: '联系电话/传真',
  seller_address_input: '企业注册地址/开票地址',
  buyer_phone_input: '客户电话/传真',
  buyer_address_input: '客户送达/开票地址',
  click_to_upload: '点击自定义上传 Logo',
  upload_logo_short: '上传 Logo',
  print_pdf: '打印 / 导出PDF',
  btn_print_pdf: '导出PDF',
  print_current: '导出PDF'
};

for (const [key, zhVal] of Object.entries(updates)) {
  const pattern = new RegExp(`("${key}":\\s*{\\s*"zh-CN":\\s*)"[^"]+"`, 'g');
  content = content.replace(pattern, `$1${JSON.stringify(zhVal)}`);
}

fs.writeFileSync('admin-v4/src/components/invoice/constants.ts', content, 'utf8');
console.log('Successfully aligned constants.ts: original copy used, English tags cleaned!');

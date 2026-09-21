const fs = require('fs');

let content = fs.readFileSync('admin-v4/src/components/invoice/constants.ts', 'utf8');

const replacements = {
  col_invoice_no: '发票号',
  col_seller: '开票主体',
  col_buyer: '客户名称',
  col_dates: '开票与截止日期',
  col_amount: '结算金额',
  print_pdf: '导出 PDF',
  buyer_lbl: '客户名称',
  buyer_address_lbl: '客户送达地址',
  details_lbl: '账单信息',
  subtotal_lbl: '小计:',
  tax_lbl: '税额:',
  grand_total_lbl: '总计金额:',
  amount_in_words_lbl: '大写金额',
  seller_signature_lbl: '开票方授权盖章',
  official_stamp: '单位公章',
  edit_invoice_title: '编辑发票账单',
  create_invoice_title: '开具结算发票',
  form_tab_preview: '实时发票预览',
  invoice_type_placeholder: '请选择或输入发票种类',
  tax_rate_lbl: '销项税率 (%)',
  tax_free_proforma: '(形式发票免税)',
  cur_option_cny: '人民币 (￥)',
  cur_option_thb: '泰铢 (฿)',
  cur_option_usd: '美元 ($)',
  cur_option_eur: '欧元 (€)',
  logo_seller_lbl: '开票方企业标识',
  select_file_btn: '选择文件上传 (2MB内)',
  seller_name_input: '开票企业名称 *',
  seller_tax_input: '统一社会信用代码/税号',
  seller_phone_input: '联系电话',
  seller_address_input: '企业注册及开票地址',
  sec_buyer: '3. 购买方客户资料',
  logo_buyer_lbl: '购买方企业标识',
  logo_buyer_tip: '推荐长方形比例，支持 PNG 或 JPG 格式',
  buyer_phone_input: '客户联系电话',
  buyer_address_input: '客户开票及送达地址',
  item_desc_lbl: '费用项目及服务描述 *',
  upload_stamp_lbl: '单位公章图片 (推荐透明背景 PNG)',
  upload_sig_lbl: '财务授权签字 (支持手签或图片)',
  sig_modal_title: '手写签名 (签字将自动载入发票授权栏)',
  item_desc_placeholder: '服务或货物内容描述 (例如：海外仓拣货打包服务费)',
  item_qty_placeholder: '数量',
  item_price_placeholder: '单价',
  print_current: '导出 PDF',
  btn_print_pdf: '导出 PDF',
  click_to_upload: '点击上传企业标识',
  upload_logo_short: '上传企业标识',
  copy_text_placeholder: '输入联次 (例如：第一联 记账联)',
  client_sig_lbl: '客户签收',
  auth_sig_lbl: '出票方盖章',
  notes_terms_lbl: '条款及备注说明',
  terms_sec_lbl: '款项说明与付款条款'
};

for (const [key, zhVal] of Object.entries(replacements)) {
  const pattern = new RegExp(`("${key}":\\s*{\\s*"zh-CN":\\s*)"[^"]+"`, 'g');
  content = content.replace(pattern, `$1${JSON.stringify(zhVal)}`);
}

// Also update mock invoices sellerName
content = content.replaceAll(
  '"WMS HR Overseas Logistics Group Ltd."',
  '"WMS HR 物流供应链有限公司"'
);

fs.writeFileSync('admin-v4/src/components/invoice/constants.ts', content, 'utf8');
console.log('Successfully updated constants.ts with clean Chinese translations!');

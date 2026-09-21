const fs = require('fs');

function updateFile(p) {
  let content = fs.readFileSync(p, 'utf8');
  content = content.replaceAll('"WMS HR Logistics"', '"物流供应链有限公司"');
  content = content.replaceAll('"WMS HR Overseas Logistics Group Ltd."', '"物流供应链有限公司"');
  fs.writeFileSync(p, content, 'utf8');
  console.log('Updated ' + p);
}

updateFile('admin-v4/src/components/invoice/components/InvoiceDetailCard.tsx');
updateFile('admin-v4/src/components/invoice/components/InvoiceLivePreview.tsx');

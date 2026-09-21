const fs = require('fs');

let code = fs.readFileSync('admin-v4/src/components/InvoiceManager.tsx', 'utf8');

code = code.replace(
  /const \[formSellerName, setFormSellerName\] = useState\(\(\) => localStorage\.getItem\("last_formSellerName"\) \?\? "WMS HR [^"]+"\);/,
  'const [formSellerName, setFormSellerName] = useState(() => localStorage.getItem("last_formSellerName") ?? "\\u7269\\u6d41\\u4f9b\\u5e94\\u94fe\\u6709\\u9650\\u516c\\u53f8");'
);

code = code.replace(
  /setFormSellerName\(localStorage\.getItem\("last_formSellerName"\) \?\? "WMS HR [^"]+"\);/,
  'setFormSellerName(localStorage.getItem("last_formSellerName") ?? "\\u7269\\u6d41\\u4f9b\\u5e94\\u94fe\\u6709\\u9650\\u516c\\u53f8");'
);

code = code.replace(
  /setFormSellerName\(inv\.sellerName \?\? "WMS HR [^"]+"\);/,
  'setFormSellerName(inv.sellerName ?? "\\u7269\\u6d41\\u4f9b\\u5e94\\u94fe\\u6709\\u9650\\u516c\\u53f8");'
);

code = code.replace(
  /\{lang === "en" \? "Synchronizing invoice records\.\.\." : lang === "th" \? "[^"]+" : "[^"]+"}/,
  '{lang === "en" ? "Synchronizing invoice records..." : lang === "th" ? "\\u0e01\\u0e33\\u0e25\\u0e31\\u0e07\\u0e0b\\u0e34\\u0e07\\u0e42\\u0e04\\u0e23\\u0e44\\u0e19\\u0e0b\\u0e4c\\u0e02\\u0e49\\u0e2d\\u0e21\\u0e39\\u0e25\\u0e43\\u0e1a\\u0e41\\u0e08\\u0e49\\u0e07\\u0e2b\\u0e19\\u0e35\\u0e49..." : "\\u6b63\\u5728\\u540c\\u6b65\\u53d1\\u7968\\u8d26\\u5355\\u6570\\u636e..."}'
);

code = code.replace(
  /<span>\{lang === "en" \? "Reset all filters" : lang === "th" \? "[^"]+" : "[^"]+"}<\/span>/,
  '<span>{lang === "en" ? "Reset all filters" : lang === "th" ? "\\u0e23\\u0e35\\u0e40\\u0e0b\\u0e47\\u0e15\\u0e15\\u0e31\\u0e27\\u0e01\\u0e23\\u0e2d\\u0e07\\u0e17\\u0e31\\u0e49\\u0e07\\u0e2b\\u0e21\\u0e14" : "\\u91cd\\u7f6e\\u6240\\u6709\\u7b5b\\u9009"}</span>'
);

fs.writeFileSync('admin-v4/src/components/InvoiceManager.tsx', code, 'utf8');
console.log('Done repairing InvoiceManager.tsx');

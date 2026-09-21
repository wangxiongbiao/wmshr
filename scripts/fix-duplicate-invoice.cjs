const fs = require('fs');

let code = fs.readFileSync('admin-v4/src/components/InvoiceManager.tsx', 'utf8');
const lines = code.split('\n');

// Keep lines 0 to 2625 (where Dialog ends)
const cleanedLines = lines.slice(0, 2625);
cleanedLines.push('    </div>');
cleanedLines.push('  );');
cleanedLines.push('}');
cleanedLines.push('');
cleanedLines.push('export default InvoiceManager;');

fs.writeFileSync('admin-v4/src/components/InvoiceManager.tsx', cleanedLines.join('\n'), 'utf8');
console.log('Fixed duplication! Total lines now:', cleanedLines.length);

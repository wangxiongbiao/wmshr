const fs = require('fs');
let code = fs.readFileSync('test-leave-stage1-run2.mjs', 'utf8');

// fix lines manually
code = code.replace(/console\.log\("calcGetRes.body:".*?\n/g, '');
code = code.replace(/console\.log\("calcBody length:".*?\n/g, '');
code = code.replace(/console\.log\("calcBody sample:".*?\n/g, '');

fs.writeFileSync('test-leave-stage1-run2.mjs', code);

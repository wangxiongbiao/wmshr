const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'SopManager.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('新建') || line.includes('起草') || line.includes('创建') || line.includes('isCreating')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}

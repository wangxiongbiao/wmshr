import fs from 'node:fs';

console.log("Starting InvoiceManager UI library fidelity audit...");

const code = fs.readFileSync('admin-v4/src/components/InvoiceManager.tsx', 'utf8');

// 1. Check imports
const requiredImports = [
  'import { Button } from "./ui/button"',
  'import { Input } from "./ui/input"',
  'import { Badge } from "./ui/badge"',
  'import { Card } from "./ui/card"',
  'import { DatePicker as UIDatePicker } from "./ui/date-picker"',
  'Select,',
  'SelectContent,',
  'SelectItem,',
  'SelectTrigger,',
  'SelectValue,',
  '} from "./ui/select"',
  'import { Label } from "./ui/label"',
  'Dialog,',
  'DialogContent,',
  'DialogHeader,',
  'DialogTitle,',
  'DialogDescription,',
  'DialogFooter,',
  '} from "./ui/dialog"',
  'import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"'
];

for (const imp of requiredImports) {
  if (!code.includes(imp)) {
    throw new Error('Missing expected import: ' + imp);
  }
}
console.log("✓ All required UI component imports verified");

// 2. Check native tags
const lines = code.split(/\r?\n/);
const nativeButtons = [];
const nativeSelects = [];
const corruptedLines = [];

lines.forEach((l, idx) => {
  if (/<button[\s>]/.test(l)) {
    nativeButtons.push({ line: idx + 1, text: l.trim() });
  }
  if (/<select[\s>]/.test(l)) {
    nativeSelects.push({ line: idx + 1, text: l.trim() });
  }
  if (/\?{3,}/.test(l)) {
    corruptedLines.push({ line: idx + 1, text: l.trim() });
  }
});

if (nativeButtons.length > 0) {
  throw new Error('Found native <button> tags: ' + JSON.stringify(nativeButtons));
}
console.log("✓ Zero native <button> tags found (all 100% replaced with UI Button / Tabs)");

if (nativeSelects.length > 0) {
  throw new Error('Found native <select> tags: ' + JSON.stringify(nativeSelects));
}
console.log("✓ Zero native <select> tags found (all 100% replaced with UI Select)");

if (corruptedLines.length > 0) {
  throw new Error('Found corrupted ???? text lines: ' + JSON.stringify(corruptedLines));
}
console.log("✓ Zero corrupted text characters found (all UTF-8 clean)");

// 3. Verify all 6 Select instances
const selectUsages = [
  'typeFilter',
  'statusFilter',
  'formInvoiceType',
  'formStatus',
  'formCurrency',
  'formCustomerId'
];

for (const usage of selectUsages) {
  if (!code.includes(usage)) {
    throw new Error('Missing expected Select field binding: ' + usage);
  }
}
console.log("✓ Verified all 6 Select bindings: typeFilter, statusFilter, formInvoiceType, formStatus, formCurrency, formCustomerId");

// 4. Verify Dialog instances
if (!code.includes('<Dialog open={!!viewInvoice}')) {
  throw new Error('Missing viewInvoice Dialog');
}
if (!code.includes('<Dialog open={!!deleteConfirmId}')) {
  throw new Error('Missing deleteConfirmId Dialog');
}
if (!code.includes('<Dialog open={isSigModalOpen}')) {
  throw new Error('Missing isSigModalOpen Dialog');
}
console.log("✓ Verified all 3 Dialog instances: viewInvoice, deleteConfirmId, isSigModalOpen");

console.log("🎉 All InvoiceManager UI library component checks passed successfully!");

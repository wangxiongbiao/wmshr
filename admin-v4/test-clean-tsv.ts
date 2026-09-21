
import { parseSystemDataText, parseJntDataText, resolveHeaderIndexes } from "./src/components/express/utils/parsers";
import * as XLSX from "xlsx";
import * as fs from "fs";

const wb1 = XLSX.read(fs.readFileSync("C:/Users/admin/AppData/Local/Temp/codex-web-uploads-HBC951/1ee9ddfd-149a-4ae3-90d9-075d89b9c1aa"), { type: "buffer" });
const raw1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], { header: 1, raw: false }) as any[][];
const tsv1 = raw1.map(row => row.map(cell => String(cell ?? "").replace(/[\r\n\t]+/g, " ").trim()).join("\t")).join("\n");
const sys = parseSystemDataText(tsv1);

const wb2 = XLSX.read(fs.readFileSync("C:/Users/admin/AppData/Local/Temp/codex-web-uploads-HBC951/67fa53e1-74d7-4e1b-9358-f90518c2a81e"), { type: "buffer" });
const raw2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { header: 1, raw: false }) as any[][];
const tsv2 = raw2.map(row => row.map(cell => String(cell ?? "").replace(/[\r\n\t]+/g, " ").trim()).join("\t")).join("\n");
const jnt = parseJntDataText(tsv2);

console.log(JSON.stringify({
  sysRecordsCount: sys.records.length,
  sysFirstRecord: sys.records[0],
  jntRecordsCount: jnt.records.length,
  jntFirstRecord: jnt.records[0],
  jntLastRecord: jnt.records[jnt.records.length - 1]
}, null, 2));
  
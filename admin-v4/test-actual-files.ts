
import { parseSystemDataText, parseJntDataText } from "./src/components/express/utils/parsers";
import * as XLSX from "xlsx";
import * as fs from "fs";

const wb1 = XLSX.read(fs.readFileSync("C:/Users/admin/AppData/Local/Temp/codex-web-uploads-HBC951/1ee9ddfd-149a-4ae3-90d9-075d89b9c1aa"), { type: "buffer" });
const tsv1 = XLSX.utils.sheet_to_txt(wb1.Sheets[wb1.SheetNames[0]]);
const sys = parseSystemDataText(tsv1);

const wb2 = XLSX.read(fs.readFileSync("C:/Users/admin/AppData/Local/Temp/codex-web-uploads-HBC951/67fa53e1-74d7-4e1b-9358-f90518c2a81e"), { type: "buffer" });
const tsv2 = XLSX.utils.sheet_to_txt(wb2.Sheets[wb2.SheetNames[0]]);
const jnt = parseJntDataText(tsv2);

console.log(JSON.stringify({
  sysCount: sys.records.length,
  sysSample: sys.records.slice(0, 2),
  jntCount: jnt.records.length,
  jntSample: jnt.records.slice(0, 2),
  jntLast: jnt.records[jnt.records.length - 1]
}, null, 2));
  
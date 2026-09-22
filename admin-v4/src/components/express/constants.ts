import { Customer } from "../../types";
import { CustomerSurcharge } from "./types";

export const DEFAULT_SURCHARGES: Record<string, CustomerSurcharge> = {
  "บริษัท ชัวแมกซ์ จำกัด": { customerName: "บริษัท ชัวแมกซ์ จำกัด", type: "piece", amount: 5 },
  "上海凯信国际贸易商社": { customerName: "上海凯信国际贸易商社", type: "piece", amount: 5 },
  "香港盛天数码供应链": { customerName: "香港盛天数码供应链", type: "flat", amount: 100 },
  "泰国正大商贸分销有限公司": { customerName: "泰国正大商贸分销有限公司", type: "piece", amount: 2 }
};

export const DEMO_SYSTEM_DATA = `运单号\t客户名称\t收件人\t电话\t订单号
829341609983\tบริษัท ชัวแมกซ์ จำกัด\tArisara S.\t0812345678\tORD-1001
829342510732\tบริษัท ชัวแมกซ์ จำกัด\tNattapong K.\t0898765432\tORD-1002
829344438974\t上海凯信国际贸易商社\t张强\t13812345678\tORD-1003
82935001446\t香港盛天数码供应链\t李美\t13987654321\tORD-1004
829345831812\t泰国正大商贸分销有限公司\t王豪\t13611112222\tORD-1005
829346035232\t泰国正大商贸分销有限公司\t赵敏\t13533334444\tORD-1006
829346538915\t上海凯信国际贸易商社\t陈东\t13755556666\tORD-1007
EXPR1008\t香港盛天数码供应链\t周丽\t13488889999\tORD-1008
EXPR1009\t未名海外商行\t泰山\t13100000000\tORD-1009`;

export const DEMO_JNT_DATA = `运单编号\t录入时间\t签收时间\t客户所属网点\t管理方式\t经营模式\t客户编码\t客户名称\t付款周期\t产品类型\t寄件方式\t物品类型\t总运费\t运费\t偏远费\t保价费\t包材费\t计费重量(kg)\t商家订单号
829341609983\t2026-06-03 15:19:09\t2026-06-04 16:30:39\t02Bang Phli29\t直营网点\t自营\tVIP8021040146\tบริษัท ชัวแมกซ์ จำกัด\tP-30\tEZ\tpick up\tPARCEL\t28\t18\t0\t10\t0\t1.20\tORD-1001
829342510732\t2026-06-12 12:50:31\t2026-06-14 13:14:39\t02Bang Phli29\t直营网点\t自营\tVIP8021040146\tบริษัท ชัวแมกซ์ จำกัด\tP-30\tEZ\tpick up\tPARCEL\t18\t18\t0\t0\t0\t0.80\tORD-1002
829344438974\t2026-06-11 15:00:01\t2026-06-12 12:59:56\t02Bang Phli29\t直营网点\t自营\tVIP8021040146\t上海凯信国际贸易商社\tP-30\tEZ\tpick up\tPARCEL\t18\t18\t0\t0\t0\t2.50\tORD-1003
82935001446\t2026-06-03 15:19:09\t2026-06-12 15:16:46\t02Bang Phli29\t直营网点\t自营\tVIP8021040146\t香港盛天数码供应链\tP-30\tEZ\tpick up\tPARCEL\t28\t18\t0\t10\t0\t0.40\tORD-1004
829345831812\t2026-06-12 12:43:51\t2026-06-14 14:28:02\t02Bang Phli29\t直营网点\t自营\tVIP8021040146\t泰国正大商贸分销有限公司\tP-30\tEZ\tpick up\tPARCEL\t18\t18\t0\t0\t0\t3.80\tORD-1005
829346035232\t2026-06-03 15:19:09\t2026-06-06 10:19:28\t02Bang Phli29\t直营网点\t自营\tVIP8021040146\t泰国正大商贸分销有限公司\tP-30\tEZ\tpick up\tPARCEL\t28\t18\t0\t10\t0\t1.00\tORD-1006
829346538915\t2026-06-01 14:57:06\t2026-06-03 13:27:21\t02Bang Phli29\t直营网点\t自营\tVIP8021040146\t上海凯信国际贸易商社\tP-30\tEZ\tpick up\tPARCEL\t28\t18\t0\t10\t0\t1.50\tORD-1007
829346538999\t2026-06-01 14:57:06\t2026-06-03 13:27:21\t02Bang Phli29\t直营网点\t自营\tVIP8021040146\tบริษัท ชัวแมกซ์ จำกัด\tP-30\tEZ\tpick up\tPARCEL\t18\t18\t0\t0\t0\t0.90\tORD-9999
JNT1008_ALT\t2026-06-01 14:57:06\t2026-06-03 13:27:21\t02Bang Phli29\t直营网点\t自营\tVIP8021040146\t香港盛天数码供应链\tP-30\tEZ\tpick up\tPARCEL\t18\t18\t0\t0\t0\t1.10\tORD-1008`;

export const COMMON_CUSTOMER_NAMES = [
  "未名发货商",
  "บริษัท ชัวแมกซ์ จำกัด",
  "上海凯信国际贸易商社",
  "香港盛天数码供应链",
  "泰国正大商贸分销有限公司"
];

export function getCustomerCurrency(custName: string, customers?: Customer[]): { symbol: string; code: string } {
  if (!custName) return { symbol: "฿", code: "THB" };
  const found = customers?.find((c) => c.name === custName);
  if (found && found.currency) {
    const cur = found.currency.toUpperCase();
    if (cur === "CNY" || cur === "RMB" || cur === "元") {
      return { symbol: "¥", code: "CNY" };
    } else if (cur === "USD") {
      return { symbol: "$", code: "USD" };
    } else {
      return { symbol: cur === "THB" ? "฿" : cur, code: cur };
    }
  }
  return { symbol: "฿", code: "THB" };
}

export const STATUS_CONFIG: Record<
  "matched" | "system_only" | "jnt_only",
  { label: string; badgeClass: string; dotClass: string }
> = {
  matched: {
    label: "匹配成功",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500"
  },
  system_only: {
    label: "仅系统有单（JNT未结算）",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500"
  },
  jnt_only: {
    label: "仅JNT账单有单（系统无单）",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500"
  }
};

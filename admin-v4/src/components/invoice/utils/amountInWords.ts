export function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    return convert(Math.floor(n / 1000000)) + " Million" + (n % 1000000 !== 0 ? " " + convert(n % 1000000) : "");
  }

  if (num === 0) return "Zero";
  return convert(num);
}

export function getAmountInWords(amount: number, currency: string): string {
  try {
    const mainUnit = currency === "CNY" ? "元" : currency === "USD" ? "Dollars" : currency === "THB" ? "Baht" : "Units";
    const subUnit = currency === "CNY" ? "角分" : "Cents";

    if (currency === "CNY") {
      const cnNums = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
      const cnIntUnits = ["", "拾", "佰", "仟", "万", "拾", "佰", "仟", "亿"];
      
      const integerPart = Math.floor(amount);
      const decimalPart = Math.round((amount - integerPart) * 100);
      
      let res = "";
      if (integerPart === 0) {
        res = "零元";
      } else {
        const strInt = integerPart.toString();
        const len = strInt.length;
        for (let i = 0; i < len; i++) {
          const digit = parseInt(strInt.charAt(i), 10);
          const unit = cnIntUnits[len - i - 1];
          if (digit !== 0) {
            res += cnNums[digit] + unit;
          } else {
            if (res.charAt(res.length - 1) !== "零") {
              res += "零";
            }
          }
        }
        if (res.endsWith("零")) res = res.slice(0, -1);
        res += "元";
      }
      
      if (decimalPart > 0) {
        const jiao = Math.floor(decimalPart / 10);
        const fen = decimalPart % 10;
        if (jiao > 0) res += cnNums[jiao] + "角";
        if (fen > 0) res += cnNums[fen] + "分";
      } else {
        res += "整";
      }
      return res;
    } else {
      const integerPart = Math.floor(amount);
      const decimalPart = Math.round((amount - integerPart) * 100);
      let res = numberToWords(integerPart) + " " + mainUnit;
      if (decimalPart > 0) {
        res += " and " + numberToWords(decimalPart) + " " + subUnit;
      } else {
        res += " Only";
      }
      return res;
    }
  } catch {
    return amount.toFixed(2) + " " + currency;
  }
}

/* analysis.js
 * محرك التحليل المالي: النسب المالية + التحليل الرأسي والأفقي + دورة CCC
 */
window.FA = window.FA || {};

(function (FA) {
  "use strict";

  var num = FA.util.num;

  function safeDiv(a, b) {
    if (!b) return null; // undefined إحصائيًا لو المقام صفر
    return a / b;
  }

  function avg(current, previous, key) {
    var c = num(current[key]);
    if (previous) return (c + num(previous[key])) / 2;
    return c;
  }

  // classify: يصنف قيمة نسبة إلى جيد/تحت الملاحظة/ضعيف بناءً على حدود عامة إرشادية
  function classify(value, goodMin, watchMin, higherIsBetter) {
    if (value === null || value === undefined || isNaN(value)) return "na";
    if (higherIsBetter === false) {
      // كل ما قل كان أفضل (مثل نسبة الدين)
      if (value <= goodMin) return "good";
      if (value <= watchMin) return "watch";
      return "poor";
    }
    if (value >= goodMin) return "good";
    if (value >= watchMin) return "watch";
    return "poor";
  }

  // ---------------------------------------------------------------------
  // النسب المعيارية العالمية الإرشادية لكل نسبة (نفس حدود "جيد" في classify
  // حيثما وُجدت، عشان الاتساق). annual:true = نسبة تقارن رقم-فترة (تراكمي)
  // برقم-ميزانية (لحظي)، فبيتقسم على نسبة طول الفترة من السنة. annual:false
  // = النسبة ثابتة مهما كان طول الفترة (هامش، أو ميزانية/ميزانية، أو أيام
  // بعد تصحيح DIO/DSO/DPO لاستخدام أيام الفترة الفعلية).
  // ---------------------------------------------------------------------
  var BENCHMARKS = {
    currentRatio: { value: 1.5, annual: false, dir: "gte" },
    quickRatio: { value: 1.0, annual: false, dir: "gte" },
    cashRatio: { value: 0.2, annual: false, dir: "gte" },
    inventoryTurnover: { value: 6, annual: true, dir: "gte" },
    dio: { value: 60, annual: false, dir: "lte" },
    receivableTurnover: { value: 8, annual: true, dir: "gte" },
    dso: { value: 45, annual: false, dir: "lte" },
    payableTurnover: { value: 6, annual: true, dir: "ref" },
    dpo: { value: 60, annual: false, dir: "ref" },
    assetTurnover: { value: 1.0, annual: true, dir: "gte" },
    grossMargin: { value: 0.30, annual: false, dir: "gte" },
    operatingMargin: { value: 0.15, annual: false, dir: "gte" },
    netMargin: { value: 0.10, annual: false, dir: "gte" },
    roa: { value: 0.05, annual: true, dir: "gte" },
    roe: { value: 0.15, annual: true, dir: "gte" },
    debtRatio: { value: 0.5, annual: false, dir: "lte" },
    debtToEquity: { value: 1.0, annual: false, dir: "lte" },
    equityRatio: { value: 0.5, annual: false, dir: "ref" },
    interestCoverage: { value: 4, annual: false, dir: "gte" },
    ocfRatio: { value: 0.5, annual: true, dir: "gte" },
    fcfMargin: { value: 0.10, annual: false, dir: "gte" },
    cashFlowToDebt: { value: 0.20, annual: true, dir: "gte" },
    ocfToNetIncome: { value: 1.0, annual: false, dir: "gte" }
  };

  function attachBenchmarks(result, periodDays) {
    result.groups.forEach(function (group) {
      group.ratios.forEach(function (r) {
        var b = BENCHMARKS[r.key];
        if (!b) return;
        r.benchmark = b.value;
        r.benchmarkAnnual = b.annual;
        r.benchmarkDir = b.dir;
        r.benchmarkAdj = b.annual ? b.value * periodDays / 365 : b.value;
      });
    });
    return result;
  }

  // ---------------------------------------------------------------------
  // النسب المالية
  // ---------------------------------------------------------------------
  function computeRatiosForPeriod(periods, idx) {
    var period = periods[idx];
    var v = FA.Store.getComputedRow(period.id);
    var prevRow = idx > 0 ? FA.Store.getComputedRow(periods[idx - 1].id) : null;
    var periodDays = FA.util.periodDays(period);
    // لتحجيم حدود classify() الخاصة بالنسب "annual" (فترة/ميزانية) بنفس منطق المعيار
    function scaleAnnual(x) { return x * periodDays / 365; }

    var avgInventory = avg(v, prevRow, "inventory");
    var avgAR = avg(v, prevRow, "accountsReceivable");
    var avgAP = avg(v, prevRow, "accountsPayable");
    var avgAssets = avg(v, prevRow, "totalAssets");
    var avgEquity = avg(v, prevRow, "totalEquity");

    var inventoryTurnover = safeDiv(v.cogs, avgInventory);
    var receivableTurnover = safeDiv(v.revenue, avgAR);
    var payableTurnover = safeDiv(v.cogs, avgAP);

    // نستخدم عدد أيام الفترة الفعلي (مش 365 ثابت) عشان DIO/DSO/DPO تفضل صحيحة
    // مهما كان طول البيانات المُدخلة (سنة، 6 شهور، ربع سنة...)
    var dio = inventoryTurnover ? periodDays / inventoryTurnover : null;
    var dso = receivableTurnover ? periodDays / receivableTurnover : null;
    var dpo = payableTurnover ? periodDays / payableTurnover : null;
    var ccc = (dio !== null && dso !== null && dpo !== null) ? (dio + dso - dpo) : null;

    var currentRatio = safeDiv(v.totalCurrentAssets, v.totalCurrentLiabilities);
    var quickRatio = safeDiv(v.totalCurrentAssets - v.inventory, v.totalCurrentLiabilities);
    var cashRatio = safeDiv(v.cash, v.totalCurrentLiabilities);
    var workingCapital = v.totalCurrentAssets - v.totalCurrentLiabilities;

    var grossMargin = safeDiv(v.grossProfit, v.revenue);
    var operatingMargin = safeDiv(v.operatingIncome, v.revenue);
    var netMargin = safeDiv(v.netIncome, v.revenue);
    var roa = safeDiv(v.netIncome, avgAssets);
    var roe = safeDiv(v.netIncome, avgEquity);
    var assetTurnover = safeDiv(v.revenue, avgAssets);

    var debtRatio = safeDiv(v.totalLiabilities, v.totalAssets);
    var debtToEquity = safeDiv(v.totalLiabilities, v.totalEquity);
    var equityRatio = safeDiv(v.totalEquity, v.totalAssets);
    var interestCoverage = v.interestExpense ? safeDiv(v.operatingIncome, v.interestExpense) : null;

    var ocfRatio = safeDiv(v.operatingCashFlow, v.totalCurrentLiabilities);
    var fcfMargin = safeDiv(v.freeCashFlow, v.revenue);
    var cashFlowToDebt = safeDiv(v.operatingCashFlow, v.totalLiabilities);
    var ocfToNetIncome = v.netIncome ? safeDiv(v.operatingCashFlow, v.netIncome) : null;

    var result = {
      periodId: period.id,
      periodLabel: period.label,
      periodMonths: period.periodMonths,
      groups: [
        {
          key: "liquidity",
          titleEn: "Liquidity Ratios",
          title: "نسب السيولة",
          ratios: [
            { key: "currentRatio", labelEn: "Current Ratio", label: "نسبة التداول", value: currentRatio, fmt: "x", flag: classify(currentRatio, 1.5, 1.0, true),
              op: "div", numerator: v.totalCurrentAssets, denominator: v.totalCurrentLiabilities,
              formulaEn: "Total Current Assets ÷ Total Current Liabilities", formulaAr: "إجمالي الأصول المتداولة ÷ إجمالي الخصوم المتداولة" },
            { key: "quickRatio", labelEn: "Quick Ratio", label: "النسبة السريعة", value: quickRatio, fmt: "x", flag: classify(quickRatio, 1.0, 0.7, true),
              op: "div", numerator: v.totalCurrentAssets - v.inventory, denominator: v.totalCurrentLiabilities,
              formulaEn: "(Current Assets − Inventory) ÷ Current Liabilities", formulaAr: "(الأصول المتداولة - المخزون) ÷ الخصوم المتداولة" },
            { key: "cashRatio", labelEn: "Cash Ratio", label: "نسبة النقدية", value: cashRatio, fmt: "x", flag: classify(cashRatio, 0.2, 0.1, true),
              op: "div", numerator: v.cash, denominator: v.totalCurrentLiabilities,
              formulaEn: "Cash & Equivalents ÷ Total Current Liabilities", formulaAr: "النقدية وما في حكمها ÷ إجمالي الخصوم المتداولة" },
            { key: "workingCapital", labelEn: "Working Capital", label: "رأس المال العامل", value: workingCapital, fmt: "num", flag: workingCapital >= 0 ? "good" : "poor",
              op: "sub", numerator: v.totalCurrentAssets, denominator: v.totalCurrentLiabilities,
              formulaEn: "Total Current Assets − Total Current Liabilities", formulaAr: "إجمالي الأصول المتداولة - إجمالي الخصوم المتداولة" }
          ]
        },
        {
          key: "activity",
          titleEn: "Activity & Efficiency Ratios",
          title: "نسب النشاط والكفاءة",
          ratios: [
            { key: "inventoryTurnover", labelEn: "Inventory Turnover", label: "معدل دوران المخزون", value: inventoryTurnover, fmt: "x",
              op: "div", numerator: v.cogs, denominator: avgInventory,
              formulaEn: "COGS ÷ Average Inventory", formulaAr: "تكلفة المبيعات ÷ متوسط المخزون" },
            { key: "dio", labelEn: "Days Inventory Outstanding (DIO)", label: "متوسط فترة تخزين المخزون (DIO)", value: dio, fmt: "days",
              op: "divmul", numerator: avgInventory, denominator: v.cogs, multiplier: periodDays,
              formulaEn: "(Average Inventory ÷ COGS) × Period Days", formulaAr: "(متوسط المخزون ÷ تكلفة المبيعات) × أيام الفترة" },
            { key: "receivableTurnover", labelEn: "Receivables Turnover", label: "معدل دوران العملاء", value: receivableTurnover, fmt: "x",
              op: "div", numerator: v.revenue, denominator: avgAR,
              formulaEn: "Revenue ÷ Average Accounts Receivable", formulaAr: "الإيرادات ÷ متوسط العملاء" },
            { key: "dso", labelEn: "Days Sales Outstanding (DSO)", label: "متوسط فترة تحصيل العملاء (DSO)", value: dso, fmt: "days",
              op: "divmul", numerator: avgAR, denominator: v.revenue, multiplier: periodDays,
              formulaEn: "(Average Accounts Receivable ÷ Revenue) × Period Days", formulaAr: "(متوسط العملاء ÷ الإيرادات) × أيام الفترة" },
            { key: "payableTurnover", labelEn: "Payables Turnover", label: "معدل دوران الموردين", value: payableTurnover, fmt: "x",
              op: "div", numerator: v.cogs, denominator: avgAP,
              formulaEn: "COGS ÷ Average Accounts Payable", formulaAr: "تكلفة المبيعات ÷ متوسط الموردين" },
            { key: "dpo", labelEn: "Days Payable Outstanding (DPO)", label: "متوسط فترة سداد الموردين (DPO)", value: dpo, fmt: "days",
              op: "divmul", numerator: avgAP, denominator: v.cogs, multiplier: periodDays,
              formulaEn: "(Average Accounts Payable ÷ COGS) × Period Days", formulaAr: "(متوسط الموردين ÷ تكلفة المبيعات) × أيام الفترة" },
            { key: "assetTurnover", labelEn: "Asset Turnover", label: "معدل دوران الأصول", value: assetTurnover, fmt: "x",
              op: "div", numerator: v.revenue, denominator: avgAssets,
              formulaEn: "Revenue ÷ Average Total Assets", formulaAr: "الإيرادات ÷ متوسط إجمالي الأصول" }
          ]
        },
        {
          key: "profitability",
          titleEn: "Profitability Ratios",
          title: "نسب الربحية",
          ratios: [
            { key: "grossMargin", labelEn: "Gross Profit Margin", label: "هامش مجمل الربح", value: grossMargin, fmt: "pct", flag: classify(grossMargin, 0.30, 0.10, true),
              op: "div", numerator: v.grossProfit, denominator: v.revenue,
              formulaEn: "Gross Profit ÷ Revenue", formulaAr: "مجمل الربح ÷ الإيرادات" },
            { key: "operatingMargin", labelEn: "Operating Margin", label: "هامش الربح التشغيلي", value: operatingMargin, fmt: "pct", flag: classify(operatingMargin, 0.15, 0.05, true),
              op: "div", numerator: v.operatingIncome, denominator: v.revenue,
              formulaEn: "Operating Income (EBIT) ÷ Revenue", formulaAr: "الربح التشغيلي (EBIT) ÷ الإيرادات" },
            { key: "netMargin", labelEn: "Net Profit Margin", label: "هامش صافي الربح", value: netMargin, fmt: "pct", flag: classify(netMargin, 0.10, 0.0, true),
              op: "div", numerator: v.netIncome, denominator: v.revenue,
              formulaEn: "Net Income ÷ Revenue", formulaAr: "صافي الربح ÷ الإيرادات" },
            { key: "roa", labelEn: "Return on Assets (ROA)", label: "العائد على الأصول (ROA)", value: roa, fmt: "pct", flag: classify(roa, scaleAnnual(0.05), scaleAnnual(0.0), true),
              op: "div", numerator: v.netIncome, denominator: avgAssets,
              formulaEn: "Net Income ÷ Average Total Assets", formulaAr: "صافي الربح ÷ متوسط إجمالي الأصول" },
            { key: "roe", labelEn: "Return on Equity (ROE)", label: "العائد على حقوق الملكية (ROE)", value: roe, fmt: "pct", flag: classify(roe, scaleAnnual(0.15), scaleAnnual(0.0), true),
              op: "div", numerator: v.netIncome, denominator: avgEquity,
              formulaEn: "Net Income ÷ Average Total Equity", formulaAr: "صافي الربح ÷ متوسط إجمالي حقوق الملكية" }
          ]
        },
        {
          key: "leverage",
          titleEn: "Leverage & Solvency Ratios",
          title: "نسب المديونية والملاءة",
          ratios: [
            { key: "debtRatio", labelEn: "Total Debt to Assets", label: "نسبة إجمالي الدين إلى الأصول", value: debtRatio, fmt: "pct", flag: classify(debtRatio, 0.5, 0.7, false),
              op: "div", numerator: v.totalLiabilities, denominator: v.totalAssets,
              formulaEn: "Total Liabilities ÷ Total Assets", formulaAr: "إجمالي الخصوم ÷ إجمالي الأصول" },
            { key: "debtToEquity", labelEn: "Debt to Equity", label: "نسبة الدين إلى حقوق الملكية", value: debtToEquity, fmt: "x", flag: classify(debtToEquity, 1.0, 2.0, false),
              op: "div", numerator: v.totalLiabilities, denominator: v.totalEquity,
              formulaEn: "Total Liabilities ÷ Total Equity", formulaAr: "إجمالي الخصوم ÷ إجمالي حقوق الملكية" },
            { key: "equityRatio", labelEn: "Equity to Assets", label: "نسبة حقوق الملكية إلى الأصول", value: equityRatio, fmt: "pct",
              op: "div", numerator: v.totalEquity, denominator: v.totalAssets,
              formulaEn: "Total Equity ÷ Total Assets", formulaAr: "إجمالي حقوق الملكية ÷ إجمالي الأصول" },
            { key: "interestCoverage", labelEn: "Interest Coverage Ratio", label: "معدل تغطية الفوائد", value: interestCoverage, fmt: "x", flag: classify(interestCoverage, 4, 1.5, true),
              op: "div", numerator: v.operatingIncome, denominator: v.interestExpense,
              formulaEn: "Operating Income (EBIT) ÷ Interest Expense", formulaAr: "الربح التشغيلي (EBIT) ÷ مصروفات الفوائد" }
          ]
        },
        {
          key: "cashFlow",
          titleEn: "Cash Flow Ratios",
          title: "نسب التدفقات النقدية",
          ratios: [
            { key: "ocfRatio", labelEn: "Operating Cash Flow Ratio", label: "نسبة التدفق النقدي التشغيلي", value: ocfRatio, fmt: "x", flag: classify(ocfRatio, scaleAnnual(0.5), scaleAnnual(0.25), true),
              op: "div", numerator: v.operatingCashFlow, denominator: v.totalCurrentLiabilities,
              formulaEn: "Operating Cash Flow ÷ Total Current Liabilities", formulaAr: "التدفق النقدي التشغيلي ÷ إجمالي الخصوم المتداولة" },
            { key: "freeCashFlow", labelEn: "Free Cash Flow (FCF)", label: "التدفق النقدي الحر (FCF)", value: v.freeCashFlow, fmt: "num", flag: v.freeCashFlow >= 0 ? "good" : "poor",
              op: "sub", numerator: v.operatingCashFlow, denominator: v.capex,
              formulaEn: "Operating Cash Flow − CapEx", formulaAr: "التدفق النقدي التشغيلي - المصروفات الرأسمالية" },
            { key: "fcfMargin", labelEn: "FCF Margin", label: "هامش التدفق النقدي الحر", value: fcfMargin, fmt: "pct", flag: classify(fcfMargin, 0.10, 0.0, true),
              op: "div", numerator: v.freeCashFlow, denominator: v.revenue,
              formulaEn: "Free Cash Flow ÷ Revenue", formulaAr: "التدفق النقدي الحر ÷ الإيرادات" },
            { key: "cashFlowToDebt", labelEn: "Cash Flow to Debt", label: "التدفق النقدي إلى الدين", value: cashFlowToDebt, fmt: "pct", flag: classify(cashFlowToDebt, scaleAnnual(0.20), scaleAnnual(0.10), true),
              op: "div", numerator: v.operatingCashFlow, denominator: v.totalLiabilities,
              formulaEn: "Operating Cash Flow ÷ Total Liabilities", formulaAr: "التدفق النقدي التشغيلي ÷ إجمالي الخصوم" },
            { key: "ocfToNetIncome", labelEn: "OCF to Net Income (Earnings Quality)", label: "التدفق النقدي إلى صافي الربح (جودة الأرباح)", value: ocfToNetIncome, fmt: "x", flag: classify(ocfToNetIncome, 1.0, 0.7, true),
              op: "div", numerator: v.operatingCashFlow, denominator: v.netIncome,
              formulaEn: "Operating Cash Flow ÷ Net Income", formulaAr: "التدفق النقدي التشغيلي ÷ صافي الربح" }
          ]
        }
      ],
      ccc: { dio: dio, dso: dso, dpo: dpo, ccc: ccc }
    };
    return attachBenchmarks(result, periodDays);
  }

  function computeAllRatios() {
    var periods = FA.Store.getPeriods();
    return periods.map(function (p, idx) {
      return computeRatiosForPeriod(periods, idx);
    });
  }

  // ---------------------------------------------------------------------
  // التحليل الرأسي (Vertical Analysis)
  // ---------------------------------------------------------------------
  function computeVertical() {
    var periods = FA.Store.getPeriods();
    return periods.map(function (p) {
      var v = FA.Store.getComputedRow(p.id);
      var isRows = FA.itemDefs.incomeStatement.map(function (item) {
        return {
          key: item.key,
          label: item.label,
          labelEn: item.labelEn,
          value: v[item.key],
          pct: safeDiv(v[item.key], v.revenue)
        };
      });
      var bsRows = FA.itemDefs.balanceSheet.map(function (item) {
        return {
          key: item.key,
          label: item.label,
          labelEn: item.labelEn,
          value: v[item.key],
          pct: safeDiv(v[item.key], v.totalAssets)
        };
      });
      var cfRows = FA.itemDefs.cashFlow.map(function (item) {
        return {
          key: item.key,
          label: item.label,
          labelEn: item.labelEn,
          value: v[item.key],
          pct: safeDiv(v[item.key], v.revenue)
        };
      });
      return { periodId: p.id, periodLabel: p.label, periodMonths: p.periodMonths, incomeStatement: isRows, balanceSheet: bsRows, cashFlow: cfRows };
    });
  }

  // ---------------------------------------------------------------------
  // التحليل الأفقي (Horizontal Analysis)
  // ---------------------------------------------------------------------
  function computeHorizontal() {
    var periods = FA.Store.getPeriods();
    if (periods.length < 2) return { periods: periods, incomeStatement: [], balanceSheet: [], cashFlow: [] };

    var rows = periods.map(function (p) {
      return FA.Store.getComputedRow(p.id);
    });

    function buildFor(itemList) {
      return itemList.map(function (item) {
        var series = periods.map(function (p, idx) {
          var val = rows[idx][item.key];
          var prevVal = idx > 0 ? rows[idx - 1][item.key] : null;
          var changePct = idx > 0 ? safeDiv(val - prevVal, Math.abs(prevVal)) : null;
          var baseVal = rows[0][item.key];
          var indexVal = baseVal ? (val / baseVal) * 100 : null;
          return {
            periodId: p.id,
            periodLabel: p.label,
            value: val,
            changePct: changePct,
            index: indexVal
          };
        });
        return { key: item.key, label: item.label, labelEn: item.labelEn, series: series };
      });
    }

    return {
      periods: periods,
      incomeStatement: buildFor(FA.itemDefs.incomeStatement),
      balanceSheet: buildFor(FA.itemDefs.balanceSheet),
      cashFlow: buildFor(FA.itemDefs.cashFlow)
    };
  }

  FA.Analysis = {
    computeAllRatios: computeAllRatios,
    computeVertical: computeVertical,
    computeHorizontal: computeHorizontal,
    classify: classify,
    safeDiv: safeDiv
  };

  // ---------------------------------------------------------------------
  // تنسيق الأرقام والنسب للعرض
  // ---------------------------------------------------------------------
  function fmtNum(n, digits) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    // نستخدم أرقامًا غربية (0-9) لأنها الأكثر شيوعًا في العرض المالي حتى داخل واجهة عربية
    return n.toLocaleString("en-US", { maximumFractionDigits: digits === undefined ? 0 : digits, minimumFractionDigits: 0 });
  }

  function formatRatioValue(ratio) {
    if (ratio.value === null || ratio.value === undefined || isNaN(ratio.value)) return "—";
    switch (ratio.fmt) {
      case "pct":
        return fmtNum(ratio.value * 100, 1) + "%";
      case "x":
        return fmtNum(ratio.value, 2) + "×";
      case "days":
        return fmtNum(ratio.value, 0) + " d";
      default:
        return fmtNum(ratio.value, 0);
    }
  }

  function formatOperand(value, fmt) {
    if (value === null || value === undefined || isNaN(value)) return "—";
    if (fmt === "x") return fmtNum(value, 2) + "×";
    return fmtNum(value, 0);
  }

  function formatOperands(ratio) {
    if (ratio.numerator === undefined || ratio.denominator === undefined) return "";
    var a = formatOperand(ratio.numerator, ratio.numFmt);
    var b = formatOperand(ratio.denominator, ratio.denFmt);
    if (ratio.op === "divmul") {
      var c = formatOperand(ratio.multiplier, ratio.mulFmt);
      return "(" + a + " ÷ " + b + ") × " + c;
    }
    var opSign = ratio.op === "sub" ? "−" : "÷";
    return a + " " + opSign + " " + b;
  }

  function formatBenchmark(ratio) {
    if (ratio.benchmarkAdj === undefined || ratio.benchmarkAdj === null) return "";
    var sign = ratio.benchmarkDir === "gte" ? "≥" : ratio.benchmarkDir === "lte" ? "≤" : "~";
    return sign + formatRatioValue({ value: ratio.benchmarkAdj, fmt: ratio.fmt });
  }

  FA.format = {
    num: fmtNum,
    ratio: formatRatioValue,
    operands: formatOperands,
    benchmark: formatBenchmark
  };
})(window.FA);

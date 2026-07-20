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
  // النسب المالية
  // ---------------------------------------------------------------------
  function computeRatiosForPeriod(periods, idx) {
    var period = periods[idx];
    var v = FA.Store.getComputedRow(period.id);
    var prevRow = idx > 0 ? FA.Store.getComputedRow(periods[idx - 1].id) : null;

    var avgInventory = avg(v, prevRow, "inventory");
    var avgAR = avg(v, prevRow, "accountsReceivable");
    var avgAP = avg(v, prevRow, "accountsPayable");
    var avgAssets = avg(v, prevRow, "totalAssets");
    var avgEquity = avg(v, prevRow, "totalEquity");

    var inventoryTurnover = safeDiv(v.cogs, avgInventory);
    var receivableTurnover = safeDiv(v.revenue, avgAR);
    var payableTurnover = safeDiv(v.cogs, avgAP);

    var dio = inventoryTurnover ? 365 / inventoryTurnover : null;
    var dso = receivableTurnover ? 365 / receivableTurnover : null;
    var dpo = payableTurnover ? 365 / payableTurnover : null;
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

    return {
      periodId: period.id,
      periodLabel: period.label,
      groups: [
        {
          key: "liquidity",
          title: "نسب السيولة",
          ratios: [
            { key: "currentRatio", label: "نسبة التداول", value: currentRatio, fmt: "x", flag: classify(currentRatio, 1.5, 1.0, true) },
            { key: "quickRatio", label: "النسبة السريعة", value: quickRatio, fmt: "x", flag: classify(quickRatio, 1.0, 0.7, true) },
            { key: "cashRatio", label: "نسبة النقدية", value: cashRatio, fmt: "x", flag: classify(cashRatio, 0.2, 0.1, true) },
            { key: "workingCapital", label: "رأس المال العامل", value: workingCapital, fmt: "num", flag: workingCapital >= 0 ? "good" : "poor" }
          ]
        },
        {
          key: "activity",
          title: "نسب النشاط والكفاءة",
          ratios: [
            { key: "inventoryTurnover", label: "معدل دوران المخزون", value: inventoryTurnover, fmt: "x" },
            { key: "dio", label: "متوسط فترة تخزين المخزون (DIO)", value: dio, fmt: "days" },
            { key: "receivableTurnover", label: "معدل دوران العملاء", value: receivableTurnover, fmt: "x" },
            { key: "dso", label: "متوسط فترة تحصيل العملاء (DSO)", value: dso, fmt: "days" },
            { key: "payableTurnover", label: "معدل دوران الموردين", value: payableTurnover, fmt: "x" },
            { key: "dpo", label: "متوسط فترة سداد الموردين (DPO)", value: dpo, fmt: "days" },
            { key: "assetTurnover", label: "معدل دوران الأصول", value: assetTurnover, fmt: "x" }
          ]
        },
        {
          key: "profitability",
          title: "نسب الربحية",
          ratios: [
            { key: "grossMargin", label: "هامش مجمل الربح", value: grossMargin, fmt: "pct", flag: classify(grossMargin, 0.30, 0.10, true) },
            { key: "operatingMargin", label: "هامش الربح التشغيلي", value: operatingMargin, fmt: "pct", flag: classify(operatingMargin, 0.15, 0.05, true) },
            { key: "netMargin", label: "هامش صافي الربح", value: netMargin, fmt: "pct", flag: classify(netMargin, 0.10, 0.0, true) },
            { key: "roa", label: "العائد على الأصول (ROA)", value: roa, fmt: "pct", flag: classify(roa, 0.05, 0.0, true) },
            { key: "roe", label: "العائد على حقوق الملكية (ROE)", value: roe, fmt: "pct", flag: classify(roe, 0.15, 0.0, true) }
          ]
        },
        {
          key: "leverage",
          title: "نسب المديونية والملاءة",
          ratios: [
            { key: "debtRatio", label: "نسبة إجمالي الدين إلى الأصول", value: debtRatio, fmt: "pct", flag: classify(debtRatio, 0.5, 0.7, false) },
            { key: "debtToEquity", label: "نسبة الدين إلى حقوق الملكية", value: debtToEquity, fmt: "x", flag: classify(debtToEquity, 1.0, 2.0, false) },
            { key: "equityRatio", label: "نسبة حقوق الملكية إلى الأصول", value: equityRatio, fmt: "pct" },
            { key: "interestCoverage", label: "معدل تغطية الفوائد", value: interestCoverage, fmt: "x", flag: classify(interestCoverage, 4, 1.5, true) }
          ]
        }
      ],
      ccc: { dio: dio, dso: dso, dpo: dpo, ccc: ccc }
    };
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
          value: v[item.key],
          pct: safeDiv(v[item.key], v.revenue)
        };
      });
      var bsRows = FA.itemDefs.balanceSheet.map(function (item) {
        return {
          key: item.key,
          label: item.label,
          value: v[item.key],
          pct: safeDiv(v[item.key], v.totalAssets)
        };
      });
      return { periodId: p.id, periodLabel: p.label, incomeStatement: isRows, balanceSheet: bsRows };
    });
  }

  // ---------------------------------------------------------------------
  // التحليل الأفقي (Horizontal Analysis)
  // ---------------------------------------------------------------------
  function computeHorizontal() {
    var periods = FA.Store.getPeriods();
    if (periods.length < 2) return { periods: periods, incomeStatement: [], balanceSheet: [] };

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
        return { key: item.key, label: item.label, series: series };
      });
    }

    return {
      periods: periods,
      incomeStatement: buildFor(FA.itemDefs.incomeStatement),
      balanceSheet: buildFor(FA.itemDefs.balanceSheet)
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
        return fmtNum(ratio.value, 0) + " يوم";
      default:
        return fmtNum(ratio.value, 0);
    }
  }

  FA.format = {
    num: fmtNum,
    ratio: formatRatioValue
  };
})(window.FA);

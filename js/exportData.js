/* exportData.js
 * تصدير النتائج إلى ملف إكسيل حقيقي متعدد الشيتات عبر SheetJS (vendor/xlsx.full.min.js)
 */
window.FA = window.FA || {};

(function (FA) {
  "use strict";

  var bi = FA.util.biStr;

  function nz(v) {
    return v === null || v === undefined ? "" : v;
  }

  function buildDataSheet(periods) {
    var rows = [["Item / البند"].concat(periods.map(function (p) { return p.label; }))];

    function addSection(title, items) {
      rows.push([title]);
      items.forEach(function (item) {
        var row = [bi(item.labelEn, item.label)];
        periods.forEach(function (p) {
          row.push(FA.Store.getComputedRow(p.id)[item.key]);
        });
        rows.push(row);
      });
    }

    addSection("Income Statement / قائمة الدخل", FA.itemDefs.incomeStatement);
    addSection("Balance Sheet / قائمة المركز المالي", FA.itemDefs.balanceSheet);
    addSection("Cash Flow Statement / قائمة التدفقات النقدية", FA.itemDefs.cashFlow);
    return XLSX.utils.aoa_to_sheet(rows);
  }

  function buildRatiosSheet(allRatios) {
    var rows = [["Ratio / النسبة"].concat(allRatios.map(function (r) { return r.periodLabel; }))];
    allRatios[0].groups.forEach(function (group, gIdx) {
      rows.push([bi(group.titleEn, group.title)]);
      group.ratios.forEach(function (ratioTemplate, rIdx) {
        var row = [bi(ratioTemplate.labelEn, ratioTemplate.label)];
        allRatios.forEach(function (periodResult) {
          row.push(nz(periodResult.groups[gIdx].ratios[rIdx].value));
        });
        rows.push(row);
      });
    });
    return XLSX.utils.aoa_to_sheet(rows);
  }

  function buildVerticalSheet(vertical) {
    var rows = [["Item / البند"].concat(vertical.map(function (v) { return v.periodLabel; }))];

    function addSection(title, key) {
      rows.push([title]);
      vertical[0][key].forEach(function (rowTemplate, idx) {
        var row = [bi(rowTemplate.labelEn, rowTemplate.label)];
        vertical.forEach(function (v) { row.push(nz(v[key][idx].pct)); });
        rows.push(row);
      });
    }

    addSection("Income Statement (% of Revenue)", "incomeStatement");
    addSection("Balance Sheet (% of Total Assets)", "balanceSheet");
    addSection("Cash Flow Statement (% of Revenue)", "cashFlow");
    return XLSX.utils.aoa_to_sheet(rows);
  }

  function buildHorizontalSheet(horizontal) {
    if (!horizontal.periods || horizontal.periods.length < 2) {
      return XLSX.utils.aoa_to_sheet([["Horizontal analysis needs at least two periods. / التحليل الأفقي يحتاج فترتين على الأقل."]]);
    }
    var rows = [["Item / البند"].concat(horizontal.periods.map(function (p) { return p.label; }))];

    function addSection(title, list) {
      rows.push([title]);
      list.forEach(function (item) {
        var row = [bi(item.labelEn, item.label)];
        item.series.forEach(function (s) { row.push(nz(s.value)); });
        rows.push(row);
      });
    }

    addSection("Income Statement", horizontal.incomeStatement);
    addSection("Balance Sheet", horizontal.balanceSheet);
    addSection("Cash Flow Statement", horizontal.cashFlow);
    return XLSX.utils.aoa_to_sheet(rows);
  }

  function buildCCCSheet(allRatios) {
    var rows = [["Indicator / المؤشر"].concat(allRatios.map(function (r) { return r.periodLabel; }))];
    [
      { key: "dio", en: "DIO - Days Inventory Outstanding", ar: "فترة تخزين المخزون" },
      { key: "dso", en: "DSO - Days Sales Outstanding", ar: "فترة تحصيل العملاء" },
      { key: "dpo", en: "DPO - Days Payable Outstanding", ar: "فترة سداد الموردين" },
      { key: "ccc", en: "CCC - Cash Conversion Cycle", ar: "دورة التحويل النقدي" }
    ].forEach(function (r) {
      var row = [bi(r.en, r.ar)];
      allRatios.forEach(function (ar) { row.push(nz(ar.ccc[r.key])); });
      rows.push(row);
    });
    return XLSX.utils.aoa_to_sheet(rows);
  }

  function buildSummarySheet(narrative) {
    var rows = [["Summary & Opinion / الخلاصة والرأي الفني"]];
    if (!narrative) {
      rows.push(["Not enough data. / لا توجد بيانات كافية."]);
      return XLSX.utils.aoa_to_sheet(rows);
    }
    rows.push([narrative.ratingText.en + " - " + narrative.ratingText.ar]);
    rows.push([]);
    narrative.summaryParagraphs.forEach(function (p) {
      rows.push([p.en]);
      rows.push([p.ar]);
      rows.push([]);
    });
    rows.push(["Strengths / نقاط القوة"]);
    narrative.strengths.forEach(function (s) { rows.push([s.en]); rows.push([s.ar]); });
    rows.push([]);
    rows.push(["Weaknesses / نقاط الضعف"]);
    narrative.weaknesses.forEach(function (s) { rows.push([s.en]); rows.push([s.ar]); });
    return XLSX.utils.aoa_to_sheet(rows);
  }

  function toExcel() {
    if (typeof XLSX === "undefined") {
      alert("Excel export library not loaded. / مكتبة تصدير الإكسيل لم يتم تحميلها.");
      return;
    }
    var periods = FA.Store.getPeriods();
    if (periods.length === 0) {
      alert("No data to export. / لا توجد بيانات للتصدير.");
      return;
    }

    var allRatios = FA.Analysis.computeAllRatios();
    var vertical = FA.Analysis.computeVertical();
    var horizontal = FA.Analysis.computeHorizontal();
    var narrative = FA.Narrative.generate();

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildDataSheet(periods), "Financial Data");
    XLSX.utils.book_append_sheet(wb, buildRatiosSheet(allRatios), "Ratios");
    XLSX.utils.book_append_sheet(wb, buildVerticalSheet(vertical), "Vertical Analysis");
    XLSX.utils.book_append_sheet(wb, buildHorizontalSheet(horizontal), "Horizontal Analysis");
    XLSX.utils.book_append_sheet(wb, buildCCCSheet(allRatios), "CCC");
    XLSX.utils.book_append_sheet(wb, buildSummarySheet(narrative), "Summary");

    var company = FA.Companies.getActive();
    var companyName = company ? company.name.replace(/[^a-zA-Z0-9_\-]+/g, "_") : "company";
    var dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, "financial-analysis-" + companyName + "-" + dateStr + ".xlsx");
  }

  FA.Export = { toExcel: toExcel };
})(window.FA);

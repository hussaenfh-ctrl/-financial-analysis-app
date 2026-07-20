/* app.js - ربط الواجهة، التنقل بين التبويبات، الجدول اليدوي، وعرض نتائج التحليل
 * الواجهة إنجليزية أساسية مع ترجمة عربية أصغر تحت كل نص
 */
window.FA = window.FA || {};

(function (FA) {
  "use strict";

  var fmtNum = FA.format.num;
  var fmtRatio = FA.format.ratio;
  var bi = FA.util.biStr;
  var biEl = FA.util.biEl;

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") e.className = attrs[k];
        else if (k === "text") e.textContent = attrs[k];
        else if (k === "html") e.innerHTML = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function biTh(en, ar) {
    return el("th", { class: "label-cell" }, [biEl("span", en, ar)]);
  }
  function biH(tag, en, ar, cls) {
    return el(tag, cls ? { class: cls } : null, [biEl("span", en, ar)]);
  }

  // =========================================================================
  // التنقل بين التبويبات
  // =========================================================================
  function initTabs() {
    var buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
        var panel = document.getElementById("tab-" + btn.dataset.tab);
        if (panel) panel.classList.add("active");
        renderTab(btn.dataset.tab);
      });
    });
  }

  function initEntryModeSwitch() {
    var manualBtn = document.getElementById("modeManualBtn");
    var excelBtn = document.getElementById("modeExcelBtn");
    manualBtn.addEventListener("click", function () {
      manualBtn.classList.add("active");
      excelBtn.classList.remove("active");
      document.getElementById("manualEntryMode").classList.add("active");
      document.getElementById("excelEntryMode").classList.remove("active");
    });
    excelBtn.addEventListener("click", function () {
      excelBtn.classList.add("active");
      manualBtn.classList.remove("active");
      document.getElementById("excelEntryMode").classList.add("active");
      document.getElementById("manualEntryMode").classList.remove("active");
    });
  }

  function renderTab(tabKey) {
    switch (tabKey) {
      case "ratios": renderRatiosTab(); break;
      case "vertical": renderVerticalTab(); break;
      case "horizontal": renderHorizontalTab(); break;
      case "ccc": renderCCCTab(); break;
      case "summary": renderSummaryTab(); break;
    }
  }

  function emptyState(container, en, ar) {
    container.innerHTML = "";
    container.appendChild(el("div", { class: "empty-state" }, [biEl("div", en, ar)]));
  }

  var NO_DATA_MSG = { en: "Enter data first from the \"Data Entry\" tab.", ar: "أدخل بيانات أولاً من تبويب \"إدخال البيانات\"." };

  // =========================================================================
  // الجدول اليدوي
  // =========================================================================
  var SECTION_HEADERS = {
    cash: { en: "Current Assets", ar: "الأصول المتداولة" },
    netFixedAssets: { en: "Non-Current Assets", ar: "الأصول غير المتداولة" },
    accountsPayable: { en: "Current Liabilities", ar: "الخصوم المتداولة" },
    longTermDebt: { en: "Non-Current Liabilities", ar: "الخصوم غير المتداولة" },
    shareCapital: { en: "Equity", ar: "حقوق الملكية" }
  };

  function renderManualTable() {
    var table = document.getElementById("manualTable");
    var periods = FA.Store.getPeriods();
    table.innerHTML = "";

    if (periods.length === 0) {
      var tr0 = el("tr", null, [el("td", null, [biEl("span", "No periods yet. Click \"+ Add Period / Year\" or load sample data.", "لا توجد فترات بعد. اضغط \"+ إضافة فترة / سنة\" أو حمّل بيانات تجريبية.")])]);
      table.appendChild(tr0);
      updateBalanceStatus();
      return;
    }

    // صف الرأس
    var headRow = el("tr");
    headRow.appendChild(biTh("Item", "البند"));
    periods.forEach(function (p) {
      var th = el("th");
      var input = el("input", { type: "text", class: "period-name-input", value: p.label });
      input.value = p.label;
      input.addEventListener("change", function () {
        FA.Store.renamePeriod(p.id, input.value.trim() || p.label);
      });
      var removeBtn = el("button", { type: "button", class: "btn-small btn-danger remove-period-btn" }, [biEl("span", "Remove", "حذف الفترة")]);
      removeBtn.addEventListener("click", function () {
        if (confirm("Delete period \"" + p.label + "\"? / حذف فترة \"" + p.label + "\"؟")) {
          FA.Store.removePeriod(p.id);
          renderManualTable();
        }
      });
      th.appendChild(input);
      th.appendChild(removeBtn);
      headRow.appendChild(th);
    });
    table.appendChild(headRow);

    function addSectionHeaderIfNeeded(key) {
      if (SECTION_HEADERS[key]) {
        var tr = el("tr", { class: "section-row" });
        var td = el("td", null, [biEl("span", SECTION_HEADERS[key].en, SECTION_HEADERS[key].ar)]);
        td.colSpan = periods.length + 1;
        tr.appendChild(td);
        table.appendChild(tr);
      }
    }

    function buildItemRow(item) {
      addSectionHeaderIfNeeded(item.key);
      var tr = el("tr", { class: item.computed ? "computed-row" : "" });
      tr.appendChild(el("td", { class: "label-cell" }, [biEl("span", item.labelEn, item.label)]));
      periods.forEach(function (p) {
        var td = el("td");
        if (item.computed) {
          td.classList.add("computed-value");
          td.dataset.periodId = p.id;
          td.dataset.key = item.key;
          td.textContent = fmtNum(FA.Store.getComputedRow(p.id)[item.key]);
        } else {
          var input = el("input", { type: "number", step: "any" });
          input.value = FA.Store.getRawValue(p.id, item.key);
          input.addEventListener("input", function () {
            FA.Store.setValue(p.id, item.key, input.value === "" ? "" : parseFloat(input.value));
            refreshComputedCells();
            updateBalanceStatus();
          });
          td.appendChild(input);
        }
        tr.appendChild(td);
      });
      table.appendChild(tr);
    }

    var isHeader = el("tr", { class: "section-row" });
    var isHeaderTd = el("td", null, [biEl("span", "Income Statement", "قائمة الدخل")]);
    isHeaderTd.colSpan = periods.length + 1;
    isHeader.appendChild(isHeaderTd);
    table.appendChild(isHeader);
    FA.itemDefs.incomeStatement.forEach(buildItemRow);

    var bsHeader = el("tr", { class: "section-row" });
    var bsHeaderTd = el("td", null, [biEl("span", "Balance Sheet", "قائمة المركز المالي")]);
    bsHeaderTd.colSpan = periods.length + 1;
    bsHeader.appendChild(bsHeaderTd);
    table.appendChild(bsHeader);
    FA.itemDefs.balanceSheet.forEach(buildItemRow);

    updateBalanceStatus();
  }

  function refreshComputedCells() {
    var cells = document.querySelectorAll("#manualTable .computed-value");
    cells.forEach(function (td) {
      var row = FA.Store.getComputedRow(td.dataset.periodId);
      td.textContent = fmtNum(row[td.dataset.key]);
    });
  }

  function updateBalanceStatus() {
    var elx = document.getElementById("balanceStatus");
    var periods = FA.Store.getPeriods();
    elx.innerHTML = "";
    if (periods.length === 0) { elx.className = "balance-status"; return; }
    var unbalanced = periods.filter(function (p) { return !FA.Store.validateBalance(p.id).balanced; });
    if (unbalanced.length === 0) {
      elx.appendChild(biEl("span", "✓ Total Assets = Total Liabilities + Equity in all periods", "✓ إجمالي الأصول = إجمالي الخصوم وحقوق الملكية في كل الفترات"));
      elx.className = "balance-status ok";
    } else {
      var labels = unbalanced.map(function (p) { return p.label; }).join(", ");
      elx.appendChild(biEl("span", "⚠ Imbalance in period(s): " + labels, "⚠ عدم توازن في فترات: " + labels));
      elx.className = "balance-status bad";
    }
  }

  // =========================================================================
  // تبويب النسب المالية
  // =========================================================================
  function renderRatiosTab() {
    var container = document.getElementById("ratiosContent");
    var periods = FA.Store.getPeriods();
    if (periods.length === 0) { emptyState(container, NO_DATA_MSG.en, NO_DATA_MSG.ar); return; }

    var allRatios = FA.Analysis.computeAllRatios();
    container.innerHTML = "";

    allRatios[0].groups.forEach(function (groupTemplate, gIdx) {
      container.appendChild(biH("h3", groupTemplate.titleEn, groupTemplate.title, "ratio-group-title"));
      var table = el("table", { class: "ratio-table" });
      var head = el("tr");
      head.appendChild(biTh("Ratio", "النسبة"));
      allRatios.forEach(function (r) { head.appendChild(el("th", { text: r.periodLabel })); });
      table.appendChild(head);

      groupTemplate.ratios.forEach(function (ratioTemplate, rIdx) {
        var tr = el("tr");
        tr.appendChild(el("td", { class: "label-cell" }, [biEl("span", ratioTemplate.labelEn, ratioTemplate.label)]));
        allRatios.forEach(function (periodResult) {
          var r = periodResult.groups[gIdx].ratios[rIdx];
          var td = el("td", { text: fmtRatio(r) });
          if (r.flag) td.classList.add("flag-" + r.flag);
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      container.appendChild(table);
    });
  }

  // =========================================================================
  // تبويب التحليل الرأسي
  // =========================================================================
  function renderVerticalTab() {
    var container = document.getElementById("verticalContent");
    var periods = FA.Store.getPeriods();
    if (periods.length === 0) { emptyState(container, NO_DATA_MSG.en, NO_DATA_MSG.ar); return; }

    var vertical = FA.Analysis.computeVertical();
    container.innerHTML = "";

    function buildTable(en, ar, key) {
      container.appendChild(biH("h3", en, ar));
      var table = el("table");
      var head = el("tr");
      head.appendChild(biTh("Item", "البند"));
      vertical.forEach(function (v) { head.appendChild(el("th", { text: v.periodLabel })); });
      table.appendChild(head);

      var rowDefs = vertical[0][key];
      rowDefs.forEach(function (rowTemplate, idx) {
        var tr = el("tr");
        tr.appendChild(el("td", { class: "label-cell" }, [biEl("span", rowTemplate.labelEn, rowTemplate.label)]));
        vertical.forEach(function (v) {
          var row = v[key][idx];
          var pctTxt = row.pct !== null ? " (" + fmtNum(row.pct * 100, 1) + "%)" : "";
          tr.appendChild(el("td", { text: fmtNum(row.value) + pctTxt }));
        });
        table.appendChild(tr);
      });
      container.appendChild(table);
    }

    buildTable("Income Statement (% of Revenue)", "قائمة الدخل (كنسبة من الإيرادات)", "incomeStatement");
    buildTable("Balance Sheet (% of Total Assets)", "قائمة المركز المالي (كنسبة من إجمالي الأصول)", "balanceSheet");

    var chartCard = el("div", { class: "chart-card" }, [
      biH("h4", "Asset Composition Over Periods (%)", "تكوين الأصول عبر الفترات (%)"),
      el("div", { class: "chart-wrap" }, [el("canvas", { id: "verticalChartCanvas" })])
    ]);
    container.appendChild(chartCard);
    FA.Charts.renderVerticalChart("verticalChartCanvas", vertical);
  }

  // =========================================================================
  // تبويب التحليل الأفقي
  // =========================================================================
  function renderHorizontalTab() {
    var container = document.getElementById("horizontalContent");
    var periods = FA.Store.getPeriods();
    if (periods.length === 0) { emptyState(container, NO_DATA_MSG.en, NO_DATA_MSG.ar); return; }
    if (periods.length < 2) { emptyState(container, "Horizontal analysis needs at least two periods to compare.", "التحليل الأفقي يحتاج فترتين على الأقل للمقارنة."); return; }

    var horizontal = FA.Analysis.computeHorizontal();
    container.innerHTML = "";

    function buildTable(en, ar, list) {
      container.appendChild(biH("h3", en, ar));
      var table = el("table");
      var head = el("tr");
      head.appendChild(biTh("Item", "البند"));
      horizontal.periods.forEach(function (p) { head.appendChild(el("th", { text: p.label })); });
      table.appendChild(head);

      list.forEach(function (item) {
        var tr = el("tr");
        tr.appendChild(el("td", { class: "label-cell" }, [biEl("span", item.labelEn, item.label)]));
        item.series.forEach(function (s, idx) {
          var txt = fmtNum(s.value);
          if (idx > 0 && s.changePct !== null) {
            var sign = s.changePct >= 0 ? "+" : "";
            txt += " (" + sign + fmtNum(s.changePct * 100, 1) + "%)";
          }
          tr.appendChild(el("td", { text: txt }));
        });
        table.appendChild(tr);
      });
      container.appendChild(table);
    }

    buildTable("Income Statement - Change Over Periods", "قائمة الدخل - التغير عبر الفترات", horizontal.incomeStatement);
    buildTable("Balance Sheet - Change Over Periods", "قائمة المركز المالي - التغير عبر الفترات", horizontal.balanceSheet);

    var chartCard = el("div", { class: "chart-card" }, [
      biH("h4", "Index (base = 100) for Revenue, Net Income & Total Assets", "الرقم القياسي (أساس = 100) للإيرادات وصافي الربح وإجمالي الأصول"),
      el("div", { class: "chart-wrap" }, [el("canvas", { id: "horizontalChartCanvas" })])
    ]);
    container.appendChild(chartCard);
    FA.Charts.renderHorizontalChart("horizontalChartCanvas", horizontal);
  }

  // =========================================================================
  // تبويب دورة CCC
  // =========================================================================
  function renderCCCTab() {
    var container = document.getElementById("cccContent");
    var periods = FA.Store.getPeriods();
    if (periods.length === 0) { emptyState(container, NO_DATA_MSG.en, NO_DATA_MSG.ar); return; }

    var allRatios = FA.Analysis.computeAllRatios();
    container.innerHTML = "";

    // ---- الرسم الدائري لدورة النقدية (فترة واحدة مختارة) ----
    var circleCard = el("div", { class: "chart-card" });
    circleCard.appendChild(biH("h4", "Cash Flow Through the Cycle", "دورة تدفق النقدية"));
    var selectRow = el("div", { class: "ccc-period-select-row" });
    selectRow.appendChild(biEl("span", "Period:", "الفترة:"));
    var periodSelect = el("select", { id: "cccPeriodSelect" });
    allRatios.forEach(function (r, idx) {
      var opt = el("option", { value: r.periodId, text: r.periodLabel });
      if (idx === allRatios.length - 1) opt.selected = true;
      periodSelect.appendChild(opt);
    });
    selectRow.appendChild(periodSelect);
    circleCard.appendChild(selectRow);
    var circleContainer = el("div", { id: "cccCircleContainer" });
    circleCard.appendChild(circleContainer);
    container.appendChild(circleCard);

    function renderCircleFor(periodId) {
      var r = allRatios.find(function (x) { return x.periodId === periodId; });
      if (r) FA.Charts.renderCCCCircle("cccCircleContainer", r);
    }
    periodSelect.addEventListener("change", function () { renderCircleFor(periodSelect.value); });
    renderCircleFor(allRatios[allRatios.length - 1].periodId);

    // ---- الجدول التفصيلي وخط الاتجاه عبر كل الفترات ----
    container.appendChild(el("p", { class: "hint" }, [biEl("span",
      "Cash Conversion Cycle (CCC) = Days Inventory Outstanding (DIO) + Days Sales Outstanding (DSO) − Days Payable Outstanding (DPO)",
      "دورة التحويل النقدي (CCC) = فترة تخزين المخزون (DIO) + فترة تحصيل العملاء (DSO) - فترة سداد الموردين (DPO)"
    )]));

    var table = el("table");
    var head = el("tr", null, [biTh("Indicator", "المؤشر")]);
    allRatios.forEach(function (r) { head.appendChild(el("th", { text: r.periodLabel })); });
    table.appendChild(head);

    [
      { key: "dio", en: "Days Inventory Outstanding (DIO)", ar: "فترة تخزين المخزون (DIO)" },
      { key: "dso", en: "Days Sales Outstanding (DSO)", ar: "فترة تحصيل العملاء (DSO)" },
      { key: "dpo", en: "Days Payable Outstanding (DPO)", ar: "فترة سداد الموردين (DPO)" },
      { key: "ccc", en: "Cash Conversion Cycle (CCC)", ar: "دورة التحويل النقدي (CCC)" }
    ].forEach(function (row) {
      var tr = el("tr", row.key === "ccc" ? { class: "computed-row" } : null);
      tr.appendChild(el("td", { class: "label-cell" }, [biEl("span", row.en, row.ar)]));
      allRatios.forEach(function (r) {
        var v = r.ccc[row.key];
        tr.appendChild(el("td", { text: v !== null ? fmtNum(v, 0) + " d" : "—" }));
      });
      table.appendChild(tr);
    });
    container.appendChild(table);

    var chartCard = el("div", { class: "chart-card" }, [
      biH("h4", "CCC Trend Over Periods", "اتجاه دورة التحويل النقدي عبر الفترات"),
      el("div", { class: "chart-wrap" }, [el("canvas", { id: "cccChartCanvas" })])
    ]);
    container.appendChild(chartCard);
    FA.Charts.renderCCCChart("cccChartCanvas", allRatios);
  }

  // =========================================================================
  // تبويب الخلاصة والرأي الفني
  // =========================================================================
  function renderSummaryTab() {
    var container = document.getElementById("summaryContent");
    var periods = FA.Store.getPeriods();
    if (periods.length === 0) { emptyState(container, NO_DATA_MSG.en, NO_DATA_MSG.ar); return; }

    var result = FA.Narrative.generate();
    container.innerHTML = "";
    if (!result) { emptyState(container, "Not enough data to generate a summary.", "لا توجد بيانات كافية لإنشاء الخلاصة."); return; }

    container.appendChild(el("div", { class: "rating-badge " + result.rating }, [
      biEl("span", result.ratingText.en + " - Period " + result.periodLabel, result.ratingText.ar + " - فترة " + result.periodLabel)
    ]));

    var summaryDiv = el("div", { class: "summary-paragraphs" });
    result.summaryParagraphs.forEach(function (p) {
      summaryDiv.appendChild(el("p", null, [biEl("span", p.en, p.ar)]));
    });
    container.appendChild(summaryDiv);

    var swColumns = el("div", { class: "sw-columns" });
    var strengthsCol = el("div", { class: "sw-col strengths" }, [biH("h4", "Strengths", "نقاط القوة")]);
    var strengthsList = el("ul");
    var strengthItems = result.strengths.length ? result.strengths : [{ en: "No notable strengths under the general benchmarks used.", ar: "لا توجد نقاط قوة بارزة حسب المعايير العامة المستخدمة." }];
    strengthItems.forEach(function (s) {
      strengthsList.appendChild(el("li", null, [biEl("span", s.en, s.ar)]));
    });
    strengthsCol.appendChild(strengthsList);

    var weaknessesCol = el("div", { class: "sw-col weaknesses" }, [biH("h4", "Weaknesses", "نقاط الضعف")]);
    var weaknessesList = el("ul");
    var weaknessItems = result.weaknesses.length ? result.weaknesses : [{ en: "No notable weaknesses under the general benchmarks used.", ar: "لا توجد نقاط ضعف بارزة حسب المعايير العامة المستخدمة." }];
    weaknessItems.forEach(function (s) {
      weaknessesList.appendChild(el("li", null, [biEl("span", s.en, s.ar)]));
    });
    weaknessesCol.appendChild(weaknessesList);

    swColumns.appendChild(strengthsCol);
    swColumns.appendChild(weaknessesCol);
    container.appendChild(swColumns);

    if (result.watchPoints.length) {
      var watchDiv = el("div", { class: "watch-list" }, [biH("h4", "Points to Watch", "نقاط تحتاج متابعة")]);
      var watchList = el("ul");
      result.watchPoints.forEach(function (s) { watchList.appendChild(el("li", null, [biEl("span", s.en, s.ar)])); });
      watchDiv.appendChild(watchList);
      container.appendChild(watchDiv);
    }
  }

  // =========================================================================
  // رفع ملف إكسيل
  // =========================================================================
  function initExcelUpload() {
    var input = document.getElementById("excelFileInput");
    var status = document.getElementById("excelStatus");
    var mappingContainer = document.getElementById("excelMappingContainer");

    input.addEventListener("change", function () {
      var file = input.files[0];
      if (!file) return;
      status.textContent = bi("Reading file...", "جاري قراءة الملف...");
      status.className = "mapping-status";
      FA.ExcelImport.parseFile(file).then(function (workbook) {
        status.textContent = "";
        mappingContainer.innerHTML = "";
        var sheetNames = workbook.SheetNames;
        var sheetSelectWrap = el("div", { class: "mapping-section" });
        sheetSelectWrap.appendChild(biH("h4", "Select Sheet", "اختر الورقة (Sheet)"));
        var sheetSelect = el("select");
        sheetNames.forEach(function (name) { sheetSelect.appendChild(el("option", { value: name, text: name })); });
        sheetSelectWrap.appendChild(sheetSelect);
        mappingContainer.appendChild(sheetSelectWrap);

        var uiContainer = el("div");
        mappingContainer.appendChild(uiContainer);

        function loadSheet() {
          var rows = FA.ExcelImport.getSheetRows(workbook, sheetSelect.value);
          FA.ExcelImport.renderMappingUI(uiContainer, rows, function () {
            renderManualTable();
            document.getElementById("modeManualBtn").click();
          });
        }
        sheetSelect.addEventListener("change", loadSheet);
        loadSheet();
      }).catch(function (err) {
        status.textContent = bi("Error: " + err.message, "خطأ: " + err.message);
        status.className = "mapping-status error";
      });
    });
  }

  // =========================================================================
  // أزرار عامة
  // =========================================================================
  function initGlobalButtons() {
    document.getElementById("btnSample").addEventListener("click", function () {
      FA.Store.loadSample();
      renderManualTable();
      renderTab(document.querySelector(".tab-btn.active").dataset.tab);
    });
    document.getElementById("btnPrint").addEventListener("click", function () {
      renderTab("ratios"); renderTab("vertical"); renderTab("horizontal"); renderTab("ccc"); renderTab("summary");
      window.print();
    });
    document.getElementById("btnReset").addEventListener("click", function () {
      if (confirm("Clear all entered data? This cannot be undone. / هل تريد مسح كل البيانات المدخلة؟ لا يمكن التراجع عن هذا الإجراء.")) {
        FA.Store.reset();
        renderManualTable();
        renderTab(document.querySelector(".tab-btn.active").dataset.tab);
      }
    });
    document.getElementById("btnAddPeriod").addEventListener("click", function () {
      var periods = FA.Store.getPeriods();
      var nextYear = new Date().getFullYear();
      if (periods.length) {
        var lastLabel = parseInt(periods[periods.length - 1].label, 10);
        if (!isNaN(lastLabel)) nextYear = lastLabel + 1;
      }
      FA.Store.addPeriod(String(nextYear));
      renderManualTable();
    });
  }

  // =========================================================================
  // التهيئة
  // =========================================================================
  document.addEventListener("DOMContentLoaded", function () {
    FA.Store.load();
    initTabs();
    initEntryModeSwitch();
    initExcelUpload();
    initGlobalButtons();
    renderManualTable();
  });
})(window.FA);

/* excelImport.js
 * قراءة أي ملف Excel/CSV عبر SheetJS + واجهة مطابقة يدوية للصفوف والأعمدة
 */
window.FA = window.FA || {};

(function (FA) {
  "use strict";

  // مرادفات شائعة (عربي/إنجليزي) لكل بند - تُستخدم للاقتراح التلقائي فقط
  var SYNONYMS = {
    revenue: ["revenue", "sales", "net sales", "turnover", "الإيرادات", "ايرادات", "المبيعات", "صافي المبيعات"],
    cogs: ["cost of goods sold", "cogs", "cost of sales", "تكلفة المبيعات", "تكلفة البضاعة المباعة"],
    opex: ["operating expenses", "sg&a", "selling and admin", "المصاريف التشغيلية", "مصاريف بيع وتوزيع", "مصاريف إدارية"],
    depreciation: ["depreciation", "amortization", "الإهلاك", "الاستهلاك"],
    interestExpense: ["interest expense", "finance cost", "مصروفات الفوائد", "أعباء تمويلية", "تكلفة التمويل"],
    otherIncomeExpense: ["other income", "other expense", "إيرادات أخرى", "مصروفات أخرى"],
    incomeTax: ["income tax", "tax expense", "ضريبة الدخل", "الضريبة"],
    cash: ["cash", "cash and equivalents", "النقدية", "النقد وما في حكمه"],
    accountsReceivable: ["accounts receivable", "trade receivables", "debtors", "العملاء", "ذمم مدينة", "المدينون"],
    inventory: ["inventory", "stock", "المخزون", "بضاعة اخر المدة", "مخزون بضاعة"],
    otherCurrentAssets: ["other current assets", "أصول متداولة أخرى"],
    netFixedAssets: ["fixed assets", "property plant and equipment", "ppe", "الأصول الثابتة", "الممتلكات والمعدات"],
    otherNonCurrentAssets: ["other non-current assets", "أصول غير متداولة أخرى"],
    accountsPayable: ["accounts payable", "trade payables", "creditors", "الموردون", "ذمم دائنة", "الدائنون"],
    shortTermDebt: ["short term debt", "short-term loans", "قروض قصيرة الأجل"],
    otherCurrentLiabilities: ["other current liabilities", "خصوم متداولة أخرى"],
    longTermDebt: ["long term debt", "long-term loans", "قروض طويلة الأجل"],
    otherNonCurrentLiabilities: ["other non-current liabilities", "خصوم غير متداولة أخرى"],
    shareCapital: ["share capital", "capital stock", "رأس المال"],
    retainedEarnings: ["retained earnings", "الأرباح المحتجزة"],
    otherEquity: ["other equity", "reserves", "حقوق ملكية أخرى", "احتياطيات"],
    operatingCashFlow: ["net cash from operating activities", "operating cash flow", "cash from operations", "صافي النقدية من الأنشطة التشغيلية", "التدفقات النقدية من الأنشطة التشغيلية"],
    capex: ["capital expenditures", "capex", "purchase of fixed assets", "purchase of property plant and equipment", "المصروفات الرأسمالية", "شراء أصول ثابتة"],
    investingCashFlowOther: ["investing activities", "net cash from investing activities", "الأنشطة الاستثمارية", "صافي النقدية من الأنشطة الاستثمارية"],
    financingCashFlow: ["financing activities", "net cash from financing activities", "الأنشطة التمويلية", "صافي النقدية من الأنشطة التمويلية"]
  };

  function normalize(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseNumber(raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return raw;
    var s = String(raw).trim();
    if (!s) return null;
    var negative = /^\(.*\)$/.test(s);
    s = s.replace(/[()]/g, "").replace(/[,٬\s]/g, "").replace(/[^\d.\-]/g, "");
    if (!s) return null;
    var n = parseFloat(s);
    if (isNaN(n)) return null;
    return negative ? -Math.abs(n) : n;
  }

  // ---------------------------------------------------------------------
  // قراءة الملف
  // ---------------------------------------------------------------------
  function parseFile(file) {
    return new Promise(function (resolve, reject) {
      if (typeof XLSX === "undefined") {
        reject(new Error("مكتبة قراءة الإكسيل (SheetJS) لم يتم تحميلها. تأكد من الاتصال بالإنترنت."));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = new Uint8Array(e.target.result);
          var workbook = XLSX.read(data, { type: "array" });
          resolve(workbook);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () {
        reject(new Error("تعذرت قراءة الملف."));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function getSheetRows(workbook, sheetName) {
    var sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    return rows;
  }

  function rowLabel(row) {
    for (var i = 0; i < row.length; i++) {
      if (row[i] !== "" && row[i] !== null && row[i] !== undefined) {
        return String(row[i]).trim();
      }
    }
    return "(صف فارغ)";
  }

  // ---------------------------------------------------------------------
  // اقتراح تلقائي لمطابقة الصفوف مع بنودنا
  // ---------------------------------------------------------------------
  function suggestMapping(rows) {
    var suggestions = {};
    var usedRows = {};
    var normalizedLabels = rows.map(function (row) {
      return normalize(rowLabel(row));
    });

    Object.keys(SYNONYMS).forEach(function (key) {
      var terms = SYNONYMS[key].map(normalize);
      var bestIdx = -1;
      for (var i = 0; i < normalizedLabels.length; i++) {
        if (usedRows[i]) continue; // كل صف يُقترح لبند واحد فقط لتفادي التعارض
        var label = normalizedLabels[i];
        if (!label) continue;
        for (var t = 0; t < terms.length; t++) {
          if (terms[t] && label.indexOf(terms[t]) !== -1) {
            bestIdx = i;
            break;
          }
        }
        if (bestIdx !== -1) break;
      }
      if (bestIdx !== -1) usedRows[bestIdx] = true;
      suggestions[key] = bestIdx;
    });
    return suggestions;
  }

  // ---------------------------------------------------------------------
  // بناء واجهة المطابقة
  // ---------------------------------------------------------------------
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") e.className = attrs[k];
        else if (k === "text") e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c) e.appendChild(c);
    });
    return e;
  }

  function renderMappingUI(container, rows, onApply) {
    container.innerHTML = "";
    var bi = FA.util.biStr;
    var suggestions = suggestMapping(rows);
    var maxCols = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);

    // ---- معاينة الملف ----
    var previewWrap = el("div", { class: "excel-preview-wrap" });
    var table = el("table", { class: "excel-preview" });
    var previewRowCount = Math.min(rows.length, 15);
    for (var r = 0; r < previewRowCount; r++) {
      var tr = el("tr");
      tr.appendChild(el("td", { class: "row-index", text: String(r + 1) }));
      for (var c = 0; c < Math.min(maxCols, 10); c++) {
        tr.appendChild(el("td", { text: rows[r][c] !== undefined ? String(rows[r][c]) : "" }));
      }
      table.appendChild(tr);
    }
    previewWrap.appendChild(table);
    if (rows.length > previewRowCount) {
      previewWrap.appendChild(el("p", { class: "hint", text: bi((rows.length - previewRowCount) + " more row(s) in the file...", "ويوجد " + (rows.length - previewRowCount) + " صف إضافي في الملف") }));
    }

    // ---- تحديد أعمدة الفترات ----
    var periodsSection = el("div", { class: "mapping-section" });
    periodsSection.appendChild(el("h4", null, [FA.util.biEl("span", "Step 1: Select the period (year) columns", "الخطوة 1: حدد أعمدة الفترات (السنوات)")]));
    periodsSection.appendChild(el("p", { class: "hint", text: bi("Choose which column represents each period/year, and name it.", "اختر رقم كل عمود يمثل فترة/سنة، وسمّها.") }));
    var periodRowsContainer = el("div", { class: "period-rows" });
    var periodEntries = [];

    function addPeriodRow(defaultCol) {
      var idx = periodEntries.length;
      var colSelect = el("select", { class: "col-select" });
      colSelect.appendChild(el("option", { value: "-1", text: bi("-- Select a column --", "اختر عمود") }));
      for (var c = 0; c < maxCols; c++) {
        var headerGuess = rows[0] && rows[0][c] !== undefined ? String(rows[0][c]) : "";
        colSelect.appendChild(el("option", { value: String(c), text: bi("Column " + (c + 1), "عمود " + (c + 1)) + (headerGuess ? " (" + headerGuess + ")" : "") }));
      }
      if (defaultCol !== undefined && defaultCol >= 0) colSelect.value = String(defaultCol);

      var labelInput = el("input", { type: "text", class: "period-label-input", placeholder: "e.g. 2024" });
      var headerVal = defaultCol !== undefined && rows[0] ? rows[0][defaultCol] : "";
      labelInput.value = headerVal ? String(headerVal) : ("Period " + (idx + 1));

      var monthsInput = el("input", { type: "number", class: "period-months-input", min: "1", max: "36", step: "1", title: "Months covered / عدد الشهور" });
      monthsInput.value = "12";

      var removeBtn = el("button", { type: "button", class: "btn-small btn-danger remove-period-btn", text: bi("Remove", "حذف") });
      var row = el("div", { class: "period-row" }, [colSelect, labelInput, FA.util.biEl("span", "Months:", "شهور:", "period-months-label"), monthsInput, removeBtn]);
      removeBtn.addEventListener("click", function () {
        row.remove();
        periodEntries = periodEntries.filter(function (pe) { return pe.row !== row; });
      });

      periodEntries.push({ row: row, colSelect: colSelect, labelInput: labelInput, monthsInput: monthsInput });
      periodRowsContainer.appendChild(row);
    }

    // اقتراح مبدئي: كل الأعمدة من 1 لآخر عمود فيه بيانات رقمية باستثناء العمود الأول (عادة أسماء البنود)
    var suggestedCols = [];
    for (var c = 1; c < maxCols && suggestedCols.length < 6; c++) {
      var hasNumbers = rows.some(function (row) { return parseNumber(row[c]) !== null; });
      if (hasNumbers) suggestedCols.push(c);
    }
    if (suggestedCols.length === 0) suggestedCols = [1];
    suggestedCols.forEach(function (c) { addPeriodRow(c); });

    var addPeriodBtn = el("button", { type: "button", class: "btn-small", text: bi("+ Add period column", "+ إضافة عمود فترة") });
    addPeriodBtn.addEventListener("click", function () { addPeriodRow(); });

    periodsSection.appendChild(periodRowsContainer);
    periodsSection.appendChild(addPeriodBtn);

    // ---- مطابقة بنود القوائم المالية ----
    var itemsSection = el("div", { class: "mapping-section" });
    itemsSection.appendChild(el("h4", null, [FA.util.biEl("span", "Step 2: Match line items to file rows", "الخطوة 2: طابق بنود القوائم المالية بصفوف الملف")]));
    itemsSection.appendChild(el("p", { class: "hint", text: bi("The closest match was suggested automatically where possible - review and adjust as needed.", "تم اقتراح أقرب تطابق تلقائيًا حيث أمكن - راجع وعدّل حسب الحاجة.") }));

    var itemSelects = {};

    function buildItemRow(item) {
      var select = el("select", { class: "row-select", "data-key": item.key });
      select.appendChild(el("option", { value: "-1", text: bi("-- No match (treated as zero) --", "بدون مطابقة (يعتبر صفر)") }));
      rows.forEach(function (row, idx) {
        var label = rowLabel(row);
        select.appendChild(el("option", { value: String(idx), text: bi("Row " + (idx + 1), "صف " + (idx + 1)) + ": " + label.substring(0, 40) }));
      });
      var suggIdx = suggestions[item.key];
      if (suggIdx !== undefined && suggIdx >= 0) select.value = String(suggIdx);
      itemSelects[item.key] = select;
      return el("div", { class: "item-map-row" }, [
        FA.util.biEl("span", item.labelEn, item.label, "item-map-label"),
        select
      ]);
    }

    var isGroup = el("div", { class: "item-group" });
    isGroup.appendChild(el("h5", null, [FA.util.biEl("span", "Income Statement", "قائمة الدخل")]));
    FA.itemDefs.incomeStatement.filter(function (i) { return i.editable; }).forEach(function (item) {
      isGroup.appendChild(buildItemRow(item));
    });

    var bsGroup = el("div", { class: "item-group" });
    bsGroup.appendChild(el("h5", null, [FA.util.biEl("span", "Balance Sheet", "قائمة المركز المالي")]));
    FA.itemDefs.balanceSheet.filter(function (i) { return i.editable; }).forEach(function (item) {
      bsGroup.appendChild(buildItemRow(item));
    });

    var cfGroup = el("div", { class: "item-group" });
    cfGroup.appendChild(el("h5", null, [FA.util.biEl("span", "Cash Flow Statement", "قائمة التدفقات النقدية")]));
    FA.itemDefs.cashFlow.filter(function (i) { return i.editable; }).forEach(function (item) {
      cfGroup.appendChild(buildItemRow(item));
    });

    itemsSection.appendChild(isGroup);
    itemsSection.appendChild(bsGroup);
    itemsSection.appendChild(cfGroup);

    // ---- زر التأكيد ----
    var applyBtn = el("button", { type: "button", class: "btn btn-primary", text: bi("Apply Mapping & Import Data", "تطبيق المطابقة واستيراد البيانات") });
    var statusMsg = el("div", { class: "mapping-status" });

    applyBtn.addEventListener("click", function () {
      var periodsConfig = periodEntries
        .map(function (pe) {
          return {
            col: parseInt(pe.colSelect.value, 10),
            label: pe.labelInput.value.trim() || "Period",
            months: parseFloat(pe.monthsInput.value) || 12
          };
        })
        .filter(function (p) { return p.col >= 0; });

      if (periodsConfig.length === 0) {
        statusMsg.textContent = bi("Please select at least one period column.", "من فضلك اختر عمود فترة واحد على الأقل.");
        statusMsg.className = "mapping-status error";
        return;
      }

      var itemMapping = {};
      Object.keys(itemSelects).forEach(function (key) {
        var v = parseInt(itemSelects[key].value, 10);
        itemMapping[key] = v;
      });

      var result = applyMapping(rows, periodsConfig, itemMapping);
      statusMsg.textContent = bi(
        "Imported " + result.periodsCreated + " period(s) successfully. You can review and edit the values in the Manual Entry tab.",
        "تم استيراد " + result.periodsCreated + " فترة بنجاح. يمكنك مراجعة القيم وتعديلها في تبويب الإدخال اليدوي."
      );
      statusMsg.className = "mapping-status success";
      if (onApply) onApply(result);
    });

    container.appendChild(el("h3", null, [FA.util.biEl("span", "File Preview", "معاينة الملف")]));
    container.appendChild(previewWrap);
    container.appendChild(periodsSection);
    container.appendChild(itemsSection);
    container.appendChild(applyBtn);
    container.appendChild(statusMsg);
  }

  function applyMapping(rows, periodsConfig, itemMapping) {
    var periodIds = periodsConfig.map(function (p) {
      return { id: FA.Store.addPeriod(p.label, p.months), col: p.col };
    });

    periodIds.forEach(function (p) {
      Object.keys(itemMapping).forEach(function (key) {
        var rowIdx = itemMapping[key];
        var value = rowIdx >= 0 && rows[rowIdx] ? parseNumber(rows[rowIdx][p.col]) : null;
        FA.Store.setValue(p.id, key, value === null ? "" : value);
      });
    });

    return { periodsCreated: periodIds.length };
  }

  FA.ExcelImport = {
    parseFile: parseFile,
    getSheetRows: getSheetRows,
    renderMappingUI: renderMappingUI,
    parseNumber: parseNumber
  };
})(window.FA);

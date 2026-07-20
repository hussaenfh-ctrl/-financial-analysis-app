/* dataModel.js
 * تعريف بنود القوائم المالية القياسية + إدارة الفترات + التخزين المحلي
 * لا يعتمد على أي مكتبة خارجية - نطاق عام واحد FA
 */
window.FA = window.FA || {};

(function (FA) {
  "use strict";

  var STORAGE_KEY = "fa_financial_data_v1";

  // ---------------------------------------------------------------------
  // تعريف بنود قائمة الدخل
  // ---------------------------------------------------------------------
  var incomeStatement = [
    { key: "revenue", label: "الإيرادات", editable: true },
    { key: "cogs", label: "تكلفة المبيعات", editable: true },
    { key: "grossProfit", label: "مجمل الربح", computed: true },
    { key: "opex", label: "المصاريف التشغيلية (بيع وإدارة وعمومية)", editable: true },
    { key: "depreciation", label: "الإهلاك والاستهلاك", editable: true },
    { key: "operatingIncome", label: "الربح التشغيلي (EBIT)", computed: true },
    { key: "interestExpense", label: "مصروفات الفوائد", editable: true },
    { key: "otherIncomeExpense", label: "إيرادات / (مصروفات) أخرى", editable: true },
    { key: "incomeTax", label: "ضريبة الدخل", editable: true },
    { key: "netIncome", label: "صافي الربح", computed: true }
  ];

  // ---------------------------------------------------------------------
  // تعريف بنود قائمة المركز المالي
  // ---------------------------------------------------------------------
  var balanceSheet = [
    // الأصول المتداولة
    { key: "cash", label: "النقدية وما في حكمها", editable: true, section: "currentAssets" },
    { key: "accountsReceivable", label: "العملاء (ذمم مدينة)", editable: true, section: "currentAssets" },
    { key: "inventory", label: "المخزون", editable: true, section: "currentAssets" },
    { key: "otherCurrentAssets", label: "أصول متداولة أخرى", editable: true, section: "currentAssets" },
    { key: "totalCurrentAssets", label: "إجمالي الأصول المتداولة", computed: true, section: "currentAssets" },
    // الأصول غير المتداولة
    { key: "netFixedAssets", label: "الأصول الثابتة (صافي)", editable: true, section: "nonCurrentAssets" },
    { key: "otherNonCurrentAssets", label: "أصول غير متداولة أخرى", editable: true, section: "nonCurrentAssets" },
    { key: "totalAssets", label: "إجمالي الأصول", computed: true, section: "totals" },
    // الخصوم المتداولة
    { key: "accountsPayable", label: "الموردون (ذمم دائنة)", editable: true, section: "currentLiabilities" },
    { key: "shortTermDebt", label: "قروض قصيرة الأجل", editable: true, section: "currentLiabilities" },
    { key: "otherCurrentLiabilities", label: "خصوم متداولة أخرى", editable: true, section: "currentLiabilities" },
    { key: "totalCurrentLiabilities", label: "إجمالي الخصوم المتداولة", computed: true, section: "currentLiabilities" },
    // الخصوم غير المتداولة
    { key: "longTermDebt", label: "قروض طويلة الأجل", editable: true, section: "nonCurrentLiabilities" },
    { key: "otherNonCurrentLiabilities", label: "خصوم غير متداولة أخرى", editable: true, section: "nonCurrentLiabilities" },
    { key: "totalLiabilities", label: "إجمالي الخصوم", computed: true, section: "totals" },
    // حقوق الملكية
    { key: "shareCapital", label: "رأس المال", editable: true, section: "equity" },
    { key: "retainedEarnings", label: "الأرباح المحتجزة", editable: true, section: "equity" },
    { key: "otherEquity", label: "حقوق ملكية أخرى", editable: true, section: "equity" },
    { key: "totalEquity", label: "إجمالي حقوق الملكية", computed: true, section: "totals" }
  ];

  FA.itemDefs = {
    incomeStatement: incomeStatement,
    balanceSheet: balanceSheet
  };

  FA.allItems = incomeStatement.concat(balanceSheet);

  FA.itemByKey = {};
  FA.allItems.forEach(function (it) {
    FA.itemByKey[it.key] = it;
  });

  // ---------------------------------------------------------------------
  // صيغ الحساب للبنود المشتقة (بالترتيب الصحيح للاعتمادية)
  // ---------------------------------------------------------------------
  var COMPUTE_ORDER = [
    "grossProfit",
    "operatingIncome",
    "netIncome",
    "totalCurrentAssets",
    "totalAssets",
    "totalCurrentLiabilities",
    "totalLiabilities",
    "totalEquity"
  ];

  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  var FORMULAS = {
    grossProfit: function (v) {
      return num(v.revenue) - num(v.cogs);
    },
    operatingIncome: function (v) {
      return num(v.grossProfit) - num(v.opex) - num(v.depreciation);
    },
    netIncome: function (v) {
      return num(v.operatingIncome) - num(v.interestExpense) + num(v.otherIncomeExpense) - num(v.incomeTax);
    },
    totalCurrentAssets: function (v) {
      return num(v.cash) + num(v.accountsReceivable) + num(v.inventory) + num(v.otherCurrentAssets);
    },
    totalAssets: function (v) {
      return num(v.totalCurrentAssets) + num(v.netFixedAssets) + num(v.otherNonCurrentAssets);
    },
    totalCurrentLiabilities: function (v) {
      return num(v.accountsPayable) + num(v.shortTermDebt) + num(v.otherCurrentLiabilities);
    },
    totalLiabilities: function (v) {
      return num(v.totalCurrentLiabilities) + num(v.longTermDebt) + num(v.otherNonCurrentLiabilities);
    },
    totalEquity: function (v) {
      return num(v.shareCapital) + num(v.retainedEarnings) + num(v.otherEquity);
    }
  };

  // ---------------------------------------------------------------------
  // Store: إدارة الفترات والقيم والتخزين المحلي
  // ---------------------------------------------------------------------
  var state = {
    periods: [], // [{id, label}]
    values: {}, // { periodId: { itemKey: number } }
    nextId: 1
  };

  function emptyValuesRow() {
    var row = {};
    FA.allItems.forEach(function (it) {
      row[it.key] = it.editable ? "" : 0;
    });
    return row;
  }

  var Store = {
    getState: function () {
      return state;
    },

    getPeriods: function () {
      return state.periods.slice();
    },

    addPeriod: function (label) {
      var id = "p" + state.nextId++;
      state.periods.push({ id: id, label: label || ("سنة " + state.periods.length + 1) });
      state.values[id] = emptyValuesRow();
      Store.save();
      return id;
    },

    removePeriod: function (id) {
      state.periods = state.periods.filter(function (p) {
        return p.id !== id;
      });
      delete state.values[id];
      Store.save();
    },

    renamePeriod: function (id, label) {
      var p = state.periods.find(function (p) {
        return p.id === id;
      });
      if (p) p.label = label;
      Store.save();
    },

    reorderPeriods: function (orderedIds) {
      var map = {};
      state.periods.forEach(function (p) {
        map[p.id] = p;
      });
      state.periods = orderedIds.map(function (id) {
        return map[id];
      }).filter(Boolean);
      Store.save();
    },

    setValue: function (periodId, key, value) {
      if (!state.values[periodId]) state.values[periodId] = emptyValuesRow();
      state.values[periodId][key] = value;
      Store.save();
    },

    getRawValue: function (periodId, key) {
      var row = state.values[periodId];
      return row ? row[key] : "";
    },

    // يرجع كل القيم بعد حساب البنود المشتقة لفترة معينة
    getComputedRow: function (periodId) {
      var raw = state.values[periodId] || emptyValuesRow();
      var v = {};
      Object.keys(raw).forEach(function (k) {
        v[k] = num(raw[k]);
      });
      COMPUTE_ORDER.forEach(function (key) {
        v[key] = FORMULAS[key](v);
      });
      return v;
    },

    getAllComputedRows: function () {
      var out = {};
      state.periods.forEach(function (p) {
        out[p.id] = Store.getComputedRow(p.id);
      });
      return out;
    },

    validateBalance: function (periodId) {
      var v = Store.getComputedRow(periodId);
      var diff = v.totalAssets - (v.totalLiabilities + v.totalEquity);
      var tolerance = Math.max(1, Math.abs(v.totalAssets) * 0.001); // سماحية 0.1%
      return {
        balanced: Math.abs(diff) <= tolerance,
        diff: diff,
        totalAssets: v.totalAssets,
        totalLiabPlusEquity: v.totalLiabilities + v.totalEquity
      };
    },

    reset: function () {
      state.periods = [];
      state.values = {};
      state.nextId = 1;
      Store.save();
    },

    loadSample: function () {
      if (!FA.sampleData) return;
      Store.reset();
      FA.sampleData.periods.forEach(function (period) {
        var id = Store.addPeriod(period.label);
        Object.keys(period.values).forEach(function (k) {
          state.values[id][k] = period.values[k];
        });
      });
      Store.save();
    },

    save: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        /* localStorage قد يكون غير متاح - نتجاهل بصمت */
      }
    },

    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && parsed.periods) {
            state = parsed;
            return true;
          }
        }
      } catch (e) {
        /* تجاهل بيانات تالفة */
      }
      return false;
    },

    exportJSON: function () {
      return JSON.stringify(state, null, 2);
    },

    importJSON: function (jsonStr) {
      var parsed = JSON.parse(jsonStr);
      if (parsed && parsed.periods && parsed.values) {
        state = parsed;
        Store.save();
        return true;
      }
      return false;
    }
  };

  FA.Store = Store;
  FA.util = { num: num };
})(window.FA);

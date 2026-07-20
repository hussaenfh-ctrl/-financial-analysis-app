/* charts.js
 * الرسوم البيانية عبر Chart.js - التحليل الرأسي / الأفقي / دورة CCC
 * الألوان مأخوذة من لوحة ألوان معتمدة (ترتيب ثابت، تباين آمن لعمى الألوان)
 */
window.FA = window.FA || {};

(function (FA) {
  "use strict";

  var PALETTE = ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a", "#eb6834", "#4a3aa7", "#e34948"];
  var INK = "#0b0b0b";
  var MUTED = "#898781";
  var GRID = "#e1e0d9";

  var instances = {};

  function destroy(canvasId) {
    if (instances[canvasId]) {
      instances[canvasId].destroy();
      delete instances[canvasId];
    }
  }

  function baseOptions(extra) {
    var opts = {
      responsive: true,
      maintainAspectRatio: false,
      color: INK,
      plugins: {
        legend: {
          labels: { color: INK, font: { family: "system-ui, -apple-system, 'Segoe UI', sans-serif" } }
        },
        tooltip: { rtl: true, titleAlign: "right", bodyAlign: "right" }
      },
      scales: {
        x: { ticks: { color: MUTED }, grid: { color: GRID } },
        y: { ticks: { color: MUTED }, grid: { color: GRID } }
      }
    };
    return Object.assign(opts, extra || {});
  }

  // ---------------------------------------------------------------------
  // رسم التحليل الرأسي: تكوين الأصول كنسبة مئوية من إجمالي الأصول
  // ---------------------------------------------------------------------
  function renderVerticalChart(canvasId, verticalData) {
    destroy(canvasId);
    if (typeof Chart === "undefined" || !verticalData.length) return;

    var itemsToShow = [
      { key: "cash", label: "النقدية" },
      { key: "accountsReceivable", label: "العملاء" },
      { key: "inventory", label: "المخزون" },
      { key: "otherCurrentAssets", label: "أصول متداولة أخرى" },
      { key: "netFixedAssets", label: "أصول ثابتة" },
      { key: "otherNonCurrentAssets", label: "أصول غير متداولة أخرى" }
    ];

    var labels = verticalData.map(function (d) { return d.periodLabel; });
    var datasets = itemsToShow.map(function (item, i) {
      return {
        label: item.label,
        data: verticalData.map(function (d) {
          var row = d.balanceSheet.find(function (r) { return r.key === item.key; });
          return row && row.pct !== null ? +(row.pct * 100).toFixed(1) : 0;
        }),
        backgroundColor: PALETTE[i],
        borderWidth: 0
      };
    });

    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: "bar",
      data: { labels: labels, datasets: datasets },
      options: baseOptions({
        scales: {
          x: { stacked: true, ticks: { color: MUTED }, grid: { display: false } },
          y: { stacked: true, ticks: { color: MUTED, callback: function (v) { return v + "%"; } }, grid: { color: GRID }, max: 100 }
        }
      })
    });
  }

  // ---------------------------------------------------------------------
  // رسم التحليل الأفقي: الرقم القياسي (أساس = 100) لأهم البنود عبر الفترات
  // ---------------------------------------------------------------------
  function renderHorizontalChart(canvasId, horizontalData) {
    destroy(canvasId);
    if (typeof Chart === "undefined" || !horizontalData.periods || horizontalData.periods.length < 2) return;

    var keyItems = [
      { key: "revenue", label: "الإيرادات", list: horizontalData.incomeStatement },
      { key: "netIncome", label: "صافي الربح", list: horizontalData.incomeStatement },
      { key: "totalAssets", label: "إجمالي الأصول", list: horizontalData.balanceSheet }
    ];

    var labels = horizontalData.periods.map(function (p) { return p.label; });
    var datasets = keyItems.map(function (item, i) {
      var found = item.list.find(function (r) { return r.key === item.key; });
      var data = found ? found.series.map(function (s) { return s.index !== null ? +s.index.toFixed(1) : null; }) : [];
      return {
        label: item.label,
        data: data,
        borderColor: PALETTE[i],
        backgroundColor: PALETTE[i],
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.15,
        fill: false
      };
    });

    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: "line",
      data: { labels: labels, datasets: datasets },
      options: baseOptions({
        scales: {
          x: { ticks: { color: MUTED }, grid: { display: false } },
          y: { ticks: { color: MUTED, callback: function (v) { return v; } }, grid: { color: GRID } }
        }
      })
    });
  }

  // ---------------------------------------------------------------------
  // رسم دورة التحويل النقدي CCC: DIO / DSO / DPO لكل فترة + خط CCC الصافي
  // ---------------------------------------------------------------------
  function renderCCCChart(canvasId, allRatios) {
    destroy(canvasId);
    if (typeof Chart === "undefined" || !allRatios.length) return;

    var labels = allRatios.map(function (r) { return r.periodLabel; });
    var dio = allRatios.map(function (r) { return r.ccc.dio !== null ? +r.ccc.dio.toFixed(1) : 0; });
    var dso = allRatios.map(function (r) { return r.ccc.dso !== null ? +r.ccc.dso.toFixed(1) : 0; });
    var dpo = allRatios.map(function (r) { return r.ccc.dpo !== null ? +(-r.ccc.dpo).toFixed(1) : 0; });
    var ccc = allRatios.map(function (r) { return r.ccc.ccc !== null ? +r.ccc.ccc.toFixed(1) : null; });

    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      data: {
        labels: labels,
        datasets: [
          { type: "bar", label: "فترة تخزين المخزون (DIO)", data: dio, backgroundColor: PALETTE[0], stack: "s" },
          { type: "bar", label: "فترة تحصيل العملاء (DSO)", data: dso, backgroundColor: PALETTE[4], stack: "s" },
          { type: "bar", label: "فترة سداد الموردين (DPO -)", data: dpo, backgroundColor: PALETTE[5], stack: "s" },
          { type: "line", label: "صافي دورة التحويل النقدي (CCC)", data: ccc, borderColor: PALETTE[7], backgroundColor: PALETTE[7], borderWidth: 2, pointRadius: 4, tension: 0.15 }
        ]
      },
      options: baseOptions({
        scales: {
          x: { stacked: true, ticks: { color: MUTED }, grid: { display: false } },
          y: { stacked: true, ticks: { color: MUTED, callback: function (v) { return v + " يوم"; } }, grid: { color: GRID } }
        }
      })
    });
  }

  FA.Charts = {
    renderVerticalChart: renderVerticalChart,
    renderHorizontalChart: renderHorizontalChart,
    renderCCCChart: renderCCCChart,
    destroy: destroy
  };
})(window.FA);

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
      { key: "cash", label: "Cash", labelAr: "النقدية" },
      { key: "accountsReceivable", label: "Receivables", labelAr: "العملاء" },
      { key: "inventory", label: "Inventory", labelAr: "المخزون" },
      { key: "otherCurrentAssets", label: "Other Current Assets", labelAr: "أصول متداولة أخرى" },
      { key: "netFixedAssets", label: "Fixed Assets", labelAr: "أصول ثابتة" },
      { key: "otherNonCurrentAssets", label: "Other Non-Current Assets", labelAr: "أصول غير متداولة أخرى" }
    ];

    var labels = verticalData.map(function (d) { return d.periodLabel; });
    var datasets = itemsToShow.map(function (item, i) {
      return {
        label: FA.util.biStr(item.label, item.labelAr),
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
      { key: "revenue", label: "Revenue", labelAr: "الإيرادات", list: horizontalData.incomeStatement },
      { key: "netIncome", label: "Net Income", labelAr: "صافي الربح", list: horizontalData.incomeStatement },
      { key: "totalAssets", label: "Total Assets", labelAr: "إجمالي الأصول", list: horizontalData.balanceSheet }
    ];

    var labels = horizontalData.periods.map(function (p) { return p.label; });
    var datasets = keyItems.map(function (item, i) {
      var found = item.list.find(function (r) { return r.key === item.key; });
      var data = found ? found.series.map(function (s) { return s.index !== null ? +s.index.toFixed(1) : null; }) : [];
      return {
        label: FA.util.biStr(item.label, item.labelAr),
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
          { type: "bar", label: FA.util.biStr("Days Inventory Outstanding (DIO)", "فترة تخزين المخزون"), data: dio, backgroundColor: PALETTE[0], stack: "s" },
          { type: "bar", label: FA.util.biStr("Days Sales Outstanding (DSO)", "فترة تحصيل العملاء"), data: dso, backgroundColor: PALETTE[4], stack: "s" },
          { type: "bar", label: FA.util.biStr("Days Payable Outstanding (DPO -)", "فترة سداد الموردين"), data: dpo, backgroundColor: PALETTE[5], stack: "s" },
          { type: "line", label: FA.util.biStr("Net Cash Conversion Cycle (CCC)", "صافي دورة التحويل النقدي"), data: ccc, borderColor: PALETTE[7], backgroundColor: PALETTE[7], borderWidth: 2, pointRadius: 4, tension: 0.15 }
        ]
      },
      options: baseOptions({
        scales: {
          x: { stacked: true, ticks: { color: MUTED }, grid: { display: false } },
          y: { stacked: true, ticks: { color: MUTED, callback: function (v) { return v + "d"; } }, grid: { color: GRID } }
        }
      })
    });
  }

  // =========================================================================
  // دورة CCC كشكل دائري مع أسهم توضح اتجاه دوران النقدية
  // =========================================================================
  function polarToCartesian(cx, cy, r, angleDeg) {
    var rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(cx, cy, r, startAngle, endAngle) {
    var s = Math.max(0.001, Math.min(359.999, startAngle));
    var e = Math.max(0.001, Math.min(359.999, endAngle));
    if (e <= s) e = s + 0.001;
    var startPt = polarToCartesian(cx, cy, r, s);
    var endPt = polarToCartesian(cx, cy, r, e);
    var largeArc = (e - s) > 180 ? 1 : 0;
    return "M " + startPt.x.toFixed(2) + " " + startPt.y.toFixed(2) + " A " + r + " " + r + " 0 " + largeArc + " 1 " + endPt.x.toFixed(2) + " " + endPt.y.toFixed(2);
  }

  function cccMarker(id, color, size) {
    return '<marker id="' + id + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="' + size + '" markerHeight="' + size +
      '" markerUnits="userSpaceOnUse" orient="auto">' +
      '<path d="M0,0 L10,5 L0,10 Z" fill="' + color + '"></path></marker>';
  }

  function renderCCCCircle(containerId, ratioResult) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    var dio = ratioResult.ccc.dio, dso = ratioResult.ccc.dso, dpo = ratioResult.ccc.dpo, ccc = ratioResult.ccc.ccc;
    if (dio === null || dso === null || dpo === null) {
      var msg = document.createElement("div");
      msg.className = "empty-state";
      msg.appendChild(FA.util.biEl("div", "Not enough data to draw the cash cycle for this period.", "بيانات غير كافية لرسم دورة النقدية لهذه الفترة."));
      container.appendChild(msg);
      return;
    }

    var cycle = dio + dso; // Operating Cycle (days) -> mapped to the full 360°
    if (cycle <= 0) cycle = 0.01;
    var angleDIO = 360 * (dio / cycle);
    var angleDPO = 360 * (Math.min(dpo, cycle) / cycle);

    var cx = 190, cy = 176;
    var R1 = 146, W1 = 27; // outer ring: DIO + DSO (the operating cycle)
    var R2 = 105, W2 = 23; // inner ring: DPO + the CCC cash gap

    var colorDIO = PALETTE[0], colorDSO = PALETTE[4], colorDPO = PALETTE[5], colorCCC = PALETTE[7];

    function arcSvg(r, w, startA, endA, color, markerId) {
      return '<path d="' + arcPath(cx, cy, r, startA, endA) + '" stroke="' + color + '" stroke-width="' + w +
        '" fill="none" stroke-linecap="butt" marker-end="url(#' + markerId + ')"></path>';
    }

    function arcLabel(r, startA, endA, text) {
      if ((endA - startA) < 22) return "";
      var mid = (startA + endA) / 2;
      var p = polarToCartesian(cx, cy, r, mid);
      return '<text x="' + p.x.toFixed(1) + '" y="' + p.y.toFixed(1) + '" class="ccc-arc-label" text-anchor="middle" dominant-baseline="middle">' + text + '</text>';
    }

    var svg = '<svg viewBox="0 0 380 366" class="ccc-circle-svg" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
      cccMarker("arrowDIO", colorDIO, W1) + cccMarker("arrowDSO", colorDSO, W1) +
      cccMarker("arrowDPO", colorDPO, W2) + cccMarker("arrowCCC", colorCCC, W2) +
      '</defs>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + R1 + '" class="ccc-track" stroke-width="' + W1 + '"></circle>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + R2 + '" class="ccc-track" stroke-width="' + W2 + '"></circle>' +
      arcSvg(R1, W1, 0, angleDIO, colorDIO, "arrowDIO") +
      arcSvg(R1, W1, angleDIO, 360, colorDSO, "arrowDSO") +
      arcSvg(R2, W2, 0, angleDPO, colorDPO, "arrowDPO") +
      arcSvg(R2, W2, angleDPO, 360, colorCCC, "arrowCCC") +
      arcLabel(R1, 0, angleDIO, "DIO") +
      arcLabel(R1, angleDIO, 360, "DSO") +
      arcLabel(R2, 0, angleDPO, "DPO") +
      arcLabel(R2, angleDPO, 360, "CCC") +
      '<text x="' + cx + '" y="' + (cy - 16) + '" text-anchor="middle" class="ccc-center-sub">CASH CONVERSION CYCLE</text>' +
      '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" class="ccc-center-num">' + FA.format.num(ccc, 0) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 42) + '" text-anchor="middle" class="ccc-center-sub">days</text>' +
      '<text x="' + cx + '" y="' + (cy + 60) + '" text-anchor="middle" class="ccc-center-sub-ar" dir="rtl">دورة التحويل النقدي - يوم</text>' +
      '</svg>';

    var wrap = document.createElement("div");
    wrap.className = "ccc-circle-wrap";
    wrap.innerHTML = svg;
    container.appendChild(wrap);

    var flow = document.createElement("p");
    flow.className = "hint ccc-flow-caption";
    flow.appendChild(FA.util.biEl("span",
      "Cash flows clockwise: inventory is purchased and held (DIO), then sold on credit and collected from customers (DSO) - while suppliers are paid after only DPO days. The remaining " + FA.format.num(ccc, 0) + " days (in red) is the cash gap the business must self-finance.",
      "تدور النقدية في اتجاه عقارب الساعة: يُشترى المخزون ويُحتفظ به (DIO)، ثم يُباع آجلاً ويُحصَّل من العملاء (DSO) - بينما يُسدد للموردين بعد DPO يوم فقط. الفجوة المتبقية (" + FA.format.num(ccc, 0) + " يوم، باللون الأحمر) هي الفترة التي يجب على الشركة تمويلها ذاتيًا."
    ));
    container.appendChild(flow);

    var legend = document.createElement("div");
    legend.className = "ccc-legend";
    [
      { color: colorDIO, en: "DIO - Inventory Period", ar: "فترة تخزين المخزون", val: dio },
      { color: colorDSO, en: "DSO - Receivable Period", ar: "فترة تحصيل العملاء", val: dso },
      { color: colorDPO, en: "DPO - Payable Period", ar: "فترة سداد الموردين", val: dpo },
      { color: colorCCC, en: "CCC - Cash Gap", ar: "فجوة النقدية", val: ccc }
    ].forEach(function (item) {
      var row = document.createElement("div");
      row.className = "ccc-legend-item";
      var dot = document.createElement("span");
      dot.className = "ccc-legend-dot";
      dot.style.backgroundColor = item.color;
      row.appendChild(dot);
      row.appendChild(FA.util.biEl("span", item.en, item.ar, "ccc-legend-label"));
      var valSpan = document.createElement("span");
      valSpan.className = "ccc-legend-val";
      valSpan.textContent = FA.format.num(item.val, 0) + "d";
      row.appendChild(valSpan);
      legend.appendChild(row);
    });
    container.appendChild(legend);
  }

  FA.Charts = {
    renderVerticalChart: renderVerticalChart,
    renderHorizontalChart: renderHorizontalChart,
    renderCCCChart: renderCCCChart,
    renderCCCCircle: renderCCCCircle,
    destroy: destroy
  };
})(window.FA);

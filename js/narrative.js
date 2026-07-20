/* narrative.js
 * مولّد الخلاصة والرأي الفني - قواعد منطقية بالكامل (بدون أي نداء API خارجي)
 * كل جملة تُبنى بنسختين: إنجليزي (أساسي) وعربي (ترجمة)
 */
window.FA = window.FA || {};

(function (FA) {
  "use strict";

  var fmt = FA.format.ratio;

  // جمل جاهزة لكل نسبة حسب تصنيفها (جيد / تحت الملاحظة / ضعيف) - {en, ar}
  var SENTENCES = {
    currentRatio: {
      good: function (fv) { return { en: "Current ratio of " + fv + " reflects a good ability to cover current liabilities.", ar: "نسبة التداول " + fv + " تعكس قدرة جيدة على تغطية الالتزامات المتداولة." }; },
      watch: function (fv) { return { en: "Current ratio of " + fv + " is acceptable but close to the safe threshold and worth monitoring.", ar: "نسبة التداول " + fv + " في مستوى مقبول لكنها قريبة من الحد الآمن وتحتاج متابعة." }; },
      poor: function (fv) { return { en: "Current ratio is low (" + fv + "), suggesting potential pressure on short-term liquidity.", ar: "نسبة التداول منخفضة (" + fv + ")، مما يشير لضغط محتمل على قدرة السداد قصير الأجل." }; }
    },
    quickRatio: {
      good: function (fv) { return { en: "Quick ratio of " + fv + " indicates good liquidity even without relying on inventory sales.", ar: "النسبة السريعة " + fv + " تدل على سيولة جيدة حتى بدون الاعتماد على بيع المخزون." }; },
      watch: function (fv) { return { en: "Quick ratio of " + fv + " is moderate and worth monitoring.", ar: "النسبة السريعة " + fv + " متوسطة وتستحق المراقبة." }; },
      poor: function (fv) { return { en: "Quick ratio is low (" + fv + "), implying heavy reliance on inventory to cover short-term liabilities.", ar: "النسبة السريعة منخفضة (" + fv + ")، ما يعني اعتمادًا كبيرًا على المخزون لتغطية الالتزامات قصيرة الأجل." }; }
    },
    cashRatio: {
      good: function (fv) { return { en: "Cash ratio of " + fv + " reflects a strong cash position.", ar: "نسبة النقدية " + fv + " تعكس مركزًا نقديًا قويًا." }; },
      watch: function (fv) { return { en: "Cash ratio of " + fv + " is moderate.", ar: "نسبة النقدية " + fv + " معتدلة." }; },
      poor: function (fv) { return { en: "Cash ratio is low (" + fv + "), limiting reliance on immediate liquidity.", ar: "نسبة النقدية منخفضة (" + fv + ")، والاعتماد على السيولة الفورية محدود." }; }
    },
    workingCapital: {
      good: function (fv) { return { en: "Working capital is positive (" + fv + "), a healthy sign of short-term financial balance.", ar: "رأس المال العامل موجب (" + fv + ")، وهو مؤشر صحي على التوازن المالي قصير الأجل." }; },
      poor: function (fv) { return { en: "Working capital is negative (" + fv + "), a warning sign of imbalance between current assets and liabilities.", ar: "رأس المال العامل سالب (" + fv + ")، وهو مؤشر تحذيري على اختلال التوازن بين الأصول والخصوم المتداولة." }; }
    },
    grossMargin: {
      good: function (fv) { return { en: "Gross profit margin of " + fv + " reflects strong pricing power and good direct-cost efficiency.", ar: "هامش مجمل الربح " + fv + " يعكس قوة تسعيرية وكفاءة جيدة في التكلفة المباشرة." }; },
      watch: function (fv) { return { en: "Gross profit margin of " + fv + " is at a moderate level.", ar: "هامش مجمل الربح " + fv + " في مستوى متوسط." }; },
      poor: function (fv) { return { en: "Gross profit margin is low (" + fv + "), warranting a review of direct costs or pricing policy.", ar: "هامش مجمل الربح منخفض (" + fv + ")، ما يستدعي مراجعة التكلفة المباشرة أو سياسة التسعير." }; }
    },
    operatingMargin: {
      good: function (fv) { return { en: "Operating margin of " + fv + " indicates good operating efficiency.", ar: "هامش الربح التشغيلي " + fv + " يدل على كفاءة تشغيلية جيدة." }; },
      watch: function (fv) { return { en: "Operating margin of " + fv + " is moderate and could benefit from tighter cost control.", ar: "هامش الربح التشغيلي " + fv + " متوسط ويحتاج تحسين ضبط المصروفات التشغيلية." }; },
      poor: function (fv) { return { en: "Operating margin is low (" + fv + "), suggesting operating expenses are high relative to revenue.", ar: "هامش الربح التشغيلي منخفض (" + fv + ")، ما يشير لارتفاع المصروفات التشغيلية نسبة للإيرادات." }; }
    },
    netMargin: {
      good: function (fv) { return { en: "Net profit margin of " + fv + " reflects strong bottom-line profitability.", ar: "هامش صافي الربح " + fv + " يعكس ربحية نهائية قوية." }; },
      watch: function (fv) { return { en: "Net profit margin of " + fv + " is acceptable but has room for improvement.", ar: "هامش صافي الربح " + fv + " مقبول لكن هناك مجال للتحسين." }; },
      poor: function (fv) { return { en: "Net profit margin is weak or negative (" + fv + "), a key weakness that needs review.", ar: "هامش صافي الربح ضعيف أو سالب (" + fv + ")، وهو نقطة ضعف جوهرية تستوجب المراجعة." }; }
    },
    roa: {
      good: function (fv) { return { en: "Return on Assets (ROA) of " + fv + " reflects efficient use of assets to generate profit.", ar: "العائد على الأصول (ROA) " + fv + " يعكس استخدامًا كفؤًا للأصول في توليد الأرباح." }; },
      watch: function (fv) { return { en: "Return on Assets (ROA) of " + fv + " is moderate.", ar: "العائد على الأصول " + fv + " متوسط." }; },
      poor: function (fv) { return { en: "Return on Assets (ROA) is weak (" + fv + "), indicating limited efficiency in using assets.", ar: "العائد على الأصول ضعيف (" + fv + ")، ما يعني كفاءة محدودة في استغلال الأصول." }; }
    },
    roe: {
      good: function (fv) { return { en: "Return on Equity (ROE) of " + fv + " is good and reflects a rewarding return for shareholders.", ar: "العائد على حقوق الملكية (ROE) " + fv + " جيد ويعكس عائدًا مجزيًا لأصحاب رأس المال." }; },
      watch: function (fv) { return { en: "Return on Equity (ROE) of " + fv + " is moderate.", ar: "العائد على حقوق الملكية " + fv + " متوسط." }; },
      poor: function (fv) { return { en: "Return on Equity (ROE) is weak (" + fv + "), limiting the return to shareholders.", ar: "العائد على حقوق الملكية ضعيف (" + fv + ")، والعائد لأصحاب رأس المال محدود." }; }
    },
    debtRatio: {
      good: function (fv) { return { en: "Debt-to-assets ratio of " + fv + " reflects a conservative, lower-risk financing structure.", ar: "نسبة الدين إلى الأصول " + fv + " تعكس هيكلًا تمويليًا متحفظًا وقليل المخاطر." }; },
      watch: function (fv) { return { en: "Debt-to-assets ratio of " + fv + " is moderate and worth monitoring.", ar: "نسبة الدين إلى الأصول " + fv + " معتدلة وتحتاج متابعة." }; },
      poor: function (fv) { return { en: "Debt-to-assets ratio is high (" + fv + "), indicating heavy reliance on debt financing and higher financial risk.", ar: "نسبة الدين إلى الأصول مرتفعة (" + fv + ")، ما يعني اعتمادًا كبيرًا على التمويل بالدين ومخاطر مالية أعلى." }; }
    },
    debtToEquity: {
      good: function (fv) { return { en: "Debt-to-equity ratio of " + fv + " is at a safe level.", ar: "نسبة الدين إلى حقوق الملكية " + fv + " في مستوى آمن." }; },
      watch: function (fv) { return { en: "Debt-to-equity ratio of " + fv + " needs monitoring.", ar: "نسبة الدين إلى حقوق الملكية " + fv + " تحتاج مراقبة." }; },
      poor: function (fv) { return { en: "Debt-to-equity ratio is high (" + fv + "), increasing the degree of financial risk.", ar: "نسبة الدين إلى حقوق الملكية مرتفعة (" + fv + ")، ما يزيد من درجة المخاطرة المالية." }; }
    },
    interestCoverage: {
      good: function (fv) { return { en: "Interest coverage ratio of " + fv + " is comfortable and shows a good ability to service debt obligations.", ar: "معدل تغطية الفوائد " + fv + " مريح ويدل على قدرة جيدة على خدمة أعباء الدين." }; },
      watch: function (fv) { return { en: "Interest coverage ratio of " + fv + " is acceptable but not fully comfortable.", ar: "معدل تغطية الفوائد " + fv + " مقبول لكنه ليس بمستوى مريح تمامًا." }; },
      poor: function (fv) { return { en: "Interest coverage ratio is weak (" + fv + "), raising concern about the ability to service interest expenses.", ar: "معدل تغطية الفوائد ضعيف (" + fv + ")، ما يثير قلقًا بشأن القدرة على سداد أعباء الفوائد." }; }
    }
  };

  function collectFlaggedSentences(ratioResult) {
    var strengths = [];
    var weaknesses = [];
    var watch = [];
    ratioResult.groups.forEach(function (group) {
      group.ratios.forEach(function (r) {
        if (!r.flag || r.flag === "na" || !SENTENCES[r.key]) return;
        var fv = fmt(r);
        var sentenceFn = SENTENCES[r.key][r.flag];
        if (!sentenceFn) return;
        var text = sentenceFn(fv);
        if (r.flag === "good") strengths.push(text);
        else if (r.flag === "poor") weaknesses.push(text);
        else watch.push(text);
      });
    });
    return { strengths: strengths, weaknesses: weaknesses, watch: watch };
  }

  function cccNarrative(last, prev) {
    var out = { strengths: [], weaknesses: [], watch: [] };
    var ccc = last.ccc.ccc;
    if (ccc === null) return out;
    var fvEn = FA.format.num(ccc, 0) + " days";
    var fvAr = FA.format.num(ccc, 0) + " يوم";
    if (ccc <= 30) {
      out.strengths.push({
        en: "The Cash Conversion Cycle (CCC) is relatively short (" + fvEn + "), reflecting good efficiency in turning operations into cash.",
        ar: "دورة التحويل النقدي (CCC) قصيرة نسبيًا (" + fvAr + ")، ما يعكس كفاءة جيدة في تحويل العمليات التشغيلية إلى نقدية."
      });
    } else if (ccc <= 90) {
      out.watch.push({
        en: "The Cash Conversion Cycle (CCC) is moderate (" + fvEn + "), with room to improve working capital management.",
        ar: "دورة التحويل النقدي (CCC) متوسطة (" + fvAr + ") وهناك مجال لتحسين إدارة رأس المال العامل."
      });
    } else {
      out.weaknesses.push({
        en: "The Cash Conversion Cycle (CCC) is relatively long (" + fvEn + "), meaning cash stays tied up longer in inventory and receivables.",
        ar: "دورة التحويل النقدي (CCC) طويلة نسبيًا (" + fvAr + ")، ما يعني تجميد النقدية لفترة أطول في المخزون والذمم المدينة."
      });
    }

    if (prev && prev.ccc.ccc !== null) {
      var diff = ccc - prev.ccc.ccc;
      if (Math.abs(diff) >= 1) {
        var diffEn = FA.format.num(Math.abs(diff), 0) + " days";
        var diffAr = FA.format.num(Math.abs(diff), 0) + " يوم";
        if (diff < 0) {
          out.strengths.push({
            en: "The cash conversion cycle improved versus the prior period, shortening by " + diffEn + ".",
            ar: "تحسّنت دورة التحويل النقدي مقارنة بالفترة السابقة بانخفاض قدره " + diffAr + "."
          });
        } else {
          out.weaknesses.push({
            en: "The cash conversion cycle worsened versus the prior period, lengthening by " + diffEn + ".",
            ar: "تراجعت دورة التحويل النقدي مقارنة بالفترة السابقة بزيادة قدرها " + diffAr + "."
          });
        }
      }
    }
    return out;
  }

  var TREND_LABELS = {
    netMargin: { en: "Net profit margin", ar: "هامش صافي الربح" },
    currentRatio: { en: "Current ratio", ar: "نسبة التداول" },
    debtRatio: { en: "Debt-to-assets ratio", ar: "نسبة الدين إلى الأصول" }
  };

  function trendNarrative(last, prev) {
    var notes = [];
    if (!prev) return notes;
    Object.keys(TREND_LABELS).forEach(function (key) {
      var lastR = findRatio(last, key);
      var prevR = findRatio(prev, key);
      if (!lastR || !prevR || lastR.value === null || prevR.value === null) return;
      var delta = lastR.value - prevR.value;
      if (Math.abs(delta) < 0.001) return;
      var lbl = TREND_LABELS[key];
      var dirEn = delta > 0 ? "rose" : "fell";
      var dirAr = delta > 0 ? "ارتفعت" : "انخفضت";
      notes.push({
        en: lbl.en + " " + dirEn + " from " + fmt(prevR) + " to " + fmt(lastR) + " versus the prior period.",
        ar: lbl.ar + " " + dirAr + " من " + fmt(prevR) + " إلى " + fmt(lastR) + " مقارنة بالفترة السابقة."
      });
    });
    return notes;
  }

  function findRatio(ratioResult, key) {
    for (var i = 0; i < ratioResult.groups.length; i++) {
      var found = ratioResult.groups[i].ratios.find(function (r) { return r.key === key; });
      if (found) return found;
    }
    return null;
  }

  function overallFlag(strengthsCount, weaknessesCount) {
    if (weaknessesCount === 0 && strengthsCount > 0) return "good";
    if (strengthsCount >= weaknessesCount * 3) return "good";
    if (weaknessesCount >= 3 && weaknessesCount > strengthsCount) return "poor";
    return "watch";
  }

  var RATING_TEXT = {
    good: { en: "Good overall financial position", ar: "مركز مالي جيد بشكل عام" },
    watch: { en: "Moderate financial position that needs monitoring", ar: "مركز مالي متوسط يحتاج متابعة" },
    poor: { en: "Financial position that requires urgent attention", ar: "مركز مالي يستدعي انتباهًا عاجلاً" }
  };

  function generate() {
    var periods = FA.Store.getPeriods();
    if (periods.length === 0) return null;

    var allRatios = FA.Analysis.computeAllRatios();
    var last = allRatios[allRatios.length - 1];
    var prev = allRatios.length > 1 ? allRatios[allRatios.length - 2] : null;

    var flagged = collectFlaggedSentences(last);
    var ccc = cccNarrative(last, prev);
    var trends = trendNarrative(last, prev);

    var strengths = flagged.strengths.concat(ccc.strengths);
    var weaknesses = flagged.weaknesses.concat(ccc.weaknesses);
    var watchPoints = flagged.watch.concat(ccc.watch);

    var balance = FA.Store.validateBalance(last.periodId);
    if (!balance.balanced) {
      watchPoints.unshift({
        en: "Warning: Total Assets (" + FA.format.num(balance.totalAssets) + ") does not equal Total Liabilities and Equity (" +
          FA.format.num(balance.totalLiabPlusEquity) + ") - please review the entered data before relying on these results.",
        ar: "تنبيه: إجمالي الأصول (" + FA.format.num(balance.totalAssets) + ") لا يساوي إجمالي الخصوم وحقوق الملكية (" +
          FA.format.num(balance.totalLiabPlusEquity) + ") - يُنصح بمراجعة البيانات المدخلة قبل الاعتماد على النتائج."
      });
    }

    var rating = overallFlag(strengths.length, weaknesses.length);
    var ratingText = RATING_TEXT[rating];

    var summaryParagraphs = [];
    summaryParagraphs.push({
      en: "Based on data for period \"" + last.periodLabel + "\", the automated analysis shows the company is in a " + ratingText.en.toLowerCase() +
        ", with " + strengths.length + " key strength(s) and " + weaknesses.length + " key weakness(es) among the ratios assessed.",
      ar: "بناءً على بيانات فترة \"" + last.periodLabel + "\"، يظهر التحليل الآلي أن الشركة في " + ratingText.ar + "، مع " +
        strengths.length + " نقطة قوة و" + weaknesses.length + " نقطة ضعف رئيسية من بين النسب التي تم تقييمها."
    });
    if (trends.length) {
      summaryParagraphs.push({
        en: "Key changes versus the prior period: " + trends.map(function (t) { return t.en; }).join(" "),
        ar: "أبرز التغيرات مقارنة بالفترة السابقة: " + trends.map(function (t) { return t.ar; }).join(" ")
      });
    }
    var cccNote = ccc.strengths[0] || ccc.watch[0] || ccc.weaknesses[0];
    if (cccNote) summaryParagraphs.push(cccNote);
    summaryParagraphs.push({
      en: "Note: this is an automated, indicative analysis based solely on the entered data, and does not constitute certified financial or investment advice. Reference benchmarks for ratios vary by sector and business nature - consulting a qualified financial analyst before making decisions is recommended.",
      ar: "ملاحظة: هذا تحليل آلي إرشادي مبني على البيانات المُدخلة فقط، ولا يُعد استشارة مالية أو استثمارية معتمدة. تختلف المعايير المرجعية للنسب باختلاف القطاع وطبيعة النشاط، ويُنصح بمراجعة محلل مالي مختص قبل اتخاذ قرارات."
    });

    return {
      periodLabel: last.periodLabel,
      rating: rating,
      ratingText: ratingText,
      strengths: strengths,
      weaknesses: weaknesses,
      watchPoints: watchPoints,
      summaryParagraphs: summaryParagraphs
    };
  }

  FA.Narrative = { generate: generate };
})(window.FA);

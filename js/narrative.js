/* narrative.js
 * مولّد الخلاصة والرأي الفني - قواعد منطقية بالكامل (بدون أي نداء API خارجي)
 */
window.FA = window.FA || {};

(function (FA) {
  "use strict";

  var fmt = FA.format.ratio;

  // جمل جاهزة لكل نسبة حسب تصنيفها (جيد / تحت الملاحظة / ضعيف)
  var SENTENCES = {
    currentRatio: {
      good: function (fv) { return "نسبة التداول " + fv + " تعكس قدرة جيدة على تغطية الالتزامات المتداولة."; },
      watch: function (fv) { return "نسبة التداول " + fv + " في مستوى مقبول لكنها قريبة من الحد الآمن وتحتاج متابعة."; },
      poor: function (fv) { return "نسبة التداول منخفضة (" + fv + ")، مما يشير لضغط محتمل على قدرة السداد قصير الأجل."; }
    },
    quickRatio: {
      good: function (fv) { return "النسبة السريعة " + fv + " تدل على سيولة جيدة حتى بدون الاعتماد على بيع المخزون."; },
      watch: function (fv) { return "النسبة السريعة " + fv + " متوسطة وتستحق المراقبة."; },
      poor: function (fv) { return "النسبة السريعة منخفضة (" + fv + ")، ما يعني اعتمادًا كبيرًا على المخزون لتغطية الالتزامات قصيرة الأجل."; }
    },
    cashRatio: {
      good: function (fv) { return "نسبة النقدية " + fv + " تعكس مركزًا نقديًا قويًا."; },
      watch: function (fv) { return "نسبة النقدية " + fv + " معتدلة."; },
      poor: function (fv) { return "نسبة النقدية منخفضة (" + fv + ")، والاعتماد على السيولة الفورية محدود."; }
    },
    workingCapital: {
      good: function (fv) { return "رأس المال العامل موجب (" + fv + ")، وهو مؤشر صحي على التوازن المالي قصير الأجل."; },
      poor: function (fv) { return "رأس المال العامل سالب (" + fv + ")، وهو مؤشر تحذيري على اختلال التوازن بين الأصول والخصوم المتداولة."; }
    },
    grossMargin: {
      good: function (fv) { return "هامش مجمل الربح " + fv + " يعكس قوة تسعيرية وكفاءة جيدة في التكلفة المباشرة."; },
      watch: function (fv) { return "هامش مجمل الربح " + fv + " في مستوى متوسط."; },
      poor: function (fv) { return "هامش مجمل الربح منخفض (" + fv + ")، ما يستدعي مراجعة التكلفة المباشرة أو سياسة التسعير."; }
    },
    operatingMargin: {
      good: function (fv) { return "هامش الربح التشغيلي " + fv + " يدل على كفاءة تشغيلية جيدة."; },
      watch: function (fv) { return "هامش الربح التشغيلي " + fv + " متوسط ويحتاج تحسين ضبط المصروفات التشغيلية."; },
      poor: function (fv) { return "هامش الربح التشغيلي منخفض (" + fv + ")، ما يشير لارتفاع المصروفات التشغيلية نسبة للإيرادات."; }
    },
    netMargin: {
      good: function (fv) { return "هامش صافي الربح " + fv + " يعكس ربحية نهائية قوية."; },
      watch: function (fv) { return "هامش صافي الربح " + fv + " مقبول لكن هناك مجال للتحسين."; },
      poor: function (fv) { return "هامش صافي الربح ضعيف أو سالب (" + fv + ")، وهو نقطة ضعف جوهرية تستوجب المراجعة."; }
    },
    roa: {
      good: function (fv) { return "العائد على الأصول (ROA) " + fv + " يعكس استخدامًا كفؤًا للأصول في توليد الأرباح."; },
      watch: function (fv) { return "العائد على الأصول " + fv + " متوسط."; },
      poor: function (fv) { return "العائد على الأصول ضعيف (" + fv + ")، ما يعني كفاءة محدودة في استغلال الأصول."; }
    },
    roe: {
      good: function (fv) { return "العائد على حقوق الملكية (ROE) " + fv + " جيد ويعكس عائدًا مجزيًا لأصحاب رأس المال."; },
      watch: function (fv) { return "العائد على حقوق الملكية " + fv + " متوسط."; },
      poor: function (fv) { return "العائد على حقوق الملكية ضعيف (" + fv + ")، والعائد لأصحاب رأس المال محدود."; }
    },
    debtRatio: {
      good: function (fv) { return "نسبة الدين إلى الأصول " + fv + " تعكس هيكلًا تمويليًا متحفظًا وقليل المخاطر."; },
      watch: function (fv) { return "نسبة الدين إلى الأصول " + fv + " معتدلة وتحتاج متابعة."; },
      poor: function (fv) { return "نسبة الدين إلى الأصول مرتفعة (" + fv + ")، ما يعني اعتمادًا كبيرًا على التمويل بالدين ومخاطر مالية أعلى."; }
    },
    debtToEquity: {
      good: function (fv) { return "نسبة الدين إلى حقوق الملكية " + fv + " في مستوى آمن."; },
      watch: function (fv) { return "نسبة الدين إلى حقوق الملكية " + fv + " تحتاج مراقبة."; },
      poor: function (fv) { return "نسبة الدين إلى حقوق الملكية مرتفعة (" + fv + ")، ما يزيد من درجة المخاطرة المالية."; }
    },
    interestCoverage: {
      good: function (fv) { return "معدل تغطية الفوائد " + fv + " مريح ويدل على قدرة جيدة على خدمة أعباء الدين."; },
      watch: function (fv) { return "معدل تغطية الفوائد " + fv + " مقبول لكنه ليس بمستوى مريح تمامًا."; },
      poor: function (fv) { return "معدل تغطية الفوائد ضعيف (" + fv + ")، ما يثير قلقًا بشأن القدرة على سداد أعباء الفوائد."; }
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
    var fv = FA.format.num(ccc, 0) + " يوم";
    var sentence;
    if (ccc <= 30) {
      sentence = "دورة التحويل النقدي (CCC) قصيرة نسبيًا (" + fv + ")، ما يعكس كفاءة جيدة في تحويل العمليات التشغيلية إلى نقدية.";
      out.strengths.push(sentence);
    } else if (ccc <= 90) {
      sentence = "دورة التحويل النقدي (CCC) متوسطة (" + fv + ") وهناك مجال لتحسين إدارة رأس المال العامل.";
      out.watch.push(sentence);
    } else {
      sentence = "دورة التحويل النقدي (CCC) طويلة نسبيًا (" + fv + ")، ما يعني تجميد النقدية لفترة أطول في المخزون والذمم المدينة.";
      out.weaknesses.push(sentence);
    }

    if (prev && prev.ccc.ccc !== null) {
      var diff = ccc - prev.ccc.ccc;
      if (Math.abs(diff) >= 1) {
        if (diff < 0) {
          out.strengths.push("تحسّنت دورة التحويل النقدي مقارنة بالفترة السابقة بانخفاض قدره " + FA.format.num(Math.abs(diff), 0) + " يوم.");
        } else {
          out.weaknesses.push("تراجعت دورة التحويل النقدي مقارنة بالفترة السابقة بزيادة قدرها " + FA.format.num(diff, 0) + " يوم.");
        }
      }
    }
    return out;
  }

  function trendNarrative(last, prev) {
    var notes = [];
    if (!prev) return notes;
    var keys = [
      { key: "netMargin", label: "هامش صافي الربح", fmt: "pct" },
      { key: "currentRatio", label: "نسبة التداول", fmt: "x" },
      { key: "debtRatio", label: "نسبة الدين إلى الأصول", fmt: "pct" }
    ];
    keys.forEach(function (k) {
      var lastR = findRatio(last, k.key);
      var prevR = findRatio(prev, k.key);
      if (!lastR || !prevR || lastR.value === null || prevR.value === null) return;
      var delta = lastR.value - prevR.value;
      if (Math.abs(delta) < 0.001) return;
      var direction = delta > 0 ? "ارتفعت" : "انخفضت";
      notes.push(k.label + " " + direction + " من " + fmt(prevR) + " إلى " + fmt(lastR) + " مقارنة بالفترة السابقة.");
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
      watchPoints.unshift(
        "تنبيه: إجمالي الأصول (" + FA.format.num(balance.totalAssets) + ") لا يساوي إجمالي الخصوم وحقوق الملكية (" +
        FA.format.num(balance.totalLiabPlusEquity) + ") - يُنصح بمراجعة البيانات المدخلة قبل الاعتماد على النتائج."
      );
    }

    var rating = overallFlag(strengths.length, weaknesses.length);
    var ratingText = { good: "مركز مالي جيد بشكل عام", watch: "مركز مالي متوسط يحتاج متابعة", poor: "مركز مالي يستدعي انتباهًا عاجلاً" }[rating];

    var summaryParagraphs = [];
    summaryParagraphs.push(
      "بناءً على بيانات فترة \"" + last.periodLabel + "\"، يظهر التحليل الآلي أن الشركة في " + ratingText + "، مع " +
      strengths.length + " نقطة قوة و" + weaknesses.length + " نقطة ضعف رئيسية من بين النسب التي تم تقييمها."
    );
    if (trends.length) {
      summaryParagraphs.push("أبرز التغيرات مقارنة بالفترة السابقة: " + trends.join(" "));
    }
    if (ccc.strengths.concat(ccc.watch, ccc.weaknesses).length) {
      summaryParagraphs.push((ccc.strengths[0] || ccc.watch[0] || ccc.weaknesses[0]));
    }
    summaryParagraphs.push(
      "ملاحظة: هذا تحليل آلي إرشادي مبني على البيانات المُدخلة فقط، ولا يُعد استشارة مالية أو استثمارية معتمدة. " +
      "تختلف المعايير المرجعية للنسب باختلاف القطاع وطبيعة النشاط، ويُنصح بمراجعة محلل مالي مختص قبل اتخاذ قرارات."
    );

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

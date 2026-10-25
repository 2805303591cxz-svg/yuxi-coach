/* term.js —— 学期时间锚（与 大学保研/08_学习系统/学情配置.json 同源）
   作用：把「预习」从没有期限的时间盒，升级成有学期进度的学期盒，并按学分分配每周预习次数。
   口径：推免只看大一~大三，前六个学期合计 147 学分 —— 一门课的权重 = 该课学分 / 147。 */
(function () {
  var CFG = {
    term: '大一上',
    start: '2026-08-31',        // 开学（已校准：2026-10-17 是第 7 周周六）
    weeks: 20,                  // 第 20 周就是期末周
    examStart: '2027-01-11',    // 期末周开始
    examEnd: '2027-01-16',
    holiday: '2027-01-18',      // 放假（用户确认：1 月 18 日正式放假）
    pauses: [{ name: '校运动会', from: '2026-10-21', to: '2026-10-23' }],   // 停课不放假
    cet4: '2026-12-12',         // CET-4（用户确认：12 月 12 日）
    cet6: '2027-06-19',
    gpaDenom: 147
  };
  function d0(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today0() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function days(a, b) { return Math.round((b - a) / 864e5); }

  // 最近的停课/活动（运动会这类停课不放假的日子，预习计划要提前或推后）
  function nextPause(t) {
    var list = CFG.pauses || [];
    for (var i = 0; i < list.length; i++) {
      var from = d0(list[i].from), to = d0(list[i].to);
      var dTo = days(t, from);
      if (t >= from && t <= to) return { name: list[i].name, from: list[i].from, to: list[i].to, inNow: true, daysUntil: 0 };
      if (dTo > 0 && dTo <= 21) return { name: list[i].name, from: list[i].from, to: list[i].to, inNow: false, daysUntil: dTo };
    }
    return null;
  }

  function status(now) {
    var t = now ? new Date(now) : today0(); t.setHours(0, 0, 0, 0);
    var start = d0(CFG.start), examStart = d0(CFG.examStart);
    var rawWeek = Math.floor(days(start, t) / 7) + 1;
    var inExamWeek = t >= examStart && t <= d0(CFG.examEnd);
    var weekNo = Math.max(1, Math.min(CFG.weeks, rawWeek));
    var dExam = days(t, examStart);
    return {
      cfg: CFG,
      weekNo: weekNo,
      rawWeek: rawWeek,
      totalWeeks: CFG.weeks,
      daysToExam: dExam,
      daysToHoliday: days(t, d0(CFG.holiday)),
      daysToCet4: days(t, d0(CFG.cet4)),
      inExamWeek: inExamWeek,
      progress: Math.max(0, Math.min(1, rawWeek / CFG.weeks)),
      phase: inExamWeek ? '考试周' : (dExam <= 14 ? '考前冲刺' : (rawWeek > CFG.weeks ? '学期结束' : '正常教学')),
      pause: nextPause(t)
    };
  }

  /* 每周预习配额：按学分比例把 N 次分给各门课（最大余额法，保证相加正好 = N） */
  function weeklyQuota(courses, sessionsPerWeek) {
    var N = Math.max(1, Math.round(sessionsPerWeek || 6));
    var list = (courses || []).filter(function (c) { return c && c.enabled; });
    var sum = list.reduce(function (s, c) { return s + (Number(c.credits) || 0); }, 0) || 1;
    var out = list.map(function (c) {
      var raw = (Number(c.credits) || 0) / sum * N;
      return { course: c, credits: Number(c.credits) || 0, raw: raw, n: Math.floor(raw), frac: raw - Math.floor(raw) };
    });
    var left = N - out.reduce(function (s, x) { return s + x.n; }, 0);
    out.sort(function (a, b) { return b.frac - a.frac || b.credits - a.credits; });
    for (var i = 0; i < left && out.length; i++) out[i % out.length].n++;
    return out.sort(function (a, b) { return b.credits - a.credits; });
  }

  window.Term = { cfg: CFG, status: status, weeklyQuota: weeklyQuota, days: days, d0: d0 };
})();

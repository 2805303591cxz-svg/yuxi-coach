/* timetable.js —— 这学期的真实课表（数据来自教务系统 + 班级群《课程安排变更通知》）
   给首页用：今天有什么课、下一节课是什么、空档在哪、这周有没有实验。
   纯计算，不读存储；所有时间按本地时区。 */
(function () {
  var START = '2026-08-31';          // 第 1 周周一
  var TOTAL_WEEKS = 20;              // 第 20 周 = 期末考试周（无课）

  // 节次开始时间（每块 2 节，90 分钟）
  var SLOT_TIME = { '1-2': '08:00', '3-4': '10:00', '5-6': '14:00', '7-8': '16:00' };
  var SLOT_ORDER = ['1-2', '3-4', '5-6', '7-8'];
  var DAY_NAME = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // 课程：from/to 是教学周；slot = [day, 节次, 教室]
  var COURSES = [
    { name: '高等数学 I（上）', short: '高数', from: 5, to: 19, teacher: '周小红',
      slots: [[1, '3-4', '天工北404'], [3, '1-2', '天工北404'], [5, '3-4', '天工北404']] },
    { name: '高级语言程序设计', short: '程设', from: 5, to: 18, teacher: '许欢',
      slots: [[1, '5-6', '天工南107'], [2, '3-4', '天工南316']] },
    { name: '大学英语（一）', short: '大英一', from: 5, to: 16, teacher: '段玉婷',
      slots: [[2, '1-2', '天工北305'], [4, '3-4', '天工北305']] },
    { name: '思想道德与法治', short: '思法', from: 5, to: 18, teacher: '张家宇',
      // 周一 7-8 只有部分周上（不是严格双周），标 maybe：占位但不硬算
      slots: [[3, '5-6', '天工北106'], [1, '7-8', '天工北304', true]] },
    { name: '中国传统文化', short: '传统文化', from: 12, to: 19, teacher: '赵威',
      slots: [[3, '3-4', '天工305']] },
    { name: '体育（一）· 篮球', short: '篮球', from: 5, to: 19, teacher: '胡正阳',
      slots: [[3, '7-8', '至诚体育场']] },
    { name: '形势与政策（一）', short: '形势政策', from: 14, to: 18, teacher: '秦镇',
      slots: [[5, '7-8', '天工306']] },
    { name: '军事理论', short: '军理', from: 9, to: 12, teacher: '袁宏伟',
      slots: [[5, '5-6', '天工北214']] },
    { name: '软件工程专业导论', short: '导论', from: 5, to: 12, teacher: '李洁',
      slots: [[5, '1-2', '天工南203']] },
    { name: '职业发展（生涯规划）指导', short: '职业发展', from: 5, to: 12, teacher: '赵威',
      slots: [[2, '7-8', '', true]] }
  ];

  // 《课程安排变更通知》（2026-09-29，许欢）：实验 16 学时 + 课设 20 学时，机房集中安排
  var LABS = [
    { week: 8,  day: 5, from: '5-6', to: '7-8', room: 'A207实验室', kind: '实验', hours: 4 },
    { week: 10, day: 4, from: '1-2', to: '1-2', room: 'A203实验室', kind: '实验', hours: 2 },
    { week: 12, day: 4, from: '1-2', to: '1-2', room: 'A203实验室', kind: '实验', hours: 2 },
    { week: 15, day: 2, from: '5-6', to: '7-8', room: 'A203实验室', kind: '实验', hours: 4 },
    { week: 17, day: 2, from: '5-6', to: '7-8', room: 'A203实验室', kind: '实验', hours: 4 },
    { week: 18, day: 2, from: '5-6', to: '7-8', room: 'A203实验室', kind: '课设', hours: 4 },
    { week: 19, day: 2, from: '1-2', to: '7-8', room: 'A203实验室', kind: '课设', hours: 8 },
    { week: 19, day: 4, from: '1-2', to: '7-8', room: 'A203实验室', kind: '课设', hours: 8 }
  ];

  function dayIndex(d) { return d.getDay() === 0 ? 7 : d.getDay(); }  // 周一=1 … 周日=7
  function midnight(d) { var x = new Date(d.getTime()); x.setHours(0, 0, 0, 0); return x; }
  function daysBetween(a, b) { return Math.round((midnight(b) - midnight(a)) / 86400000); }

  function weekOf(date) {
    var d = daysBetween(new Date(START + 'T00:00:00'), date || new Date());
    return Math.floor(d / 7) + 1;
  }
  function weekStart(week) {
    var d = new Date(START + 'T00:00:00');
    d.setDate(d.getDate() + (week - 1) * 7);
    return d;
  }

  function expand(lab) {
    var a = SLOT_ORDER.indexOf(lab.from), b = SLOT_ORDER.indexOf(lab.to);
    var out = [];
    for (var i = a; i <= b; i++) out.push(SLOT_ORDER[i]);
    return out;
  }

  // 某一周（可指定星期几）的全部课
  function blocksOfWeek(week, day) {
    var out = [];
    COURSES.forEach(function (c) {
      if (week < c.from || week > c.to) return;
      c.slots.forEach(function (s) {
        if (day && s[0] !== day) return;
        out.push({ day: s[0], slot: s[1], name: c.name, short: c.short,
                   room: s[2] || '', teacher: c.teacher, kind: '课', maybe: !!s[3] });
      });
    });
    LABS.forEach(function (l) {
      if (l.week !== week) return;
      if (day && l.day !== day) return;
      expand(l).forEach(function (slot) {
        out.push({ day: l.day, slot: slot, name: '高级语言程序设计' + l.kind, short: '程设' + l.kind,
                   room: l.room, teacher: '许欢', kind: l.kind, maybe: false });
      });
    });
    return out.sort(function (x, y) {
      return x.day - y.day || SLOT_ORDER.indexOf(x.slot) - SLOT_ORDER.indexOf(y.slot);
    });
  }

  function labsOfWeek(week) { return LABS.filter(function (l) { return l.week === week; }); }

  // 今天（或指定时刻）的情况
  function today(now) {
    now = now || new Date();
    var wk = weekOf(now), dy = dayIndex(now);
    return { date: now, weekNo: wk, day: dy, dayName: DAY_NAME[dy] || '周日',
             blocks: blocksOfWeek(wk, dy), labs: labsOfWeek(wk) };
  }

  // 空档：白天 4 块里今天没有课的（maybe 的算占用，保守）
  function freeSlots(now) {
    var t = today(now);
    var used = {};
    t.blocks.forEach(function (b) { used[b.slot] = true; });
    return SLOT_ORDER.filter(function (s) { return !used[s]; });
  }

  // 未来 10 天内最近的一节课
  function next(now) {
    now = now || new Date();
    var base = midnight(now);
    for (var k = 0; k < 10; k++) {
      var d = new Date(base.getTime()); d.setDate(d.getDate() + k);
      var wk = weekOf(d), dy = dayIndex(d);
      var list = blocksOfWeek(wk, dy).filter(function (b) { return !b.maybe; });
      for (var i = 0; i < list.length; i++) {
        var t = SLOT_TIME[list[i].slot];
        var at = new Date(d.getTime());
        at.setHours(parseInt(t.slice(0, 2), 10), parseInt(t.slice(3), 10), 0, 0);
        if (at > now) return { block: list[i], at: at, mins: Math.round((at - now) / 60000), weekNo: wk };
      }
    }
    return null;
  }

  window.TT = {
    start: START, totalWeeks: TOTAL_WEEKS, slotTime: SLOT_TIME,
    courses: COURSES, labs: LABS,
    weekOf: weekOf, weekStart: weekStart, dayName: function (d) { return DAY_NAME[d] || '周日'; },
    blocksOfWeek: blocksOfWeek, labsOfWeek: labsOfWeek,
    today: today, freeSlots: freeSlots, next: next
  };
})();

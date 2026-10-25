/* 预习教练 · 主程序（路由 / 首页 / 课程设置 / 方法论 / 数据） */
(function () {
  var S = window.Store, L = window.LEVELS, P = window.PREP;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function hm(sec) { sec = Math.round(sec); var m = Math.round(sec / 60); return m < 60 ? m + ' 分钟' : (m / 60).toFixed(1) + ' 小时'; }

  var App = window.App = { route: 'home', temp: {}, params: {} };

  function toast(msg) {
    var old = document.querySelector('.toast');
    if (old) old.parentNode.removeChild(old);
    var d = document.createElement('div');
    d.className = 'toast'; d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2600);
  }
  App.toast = toast;

  function go(route, params) {
    if (App.route === 'preview' && route !== 'preview' && window.Flow) window.Flow.unmount();
    App.route = route;
    App.params = params || {};
    render();
  }
  App.go = go;

  function render() {
    document.body.classList.toggle('in-preview', App.route === 'preview');
    var view = document.getElementById('view');
    var nav = document.getElementById('nav');
    var links = [['home', '首页'], ['verify', '课上验证'], ['courses', '课程设置'], ['method', '方法论'], ['data', '数据']];
    nav.innerHTML = links.map(function (l) {
      return '<button class="' + (App.route === l[0] ? 'on' : '') + '" data-nav="' + l[0] + '">' + l[1] + '</button>';
    }).join('');
    if (App.route === 'home') view.innerHTML = viewHome();
    else if (App.route === 'courses') view.innerHTML = viewCourses();
    else if (App.route === 'course-edit') view.innerHTML = viewCourseEdit(App.params.id);
    else if (App.route === 'method') view.innerHTML = viewMethod();
    else if (App.route === 'data') view.innerHTML = viewData();
    else if (App.route === 'done') view.innerHTML = window.Review.viewDone(App.params.sessionId);
    else if (App.route === 'verify') view.innerHTML = window.Review.viewVerify();
    else if (App.route === 'backfill') view.innerHTML = window.Review.viewBackfill(App.params.sessionId);
    else if (App.route === 'preview') { if (window.Flow) window.Flow.mount(view); return; }
    else view.innerHTML = viewHome();
  }
  App.render = render;

  document.addEventListener('click', function (ev) {
    var n = ev.target.closest('[data-nav]');
    if (n) { go(n.dataset.nav); window.scrollTo(0, 0); return; }
    if (window.Flow && App.route === 'preview') {
      var inView = ev.target.closest('#view');
      if (inView) { window.Flow.click(ev); return; }
    }
    var a = ev.target.closest('[data-app]');
    if (a) { window.Review.click(ev); return; }
  });
  /* ================= 首页 ================= */

  function daysAgo(ts) {
    var d = new Date(ts); d.setHours(0, 0, 0, 0);
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((t - d) / 864e5);
  }

  function viewHome() {
    var st = S.stats();
    var h = [];
    h.push('<div class="page-title">预习教练</div>');
    h.push('<div class="page-sub">把预习变成一件有开始、有结束、有产出的事。灵感来自《学习方法构建体系》第 7 讲。</div>');

    h.push('<div class="card"><div class="stats">' +
      '<div class="stat"><div class="v">' + st.streak + '</div><div class="k">连续天数</div></div>' +
      '<div class="stat"><div class="v">' + st.weekCount + '</div><div class="k">本周预习次数</div></div>' +
      '<div class="stat"><div class="v">' + (st.avgSecs ? hm(st.avgSecs) : '—') + '</div><div class="k">平均用时</div></div>' +
      '<div class="stat"><div class="v">' + st.solved + '/' + st.blockers + '</div><div class="k">卡点已解决</div></div>' +
      '<div class="stat"><div class="v">' + (st.quizRate === null ? '—' : st.quizRate + '%') + '</div><div class="k">抢答命中率</div></div>' +
      '</div>');
    if (!st.todayDone) h.push('<div class="note mt-s">今天还没打卡。哪怕只走「轻 5 分钟」也算——先说出口，再谈做好。</div>');
    else h.push('<div class="note ok mt-s">今天已经打卡了。继续保持。</div>');
    h.push('</div>');

    // —— 学期时间锚：第几周 / 距期末 / 本周预习次数按学分分配 ——
    if (window.Term) {
      var ts = Term.status();
      var quota = Term.weeklyQuota(S.enabledCourses(), 6).filter(function (x) { return x.n > 0; });
      var pct = Math.round(ts.progress * 100);
      h.push('<div class="card"><div class="card-head"><h2>' + esc(ts.cfg.term) + ' · 第 ' + ts.weekNo + ' / ' + ts.totalWeeks + ' 周</h2>' +
        '<span class="sub">' + esc(ts.phase) + (ts.inExamWeek ? '' : ' · 距期末 ' + ts.daysToExam + ' 天') + ' · 距 CET-4 ' + ts.daysToCet4 + ' 天</span></div>');
      h.push('<div style="height:8px;background:#e8e8e8;border-radius:4px;overflow:hidden;margin:8px 0"><div style="height:100%;width:' + pct + '%;background:#3a7bd5"></div></div>');
      h.push('<div class="small muted">本周建议预习 <b>6</b> 次 —— 按学分分给各门课：' +
        quota.map(function (x) { return esc(x.course.name) + ' <b>' + x.n + '</b> 次'; }).join('　·　') + '</div>');
      h.push('<div class="tiny faint" style="margin-top:4px">分配依据：该科学分 ÷ 前三年 147 学分。高数 5.5 学分 ≈ 中国传统文化的 5.5 倍权重，所以它拿到的次数也应该最多。</div>');
      if (ts.pause) {
        h.push('<div class="note mt-s">' + (ts.pause.inNow
          ? '本周 ' + esc(ts.pause.name) + '（' + ts.pause.from + ' ~ ' + ts.pause.to + '）停课，课不上但预习可以照做，把下一章的进度提前。'
          : (ts.pause.daysUntil <= 7 ? '下周' : '') + esc(ts.pause.name) + '（' + ts.pause.from + ' ~ ' + ts.pause.to + '，' + ts.pause.daysUntil + ' 天后）停课 —— 这几天适合把落下的章节补上。') + '</div>');
      }
      h.push('</div>');
    }

    // —— 今天与下一节课（真实课表，见 assets/timetable.js）——
    if (window.TT) {
      var td = TT.today();
      var nx = TT.next();
      var free = TT.freeSlots();
      var hasLab = td.labs.length > 0;
      var sub = nx
        ? '下一节 ' + TT.dayName(nx.block.day) + ' ' + nx.block.slot + ' ' + esc(nx.block.short) +
          (nx.block.room ? ' @' + esc(nx.block.room) : '') + ' · ' + hm(Math.max(0, nx.mins) * 60) + '后'
        : '接下来 10 天没有课';
      h.push('<div class="card"><div class="card-head"><h2>今天 · 第 ' + td.weekNo + ' 周 ' + td.dayName + '</h2><span class="sub">' + sub + '</span></div>');
      h.push('<div class="btn-row" style="gap:6px">');
      ['1-2', '3-4', '5-6', '7-8'].forEach(function (sl) {
        var b = null;
        td.blocks.forEach(function (x) { if (x.slot === sl) b = x; });
        var label = sl + ' ' + TT.slotTime[sl];
        h.push(b
          ? '<span class="tag" title="' + esc(b.room || '') + '">' + label + '　' + esc(b.short) + (b.maybe ? '?' : '') + '</span>'
          : '<span class="tag ok">' + label + '　空</span>');
      });
      h.push('</div>');
      if (free.length) {
        h.push('<div class="small muted mt-s">今天空档：<b>' + free.join('、') + '</b>　→　挑一段 35 分钟的高数预习，剩下的时间给程设（按学分，先高数后其它）。</div>');
      } else {
        h.push('<div class="small muted mt-s">今天从早到晚都是课/实验，预习只能放到晚上 19:20 以后，或者干脆只做 5 分钟轻量版。</div>');
      }
      if (hasLab) {
        h.push('<div class="note mt-s">本周机房：' +
          td.labs.map(function (l) {
            return TT.dayName(l.day) + ' ' + (l.from === l.to ? l.from : l.from + '~' + l.to.split('-')[1]) +
              ' 节 ' + esc(l.room) + '（' + l.kind + ' ' + l.hours + ' 学时）';
          }).join('；') + ' —— 去之前把当次要敲的代码自己过一遍，别到机房才看题。</div>');
      }
      h.push('<div class="tiny faint" style="margin-top:4px">数据来自教务系统课程列表 + 班级群《课程安排变更通知》。带 ? 的是"有的周上、有的周不上"，以当周课表为准。</div>');
      h.push('</div>');
    }

    var draft = S.getDraft();
    if (draft) {
      var stp = draft.steps[draft.stepIdx];
      h.push('<div class="card"><div class="card-head"><h2>有一次预习还没结束</h2><span class="sub">' + esc(draft.courseName) + ' · ' + esc(stp ? stp.title : '') + '</span></div>' +
        '<div class="small muted mb">开始时间 ' + new Date(draft.startedAt).toLocaleString('zh-CN') + '，已用 ' + mmss(draft.totalSpent) + '。</div>' +
        '<div class="btn-row"><button class="btn primary" data-act="resume">继续这次预习</button>' +
        '<button class="btn ghost danger" data-act="dropdraft">丢掉它</button></div></div>');
    }

    var pv = S.pendingVerify(), pb = S.pendingBackfill();
    if (pv.length || pb.length) {
      h.push('<div class="card"><div class="card-head"><h2>还没收尾的预习</h2></div><ul class="list-reset">');
      pv.forEach(function (s) {
        h.push('<li><span class="tag warn">待课上验证</span> <b>' + esc(s.courseName) + '</b> <span class="small muted">' + esc(s.taskTitle || '') + ' · ' + new Date(s.finishedAt).toLocaleDateString('zh-CN') + '</span>' +
          '<button class="btn sm" data-act="go-verify">去勾选</button></li>');
      });
      pb.forEach(function (s) {
        h.push('<li><span class="tag">待课后回填</span> <b>' + esc(s.courseName) + '</b> <span class="small muted">' + esc(s.taskTitle || '') + '</span>' +
          '<button class="btn sm" data-act="go-backfill" data-id="' + s.id + '">去回填</button></li>');
      });
      h.push('</ul></div>');
    }

    h.push('<div class="card"><div class="card-head"><h2>今天先做这三件事</h2><span class="sub">按学分和重要性排的，照顺序来</span></div>');
    h.push('<div class="small muted">① 挑一门课 → ② 选带到多深 → ③ 跟着一条条走完（带学不计时），最后 3 分钟自测。</div>');
    h.push('<div class="hr"></div>');

    var courses = S.enabledCourses().slice().sort(function (a, b) {
      var rank = { core: 0, normal: 1, light: 2 };
      var d = (rank[a.importance] || 1) - (rank[b.importance] || 1);
      if (d) return d;
      return (b.credits || 0) - (a.credits || 0);
    });
    h.push('<ul class="list-reset">');
    courses.forEach(function (c) {
      var last = S.lastSessionOf(c.id);
      var ago = last ? daysAgo(last.finishedAt) : null;
      var warn = (c.importance === 'core' && (ago === null || ago >= 3));
      h.push('<li><button class="btn" data-act="pick-course" data-id="' + c.id + '" style="text-align:left">' +
        '<span style="font-weight:640">' + esc(c.name) + '</span>' +
        '<span class="tiny muted"> ' + c.credits + ' 学分 · ' + L[c.level || 'standard'].short + '</span></button>' +
        '<span class="small ' + (warn ? '' : 'muted') + '">' +
        (ago === null ? (warn ? '⚠ 还没预习过' : '还没预习过') : (ago === 0 ? '今天预习过' : ago + ' 天前预习过')) +
        '</span></li>');
    });
    h.push('</ul></div>');
    return h.join('');
  }
  /* ================= 课程设置 ================= */

  function viewCourses() {
    var h = [];
    var all = S.courses().slice().sort(function (a, b) {
      var d = (a.semester || 1) - (b.semester || 1);
      if (d) return d;
      return (b.credits || 0) - (a.credits || 0);
    });
    var on = all.filter(function (c) { return c.enabled; });
    h.push('<div class="page-title">课程设置</div>');
    h.push('<div class="page-sub">档位按「学分 × 是否推免主战场」给建议：核心课或 4 学分以上走标准带学，其余走轻档只带背。全部可以改。</div>');

    h.push('<div class="card"><div class="card-head"><h2>正在用的课</h2><span class="sub">' + on.length + ' 门 · 合计 ' + on.reduce(function (a, c) { return a + (c.credits || 0); }, 0).toFixed(1) + ' 学分</span></div>');
    h.push(courseTable(all.filter(function (c) { return c.enabled; })));
    h.push('<div class="row mt"><button class="btn primary" data-act="newcourse">+ 新增一门课</button></div></div>');

    var off = all.filter(function (c) { return !c.enabled; });
    if (off.length) {
      h.push('<div class="card"><div class="card-head"><h2>不需要预习的课</h2><span class="sub">默认关掉，想开随时开</span></div>');
      h.push(courseTable(off));
      h.push('</div>');
    }

    h.push('<div class="card"><div class="card-head"><h2>从培养方案导入其它学期</h2><span class="sub">' + esc(window.CURRICULUM.plan) + '</span></div>' +
      '<div class="small muted mb">数据来自你那份 2024 版培养方案（已与表2/表3 核对）。导入后默认按「一般课 · 快 10 分钟」进列表，再自己调。</div><div class="btn-row">');
    window.CURRICULUM.semesters.forEach(function (s) {
      if (s.n === 1) return;
      h.push('<button class="btn sm" data-act="imp-sem" data-n="' + s.n + '">' + s.label + '（' + s.courses.length + ' 门）</button>');
    });
    h.push('</div></div>');
    return h.join('');
  }

  function courseTable(list) {
    var h = ['<ul class="list-reset">'];
    list.forEach(function (c) {
      h.push('<li>' +
        '<div style="flex:1;min-width:200px"><b>' + esc(c.name) + '</b>' +
        '<div class="tiny muted">' + (c.credits || 0) + ' 学分 · ' + esc(c.category || '') + ' · ' + esc(window.TRACKS[c.track] ? window.TRACKS[c.track].name : '') + '</div>' +
        (c.textbook ? '<div class="tiny faint">教材：' + esc(c.textbook) + '</div>' : '') + '</div>' +
        '<span class="tag ' + (c.importance === 'core' ? 'core' : (c.importance === 'light' ? 'light' : 'normal')) + '">' + (window.IMPORTANCE_NAME[c.importance] || '一般') + '</span>' +
        '<span class="tag">' + L[c.level || 'standard'].short + '</span>' +
        '<button class="btn sm" data-act="edit-course" data-id="' + c.id + '">调整</button>' +
        (c.enabled ? '<button class="btn sm" data-act="toggle-course" data-id="' + c.id + '" data-on="0">停用</button>'
                   : '<button class="btn sm" data-act="toggle-course" data-id="' + c.id + '" data-on="1">启用</button>') +
        '</li>');
    });
    h.push('</ul>');
    return h.join('');
  }

  function viewCourseEdit(id) {
    var c = id ? S.course(id) : null;
    var isNew = !c;
    c = c || { id: '', name: '', credits: 1, category: '', track: 'none', importance: 'normal', level: 'quick', enabled: true, why: '' };
    var h = [];
    h.push('<div class="page-title">' + (isNew ? '新增课程' : '调整课程') + '</div>');
    h.push('<div class="card">');
    h.push('<label class="fld"><span class="lbl">课程名称</span><input type="text" id="ce-name" value="' + esc(c.name) + '" placeholder="例：离散数学"></label>');
    h.push('<div class="row"><label class="fld grow"><span class="lbl">学分</span><input type="number" id="ce-credits" step="0.5" min="0" value="' + (c.credits || 0) + '"></label>' +
      '<label class="fld grow"><span class="lbl">类别（可留空）</span><input type="text" id="ce-cat" value="' + esc(c.category || '') + '" placeholder="例：学科基础必修"></label></div>');
    h.push('<label class="fld"><span class="lbl">教材（可留空，会显示在课程列表和预习准备页上）</span><input type="text" id="ce-book" value="' + esc(c.textbook || '') + '" placeholder="例：高等教育出版社《C 语言程序设计》"></label>');
    h.push('<label class="fld"><span class="lbl">用哪套预习流程</span><select id="ce-track">');
    Object.keys(window.TRACKS).forEach(function (k) {
      h.push('<option value="' + k + '"' + (c.track === k ? ' selected' : '') + '>' + esc(window.TRACKS[k].name) + '</option>');
    });
    h.push('</select></label>');
    h.push('<div class="small muted mb">选哪套会改变每一步问你的问题：数学问公式推导，编程问语法过手与重敲，文科问骨架与情境，概念课问概念地图与手算。</div>');
    h.push('<label class="fld"><span class="lbl">重要性</span><select id="ce-imp">' +
      [['core', '核心（推免主战场、学分大）'], ['normal', '一般'], ['light', '轻（通识 / 选修 / 水课）']].map(function (x) {
        return '<option value="' + x[0] + '"' + (c.importance === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></label>');
    h.push('<label class="fld"><span class="lbl">默认档位</span><select id="ce-level">' +
      P.levelList.map(function (k) { return '<option value="' + k + '"' + (c.level === k ? ' selected' : '') + '>' + L[k].name + ' — ' + esc(L[k].desc) + '</option>'; }).join('') +
      '</select></label>');
    h.push('<div class="row mt-s"><button class="btn sm" data-act="apply-recommend">按「重要性 + 学分」自动推荐档位</button></div>');
    h.push('<label class="fld mt"><span class="lbl">为什么这门课是这个档位（给未来的自己看）</span><textarea id="ce-why" placeholder="例：5.5 学分，单门最重，占前三年 3.74%。">' + esc(c.why || '') + '</textarea></label>');
    h.push('<label class="checkrow mt"><input type="checkbox" id="ce-enabled"' + (c.enabled ? ' checked' : '') + '> 在列表里启用（不启用的课不占首页位置）</label>');
    h.push('</div>');
    h.push('<div class="btn-row"><button class="btn primary" data-act="save-course" data-id="' + esc(c.id || '') + '">保存</button>' +
      '<button class="btn ghost" data-act="nav-back">返回</button>' +
      (isNew ? '' : '<button class="btn ghost danger" data-act="del-course" data-id="' + esc(c.id) + '">删除这门课</button>') + '</div>');
    return h.join('');
  }
  /* ================= 方法论（第 7 讲提炼） ================= */

  function viewMethod() {
    var h = [];
    h.push('<div class="page-title">方法论：老师那节课到底讲了什么</div>');
    h.push('<div class="page-sub">全部来自《学习方法构建体系》第 7 讲（预习）。工具里的每一步都是这里的原话落地，只是按大学生改了动作、按带学深度裁了长度。</div>');

    h.push('<div class="card"><div class="card-head"><h2>预习是什么</h2></div>' +
      '<div class="note">定义：<b>无人指导下，首次接触知识点。</b></div>' +
      '<ul class="list-reset mt"><li><b>① 主动接触</b><span class="muted">带着领先的感觉，印象格外深刻</span></li>' +
      '<li><b>② 提前识别重难点</b><span class="muted">心里有数，不会上课时头晕目眩</span></li>' +
      '<li><b>③ 带着问题听课</b><span class="muted">听课效率和专注度大大增加</span></li></ul>' +
      '<div class="note warn mt">头号误区是「我没时间」——恰恰因为一开始缺了这一步，才一步慢、步步慢。另外：<b>补断层、补漏洞也必须从预习开始，不要直接去刷题。</b></div></div>');

    h.push('<div class="card"><div class="card-head"><h2>理科四步（数学走这套）</h2></div>' +
      '<ul class="list-reset">' +
      '<li><b>1 概念 · 定义 · 定理</b><span class="muted">记住（一字不落）→ 理解（为什么、跟哪个老概念有关）→ 连接（挂到旧知识的框架上，像积木）</span></li>' +
      '<li><b>2 公式</b><span class="muted">关注推导过程，标准是「能复述出来」，不是看懂</span></li>' +
      '<li><b>3 理科语言</b><span class="muted">符号、模型、单位、图像；看到图能立刻列出 1-5 条信息</span></li>' +
      '<li><b>4 例题（母题）</b><span class="muted">带着答案也要看；重点是思路切入点，并且想「换我出题会怎么变」</span></li>' +
      '<li><b>5 卡点</b><span class="muted">必须说清「我为什么被卡住」：是新概念没懂，还是前面埋着一个洞</span></li></ul></div>');

    h.push('<div class="card"><div class="card-head"><h2>文科四步（思政、英语走这套）</h2></div>' +
      '<div class="small muted mb">核心理论是「无用即大用」：单独的知识点脆弱且无用。所以要增加它的信息来源。</div>' +
      '<ul class="list-reset">' +
      '<li><b>1 宏观结构</b><span class="muted">引言、标题、小节——等于看电影前先看剪辑</span></li>' +
      '<li><b>2 核心观点 + 核心论据 = 情境</b><span class="muted">文科最重要的因素</span></li>' +
      '<li><b>3 关键要素</b><span class="muted">人物、时间、地点、数据——注意这是第三步，不是第一步</span></li>' +
      '<li><b>4 逻辑关联</b><span class="muted">历史看时间线、政治看因果、地理看位置关系；用课本图片做记忆宫殿定位</span></li></ul>' +
      '<div class="note mt">「划重点、通读、抄写、背诵」这四个常规动作本身没错，<b>但必须一边问「为什么」一边做</b>，否则就是狗熊掰棒子。</div></div>');

    h.push('<div class="card"><div class="card-head"><h2>另外两套是这个工具为你加的</h2><span class="sub">老师原课没有</span></div>' +
      '<ul class="list-reset">' +
      '<li><b>编程</b><span class="muted">按理科框架延伸：先想清这一节解决什么问题 → 语法/API 逐个过手 → 示例代码不看原文重敲一遍 → 预测会怎么错、老师会怎么考</span></li>' +
      '<li><b>概念 / 结构</b><span class="muted">给软件工程专业导论这类课：概念地图 → 术语能用自己的话说清 → 结构/流程能画出来 → 进制、逻辑运算这类亲手算三遍</span></li></ul></div>');

    h.push('<div class="card"><div class="card-head"><h2>大学化改造对照</h2><span class="sub">视频是给中学生的，这几处换了动作</span></div>' +
      '<table style="width:100%;border-collapse:collapse" class="small"><thead><tr style="text-align:left"><th style="padding:6px 8px;border-bottom:1px solid var(--line)">老师原话 / 中学动作</th><th style="padding:6px 8px;border-bottom:1px solid var(--line)">大学里的做法</th></tr></thead><tbody>' +
      [['一字不落背定义', '保留，但加一步「圈出限定词」——大学数学定义每个字都有用'],
       ['课后习题检验', '改成课本例题 + 定理 / 公式证明'],
       ['预判中高考会怎么考', '改成预判老师会怎么讲 + 期末与作业会出什么题型'],
       ['文科背条条框框', '加一步「论述题骨架」：观点—论据—结论三句话'],
       ['例题看懂了就行', '编程里改成「不看原文自己重敲一遍」，并加一步「看这句报错怎么自己定位」']]
        .map(function (r) { return '<tr><td style="padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top">' + esc(r[0]) + '</td><td style="padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top">' + esc(r[1]) + '</td></tr>'; }).join('') +
      '</tbody></table></div>');

    h.push('<div class="card"><div class="card-head"><h2>三档带学深度 + 末尾自测</h2></div><ul class="list-reset">' +
      P.levelList.map(function (k) { return '<li><b>' + L[k].name + '</b><span class="muted">' + esc(L[k].desc) + '</span></li>'; }).join('') +
      '</ul><div class="note mt">带学阶段<b>没有倒计时、不会中途打断你</b>——背和想都需要时间。走完五步之后才是检验：3 分钟自测（遮空 + 判断 + 关联归类），不及格的条目可以一键回炉重带。</div></div>');

    h.push('<div class="card"><div class="card-head"><h2>预习对后面几步的好处</h2><span class="sub">老师原话</span></div>' +
      '<ul class="list-reset">' +
      '<li><b>听课</b><span class="muted">增强针对性；验证你的自主思考（老师讲的和你想的一样，信心和兴趣都会涨）；相当于多了一遍有效重复</span></li>' +
      '<li><b>作业</b><span class="muted">知识转成解题能力更快，不用一遍遍回头翻课本找定义</span></li>' +
      '<li><b>复习</b><span class="muted">框架已经初步搭好，复习时能把碎片快速连成体系</span></li></ul></div>');
    return h.join('');
  }

  /* ================= 数据 ================= */

  function viewData() {
    var h = [];
    var st = S.stats();
    h.push('<div class="page-title">数据</div>');
    h.push('<div class="page-sub">所有记录只存在这台电脑的浏览器里，不会上传到任何地方。换电脑或清浏览器数据前记得导出。</div>');
    h.push('<div class="card"><div class="stats">' +
      '<div class="stat"><div class="v">' + st.totalCount + '</div><div class="k">累计预习次数</div></div>' +
      '<div class="stat"><div class="v">' + st.streak + '</div><div class="k">连续天数</div></div>' +
      '<div class="stat"><div class="v">' + st.blockers + '</div><div class="k">累计卡点</div></div>' +
      '<div class="stat"><div class="v">' + st.solved + '</div><div class="k">已解决</div></div>' +
      '</div></div>');

    h.push('<div class="card"><div class="card-head"><h2>云同步</h2><span class="sub">手机和电脑填同一个同步码</span></div>');
    if (location.protocol === 'file:') {
      h.push('<div class="note warn">现在是从本地文件打开的，没有云端接口。用手机版网址打开时才有。</div>');
    } else if (location.hostname.indexOf('github.io') >= 0) {
      h.push('<div class="note warn">当前是 GitHub Pages 部署，<b>不支持云同步</b>（它只能放静态文件）。手机和电脑之间请用下面的「导出备份 / 导入备份」搬运数据；要云同步就得另外发布到 Netlify。</div>');
    }
    h.push('<label class="fld"><span class="lbl">同步码（6–32 位字母数字，自己定，别太好猜）</span><input type="text" id="sync-code" value="' + esc(S.getSyncCode()) + '" placeholder="例：yuxi-2026"></label>');
    h.push('<div class="btn-row"><button class="btn primary" data-act="sync-save">保存同步码</button>' +
      '<button class="btn" data-act="sync-pull">从云端拉取</button>' +
      '<button class="btn" data-act="sync-push">上传到云端</button></div>');
    h.push('<div class="small muted mt-s" id="sync-status">' + (S.getSyncCode() ? '已保存同步码：' + esc(S.getSyncCode()) : '还没设置同步码') + '</div></div>');

    h.push('<div class="card"><div class="card-head"><h2>导出备份</h2></div>' +
      '<div class="small muted mb">导出一个 JSON 文件，包含课程设置、所有预习记录、卡点与线下验证结果。</div>' +
      '<div class="btn-row"><button class="btn" data-act="export-json">导出备份文件（自选保存位置）</button>' +
      '<button class="btn" data-act="copy-json">复制到剪贴板</button>' +
      '<button class="btn" data-act="export-txt">导出「卡点总清单」（纯文本，可打印）</button></div></div>');

    h.push('<div class="card"><div class="card-head"><h2>导入备份</h2></div>' +
      '<div class="small muted mb">把之前导出的 JSON 内容粘贴进来。合并＝保留现有记录再补上备份里的（同一条不会重复）；覆盖＝完全用备份替换。</div>' +
      '<textarea id="imp-box" placeholder="把备份 JSON 粘贴到这里…"></textarea>' +
      '<div class="btn-row mt-s"><button class="btn" data-act="import-merge">合并导入</button>' +
      '<button class="btn danger" data-act="import-replace">覆盖导入</button></div></div>');

    h.push('<div class="card"><div class="card-head"><h2>内容来源</h2></div>' +
      '<div class="small muted">' + esc(window.CURRICULUM.plan) + '（课程与学分取自 2024 版培养方案，已逐模块核对）。<br>' +
      '任务单内容按国内主流权威教材整理：同济《高等数学》第七版、高等教育出版社《C 语言程序设计》、《思想道德与法治》2023 年版、清华大学出版社《计算机导论》。<br>' +
      '凡我不能确证是课本原句的条目，界面上都会标「⚠ 需核对课本原句」，你点「改成我课本上的原句」改一次，以后就一直用你写的版本。</div></div>');

    h.push('<div class="card"><div class="card-head"><h2>清空</h2></div>' +
      '<div class="small muted mb">会把课程设置、所有预习记录、卡点全部删掉。导入过备份再动手。</div>' +
      '<button class="btn danger" data-act="reset-all">清空全部数据</button></div>');
    return h.join('');
  }
  /* ================= 云同步 ================= */

  function syncReady() { return location.protocol !== 'file:'; }

  function setSyncStatus(msg, bad) {
    var el = document.getElementById('sync-status');
    if (el) { el.textContent = msg; el.style.color = bad ? 'var(--bad)' : ''; }
  }

  function syncPull(silent) {
    var code = S.getSyncCode();
    if (!syncReady()) { setSyncStatus('本地打开时不可用，请用 Netlify 网址', true); return Promise.resolve(false); }
    if (!code) { setSyncStatus('先填同步码并保存', true); return Promise.resolve(false); }
    setSyncStatus('正在拉取…');
    return fetch('/.netlify/functions/sync?code=' + encodeURIComponent(code))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) throw new Error(d.hint || d.error);
        if (!d.data) { setSyncStatus('云端还没有数据（先上传一次）'); return false; }
        var r = S.mergeRemote(d.data);
        setSyncStatus('已拉取：新增 ' + r.added + ' 条，合并 ' + r.merged + ' 条');
        render();
        if (!silent) toast('同步完成');
        return true;
      })
      .catch(function (e) { setSyncStatus('拉取失败：' + e.message, true); if (!silent) toast('拉取失败'); return false; });
  }

  function syncPush() {
    var code = S.getSyncCode();
    if (!syncReady()) { setSyncStatus('本地打开时不可用，请用 Netlify 网址', true); return Promise.resolve(false); }
    if (!code) { setSyncStatus('先填同步码并保存', true); return Promise.resolve(false); }
    setSyncStatus('正在上传…');
    return fetch('/.netlify/functions/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: code, data: S.snapshot() })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) throw new Error(d.hint || d.error);
        setSyncStatus('已上传（rev ' + d.rev + '）');
        toast('已上传到云端');
        return true;
      })
      .catch(function (e) { setSyncStatus('上传失败：' + e.message, true); toast('上传失败'); return false; });
  }

  /* ================= 应用级交互 ================= */

  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  function download(name, text) {
    // 优先让用户自己选保存位置（Chrome / Edge 支持），默认建议存到项目的「备份」目录
    if (window.showSaveFilePicker) {
      window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'JSON 备份', accept: { 'application/json': ['.json'] } }]
      }).then(function (h) {
        return h.createWritable();
      }).then(function (w) {
        return w.write(text).then(function () { return w.close(); });
      }).then(function () { toast('已保存'); })
        .catch(function () { toast('已取消'); });
      return;
    }
    var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    toast('已导出：' + name + '（建议手动挪到 D:\\Codex\\学习方法构建体系\\预习\\备份\\）');
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]');
    if (!t || App.route === 'preview') return;
    var act = t.dataset.act, id = t.dataset.id;
    if (t.dataset.app) return;

    if (act === 'resume') { window.Flow.resume(); return; }
    if (act === 'dropdraft') { if (confirm('丢掉这次未完成的预习？')) { window.Flow.discard(); render(); } return; }
    if (act === 'pick-course') { if (S.enabledCourses().length) { App.temp = { courseId: id, mode: 'new' }; go('preview'); } else toast('先在课程设置里启用至少一门课'); return; }
    if (act === 'go-verify') { go('verify'); return; }
    if (act === 'go-backfill') { go('backfill', { sessionId: id }); return; }
    if (act === 'nav-back') { go('courses'); return; }

    if (act === 'newcourse') { go('course-edit', { id: '' }); return; }
    if (act === 'edit-course') { go('course-edit', { id: id }); return; }
    if (act === 'toggle-course') {
      var c = S.course(id); if (c) { S.upsertCourse({ id: id, enabled: t.dataset.on === '1' }); render(); }
      return;
    }
    if (act === 'apply-recommend') {
      var imp = val('ce-imp'), cr = parseFloat(val('ce-credits')) || 0;
      var lv = window.recommendLevel(imp, cr);
      var sel = document.getElementById('ce-level');
      if (sel) sel.value = lv;
      toast('按规则推荐：' + L[lv].name);
      return;
    }
    if (act === 'save-course') {
      var name = (val('ce-name') || '').trim();
      if (!name) { toast('课程名称不能空着'); return; }
      var rec = {
        id: id || S.uid('c'),
        name: name,
        credits: parseFloat(val('ce-credits')) || 0,
        category: (val('ce-cat') || '').trim(),
        textbook: (val('ce-book') || '').trim(),
        track: val('ce-track'),
        importance: val('ce-imp'),
        level: val('ce-level'),
        enabled: document.getElementById('ce-enabled').checked,
        why: (val('ce-why') || '').trim()
      };
      S.upsertCourse(rec);
      toast('已保存');
      go('courses');
      return;
    }
    if (act === 'del-course') {
      if (confirm('删掉这门课？（已有的预习记录会保留）')) { S.deleteCourse(id); go('courses'); }
      return;
    }
    if (act === 'imp-sem') {
      var n = S.importCurriculum(Number(t.dataset.n));
      render();
      toast(n ? '导入了 ' + n + ' 门课' : '这个学期的课已经在列表里了');
      return;
    }

    if (act === 'sync-save') {
      var sc = (val('sync-code') || '').trim();
      if (!/^[A-Za-z0-9_-]{6,32}$/.test(sc)) { toast('同步码要 6–32 位字母或数字'); return; }
      S.setSyncCode(sc);
      setSyncStatus('已保存同步码：' + sc);
      toast('已保存');
      return;
    }
    if (act === 'sync-pull') { syncPull(false); return; }
    if (act === 'sync-push') { syncPush(); return; }
    if (act === 'export-json') { download('预习教练-备份-' + S.today() + '.json', S.exportText()); return; }
    if (act === 'copy-json') {
      var txt = S.exportText();
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast('已复制，粘到记事本另存即可'); }, function () { toast('复制失败，请用「导出」按钮'); });
      else toast('这个浏览器不支持一键复制，请用「导出」按钮');
      return;
    }
    if (act === 'export-txt') {
      var done = S.sessions().filter(function (s) { return s.finishedAt; });
      var lines = ['预习卡点总清单 · 导出时间 ' + new Date().toLocaleString('zh-CN'), ''];
      done.forEach(function (s) {
        lines.push('— ' + s.courseName + (s.taskTitle ? ' · ' + s.taskTitle : '') + '（' + new Date(s.finishedAt).toLocaleDateString('zh-CN') + '，用时 ' + mmss(s.elapsedSecs) + '）');
        (s.blockers || []).forEach(function (b) {
          lines.push('  [卡点] ' + b.text + (b.reason ? '（' + (b.reason === 'newConcept' ? '新概念没懂' : '前置有洞') + '）' : '') + ' → ' + (b.resolved === 'yes' ? '已解决' : b.resolved === 'no' ? '还没解决' : b.resolved === 'wrongbook' ? '转成错题' : '未回填'));
        });
        (s.predictions || []).forEach(function (p) {
          lines.push('  [预判] ' + p.text + ' → ' + (p.mark === 'match' ? '和我猜的一样' : p.mark === 'missed' ? '老师讲了但我没想到' : p.mark === 'notCovered' ? '老师没讲到' : '未验证'));
        });
        lines.push('');
      });
      download('预习卡点清单-' + S.today() + '.txt', lines.join('\n'));
      return;
    }
    if (act === 'import-merge' || act === 'import-replace') {
      var box = document.getElementById('imp-box');
      var raw = box ? box.value.trim() : '';
      if (!raw) { toast('先把备份内容粘进来'); return; }
      try {
        var r = S.importText(raw, act === 'import-replace' ? 'replace' : 'merge');
        render();
        toast('导入完成：课程 ' + r.courses + ' 门，记录 ' + r.sessions + ' 条');
      } catch (e) { toast('导入失败：' + e.message); }
      return;
    }
    if (act === 'reset-all') {
      if (confirm('确定清空全部数据？这一步无法撤销。') && confirm('再确认一次：课程设置和所有预习记录都会被删除。')) {
        S.resetAll();
        if (window.Flow) window.Flow.discard();
        render();
        toast('已清空');
      }
      return;
    }
  });

  /* ================= 启动 ================= */

  function boot() {
    S.load();
    if (S.getSyncCode() && syncReady()) { syncPull(true); }
    if (S.getDraft()) App.route = 'home';
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
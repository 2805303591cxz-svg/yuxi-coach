/* 预习教练 v2 · 带学流程（卡片式，一步一步带）
   带学阶段不计时；末尾的自测才计时 3 分钟。
*/
(function () {
  var P = window.PREP, L = window.LEVELS, S = window.Store, C = window.Coach;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lvName(k) { return (L[k] || L.standard).short; }

  var draft = null, root = null, timer = null, saveTimer = null, notice = '';

  function kindOf(source) {
    if (source === 'formulas') return 'formula';
    if (source === 'visuals') return 'visual';
    if (source === 'examples') return 'example';
    return 'definition';
  }

  /* ---------------- 草稿 ---------------- */

  function buildDraft(cfg) {
    var task = cfg.taskId ? (window.PREVIEW_TASKS || []).filter(function (t) { return t.id === cfg.taskId; })[0] : null;
    var steps = (task && task.reader) ? readerSteps(task, cfg.level) : P.planSteps(cfg.track, cfg.level);
    return {
      id: S.uid('s'), v: 2,
      courseId: cfg.courseId, courseName: cfg.courseName, credits: cfg.credits,
      track: cfg.track, level: cfg.level, mode: cfg.mode || 'new',
      taskId: task ? task.id : null,
      taskTitle: task ? task.title : null,
      taskChapter: task ? task.chapter : null,
      textbook: task ? task.textbook : null,
      banner: task ? (task.banner || '') : '',
      goal: task ? (task.goal || '') : '',
      startedAt: Date.now(),
      plannedSecs: steps.reduce(function (a, s) { return a + s.secs; }, 0),
      totalSpent: 0, stepIdx: 0,
      steps: steps.filter(function (s) {
        return s.kind !== 'quiz' || (task && (task.classQuestions || []).length);
      }).map(function (s) { return initStep(s, task, cfg); }),
      blockers: [], classTasks: [],
      predictions: task ? (task.predictions || []).map(function (t) { return { id: S.uid('p'), text: t, from: 'task', mark: null }; }) : [],
      repair: { dep: '', items: '' }
    };
  }

  // v3：整章呈现 → 背诵 → 复写 →（抢答）→ 卡点 → 自测
  function readerSteps(task, level) {
    var out = [
      { key: 'read', kind: 'read', title: '本节呈现', secs: 600, hint: '先读一遍。只读，不要求作答；读完去做动手清单。' }
    ];
    if (task.reader.checklist && (task.reader.checklist.items || []).length) {
      out.push({ key: 'checklist', kind: 'checklist', title: '动手清单', secs: 300, hint: '纸上写、IDE 里敲。做完打勾，工具不判分。' });
    }
    if ((task.classQuestions || []).length) out.push({ key: 'quiz', kind: 'quiz', title: '课堂抢答题', secs: 300, hint: '课件原题，抢答算平时分。' });
    out.push({ key: 'blocker', kind: 'blocker', title: '卡点与收尾', secs: 180, hint: '' });
    out.push({ key: 'selftest', kind: 'selftest', title: '自测 · 3 分钟', secs: 180, hint: '' });
    return out;
  }

  function initStep(s, task, cfg) {
    var st = {
      key: s.key, title: s.title, hint: s.hint || '', kind: s.kind,
      secs: s.secs, spent: 0, status: 'todo', data: {},
      prompt: s.label ? { label: s.label, ph: s.ph || '' } : null,
      revealFrom: s.revealFrom || null,
      source: s.source || null, addLabel: s.addLabel || null, addPh: s.addPh || '',
      itemTitle: s.itemTitle || 'title', itemDetail: s.itemDetail || null
    };

    if (s.kind === 'items') {
      var src = (task && task[s.source]) || [];
      var limit = cfg.level === 'light' ? 2 : (cfg.level === 'deep' ? 99 : 3);
      st.kindOfItem = kindOf(s.source);
      st.data.entries = src.slice(0, limit).map(function (it, i) { return makeEntry(st, it, i, task, cfg.level); });
      st.data.ei = 0;
      st.data.hidden = Math.max(0, src.length - limit);
      st.data.total = src.length;
    } else if (s.kind === 'prompt') {
      st.data.prompt = ''; st.data.revealed = false;
      st.data.revealList = (s.revealFrom && task && Array.isArray(task[s.revealFrom])) ? task[s.revealFrom].slice(0) : [];
    } else if (s.kind === 'read') {
      st.data.reader = task ? task.reader : null;
      st.data.minutes = (task && task.reader && task.reader.minutes) || 0;
    } else if (s.kind === 'checklist') {
      st.data.items = (task && task.reader && task.reader.checklist && task.reader.checklist.items) || [];
      st.data.done = {};
      st.data.title = (task && task.reader && task.reader.checklist && task.reader.checklist.title) || '动手清单';
    } else if (s.kind === 'recite' || s.kind === 'rewrite') {
      var rc = (task && task.reader && task.reader[s.kind]) || { items: [] };
      st.data.mode = rc.mode || 'char';
      st.data.instruction = rc.instruction || '';
      st.data.items = rc.items || [];
      st.data.i = 0;
      st.data.st = {};
      st.data.total = st.data.items.length;
    } else if (s.kind === 'quiz') {
      var allQ = (task && task.classQuestions) || [];
      var lim = cfg.level === 'light' ? 2 : allQ.length;
      st.data.qs = allQ.slice(0, lim);
      st.data.qi = 0;
      st.data.st = {};
      st.data.total = allQ.length;
      st.data.hidden = Math.max(0, allQ.length - lim);
    } else if (s.kind === 'selftest') {
      st.data.qs = (task && window.Coach) ? C.selftest(task) : [];
      st.data.answers = {};
      st.data.submitted = false;
      st.data.left = 180;
      st.data.score = null;
    }
    return st;
  }

  function makeEntry(st, it, i, task, level) {
    var manual = (it && it.__manual);
    var title = manual ? it.title : (it[st.itemTitle] || ('第 ' + (i + 1) + ' 条'));
    var detail = '';
    var canOverride = (st.source === 'definitions') && (st.itemDetail === 'verbatim');
    if (st.itemDetail && it[st.itemDetail] !== undefined) {
      var raw = it[st.itemDetail];
      if (canOverride && task) { var ov = S.getOverride(task.id, 'def:' + i); if (ov) raw = ov; }
      detail = Array.isArray(raw) ? raw.join('\n') : (raw || '');
    }
    var item = Object.assign({}, it, { verbatim: it.verbatim || it.statement || detail || '' });
    return {
      idx: i, title: title, detail: detail, meta: manual ? '' : (it.source || ''),
      needCheck: manual ? false : !!it.needCheck, canOverride: canOverride && !!detail,
      kind: st.kindOfItem || 'definition',
      cards: C.plan(st.kindOfItem || 'definition', item, level),
      ci: 0, cst: {}, done: false, manual: manual
    };
  }
  /* ---------------- 准备页 ---------------- */

  function renderSetup(courseId) {
    var A = window.App;
    var courses = S.enabledCourses();
    var course = courseId ? S.course(courseId) : null;
    if (!course && courses.length) course = courses[0];
    var tasks = (window.PREVIEW_TASKS || []).filter(function (t) { return course && t.course === course.name; });
    var lvl = A.temp.level || (course ? (course.level || 'standard') : 'standard');
    if (lvl === 'quick') lvl = 'standard';
    var mode = A.temp.mode || 'new';
    var taskId = (A.temp.taskId === undefined) ? (tasks.length ? tasks[0].id : '') : A.temp.taskId;

    var h = [];
    h.push('<div class="page-title">开始预习</div>');
    h.push('<div class="page-sub">我会一条一条带着你：读一遍 → 拆段 → 理解三问 → 挖空 → 复述 → 关联 → 一句话收束。带学不打断你，走完再自测。</div>');

    h.push('<div class="card"><div class="card-head"><h2>第 1 步 · 哪门课</h2><span class="sub">' + courses.length + ' 门在用</span></div><div class="grid">');
    courses.forEach(function (c) {
      var on = course && c.id === course.id;
      h.push('<button class="btn" data-act="pick-course" data-id="' + c.id + '" style="text-align:left;display:block;padding:11px 13px;' + (on ? 'border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);' : '') + '">' +
        '<div style="font-weight:640">' + esc(c.name) + '</div>' +
        '<div class="small muted" style="margin-top:3px">' + c.credits + ' 学分 · ' + esc(window.IMPORTANCE_NAME[c.importance] || '') + ' · ' + lvName(c.level) + '</div>' +
        (c.textbook ? '<div class="tiny faint" style="margin-top:2px">' + esc(c.textbook) + '</div>' : '') +
        '</button>');
    });
    h.push('</div></div>');

    h.push('<div class="card"><div class="card-head"><h2>第 2 步 · 哪种预习</h2></div><div class="btn-row">' +
      '<button class="btn ' + (mode === 'new' ? 'primary' : '') + '" data-act="pick-mode" data-id="new">新课预习</button>' +
      '<button class="btn ' + (mode === 'repair' ? 'primary' : '') + '" data-act="pick-mode" data-id="repair">补断层</button></div>');
    if (mode === 'repair') h.push('<div class="note warn mt-s">补断层：先界定范围，再定位它依赖的前置概念。老师特意说过——补洞也必须从预习开始，不要直接去刷题。</div>');
    h.push('</div>');

    h.push('<div class="card"><div class="card-head"><h2>第 3 步 · 带到多深</h2><span class="sub">带学不计时</span></div><div class="btn-row">');
    P.levelList.forEach(function (k) {
      h.push('<button class="btn ' + (lvl === k ? 'primary' : '') + '" data-act="pick-level" data-id="' + k + '">' + L[k].name + '</button>');
    });
    h.push('</div><div class="small muted mt-s">' + esc(L[lvl].desc) + '</div></div>');

    h.push('<div class="card"><div class="card-head"><h2>第 4 步 · 用哪一节</h2><span class="sub">' + (tasks.length ? '这门课有 ' + tasks.length + ' 节' : '还没有预置内容') + '</span></div><div class="btn-row">');
    if (tasks.length) {
      h.push('<button class="btn ' + (!taskId ? 'primary' : '') + '" data-act="pick-task" data-id="">不用任务单，走空白流程</button>');
      var groups = {};
      tasks.forEach(function (t) {
        var k = String(t.chapter || '').split('·')[0].trim() || '其他';
        (groups[k] = groups[k] || []).push(t);
      });
      Object.keys(groups).forEach(function (k) {
        h.push('<div class="task-group"><div class="task-group-t">' + esc(k) + '</div><div class="btn-row">');
        groups[k].forEach(function (t) {
          var dis = !!t.stub;
          h.push('<button class="btn ' + (taskId === t.id ? 'primary' : '') + '" data-act="pick-task" data-id="' + t.id + '"' +
            (dis ? ' disabled title="这一节还没写"' : '') + ' style="text-align:left;display:block">' +
            '<div style="font-weight:620">' + esc(t.title) + '</div>' +
            '<div class="tiny ' + (dis ? 'faint' : 'muted') + '">' + (dis ? '待补' : (t.minutes ? '约 ' + t.minutes + ' 分钟' : '')) + '</div>' +
            '</button>');
        });
        h.push('</div></div>');
      });
    } else {
      h.push('<div class="note">这门课还没有预置任务单，直接走空白流程也能用：每步会告诉你该做什么，条目自己现场加。</div>');
    }
    h.push('</div>');
    var picked = tasks.filter(function (t) { return t.id === taskId; })[0];
    if (picked) {
      h.push('<div class="hr"></div><div class="small"><b>本节目标：</b>' + esc(picked.goal) + '</div>');
      if (picked.banner) h.push('<div class="note mt-s">' + esc(picked.banner) + '</div>');
      h.push('<div class="tiny muted mt-s">来源：' + esc(picked.textbook) + ' · ' + esc(picked.chapter) + '</div>');
    }
    h.push('</div>');

    h.push('<div class="btn-row"><button class="btn primary lg" data-act="begin" ' + (course ? '' : 'disabled') + '>开始带学 · ' + L[lvl].name + '</button>' +
      '<button class="btn ghost" data-act="home">返回首页</button></div>');
    return h.join('');
  }

  /* ---------------- 运行页 ---------------- */

  function renderRun() {
    var st = draft.steps[draft.stepIdx];
    var track = window.TRACKS[draft.track] || window.TRACKS.none;
    var h = [];
    h.push('<div class="card tight"><div class="row between">' +
      '<div><div style="font-weight:640">' + esc(draft.courseName) + '</div>' +
      '<div class="tiny muted">' + esc(track.name) + ' · ' + L[draft.level].name + ' · ' + (draft.mode === 'repair' ? '补断层' : '新课预习') +
      (draft.taskTitle ? ' · ' + esc(draft.taskTitle) : '') + '</div></div>' +
      '<div class="timer"><span class="tiny muted">已用</span><b id="fl-used">' + mmss(draft.totalSpent) + '</b></div></div>' +
      '<div class="progress mt-s"><i id="fl-bar" style="width:' + Math.round(100 * (draft.stepIdx / Math.max(1, draft.steps.length - 1))) + '%"></i></div></div>');

    if (notice) h.push('<div class="note warn mb">' + esc(notice) + '</div>');

    h.push('<div class="steps">');
    draft.steps.forEach(function (s, i) {
      var cls = i === draft.stepIdx ? 'cur' : (s.status === 'done' ? 'done' : (s.status === 'skipped' ? 'skip' : ''));
      h.push('<span class="step-chip ' + cls + '" data-act="goto" data-idx="' + i + '">' + (i + 1) + '. ' + esc(s.title) + '</span>');
    });
    h.push('</div>');

    h.push('<div class="card">');
    if (st.kind !== 'items') {
      h.push('<div class="step-head"><div><div class="step-title">' + esc(st.title) + '</div>' +
        (st.hint ? '<div class="step-hint">' + esc(st.hint) + '</div>' : '') + '</div></div>');
    }
    if (st.kind === 'items') h.push(renderCoach(st));
    else if (st.kind === 'prompt') h.push(renderPrompt(st));
    else if (st.kind === 'blocker') h.push(renderBlocker(st));
    else if (st.kind === 'read') h.push(renderRead(st));
    else if (st.kind === 'checklist') h.push(renderChecklist(st));
    else if (st.kind === 'recite' || st.kind === 'rewrite') h.push(renderMemory(st));
    else if (st.kind === 'quiz') h.push(renderQuiz(st));
    else if (st.kind === 'selftest') h.push(renderSelftest(st));
    h.push('</div>');

    h.push('<div class="row between run-actions"><div class="btn-row">');
    if (draft.stepIdx > 0) h.push('<button class="btn ghost" data-act="prev">上一步</button>');
    if (st.kind !== 'blocker' && st.kind !== 'selftest') h.push('<button class="btn ghost" data-act="skip">跳过这一步</button>');
    h.push('<button class="btn ghost danger" data-act="abort">放弃这次</button></div>');
    if (draft.stepIdx === draft.steps.length - 1) h.push('<button class="btn primary lg" data-act="finish">' + (draft.mode === 'repair' ? '完成补洞' : '完成预习') + ' · 打卡</button>');
    else h.push('<button class="btn primary" data-act="next">下一步 →</button>');
    h.push('</div>');
    return h.join('');
  }
  /* ---------------- 带学卡片 ---------------- */

  function btn(act, label, cls) {
    return '<button class="btn ' + (cls || '') + ' mt-s" data-act="' + act + '">' + label + '</button>';
  }

  function tplHTML(tpl, cs) {
    var parts = String(tpl || '').split(/\[\[(\d+)\]\]/g);
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        var n = parts[i];
        var v = (cs.vals && cs.vals[n]) || '';
        var ok = cs.checked ? (C.norm(v) === C.norm((cs.correct || {})[n] || '')) : null;
        var cls = ok === null ? '' : (ok ? ' ok' : ' bad');
        out += '<input class="blank-input' + cls + '" type="text" size="6" data-field="cblank" data-b="' + n + '" value="' + esc(v) + '" autocomplete="off">';
      } else {
        out += esc(parts[i]);
      }
    }
    return out;
  }

  function renderCoach(st) {
    var e = st.data.entries[st.data.ei];
    if (!e) return '<div class="empty">这张单子没有可带学的条目。</div>';
    var c = e.cards[e.ci];
    if (!c) { e.ci = 0; c = e.cards[0]; }
    var cs = e.cst[c.key] || (e.cst[c.key] = {});
    var h = [];
    h.push('<div class="row between mb-s">' +
      '<div class="small muted">' + esc(st.title) + ' · 第 ' + (st.data.ei + 1) + ' / ' + st.data.entries.length + ' 条</div>' +
      '<div class="small muted">环节 ' + (e.ci + 1) + ' / ' + e.cards.length + '</div></div>');
    h.push('<div class="coach-name">' + esc(e.title) + (e.needCheck ? ' <span class="tag warn">需核对课本原句</span>' : '') + '</div>');
    h.push('<div class="progress mb"><i style="width:' + Math.round(100 * e.ci / Math.max(1, e.cards.length)) + '%"></i></div>');
    h.push('<div class="coach-title">' + esc(c.title) + '</div>');
    h.push(cardBody(e, c, cs));
    if (st.data.hidden > 0 && e.ci === 0 && c.key === 'read') {
      h.push('<div class="tiny faint mt-s">本次档位只带前 ' + st.data.entries.length + ' 条，还有 ' + st.data.hidden + ' 条没带——先按深度走完。</div>');
    }
    return h.join('');
  }

  function cardBody(e, c, cs) {
    var h = [];
    if (c.t === 'text') {
      h.push('<div class="coach-body">' + nl2br(c.body || '') + '</div>');
      if (c.note) h.push('<div class="small muted mt-s">' + esc(c.note) + '</div>');
      h.push(btn('coach-next', '继续', 'primary'));
      return h.join('');
    }

    if (c.t === 'ask') {
      if (c.body) h.push('<div class="reveal">' + nl2br(c.body) + '</div>');
      h.push('<div class="ask-q">' + esc(c.q || '') + '</div>');
      if (c.hint) h.push('<div class="small faint">提示：' + esc(c.hint) + '</div>');
      h.push('<textarea data-field="cask" placeholder="先自己答一句，写不完整也没关系">' + esc(cs.input || '') + '</textarea>');
      if (!cs.revealed) h.push(btn('coach-reveal', '我答好了，看参考'));
      else {
        if (c.answer) h.push('<div class="reveal"><b>参考</b><br>' + nl2br(c.answer) + '</div>');
        if (c.counter) h.push('<div class="note warn">少了这个条件会怎样：' + esc(c.counter) + '</div>');
        h.push(btn('coach-next', '继续', 'primary'));
      }
      return h.join('');
    }

    if (c.t === 'blank') {
      if (!cs.correct) {
        cs.correct = {};
        (c.answers || []).forEach(function (a, i) { cs.correct[i + 1] = a; });
      }
      h.push('<div class="blank-tpl">' + tplHTML(c.tpl, cs) + '</div>');
      if (c.hint) h.push('<div class="small faint mt-s">' + esc(c.hint) + '</div>');
      if (!cs.checked) h.push(btn('coach-check-blank', '对答案', 'primary'));
      else {
        var rows = [];
        (c.answers || []).forEach(function (a, i) {
          var got = (cs.vals || {})[i + 1] || '';
          var ok = C.norm(got) === C.norm(a);
          rows.push('<div class="blank-row">' + (ok ? '<span class="tag ok">✓</span>' : '<span class="tag bad">✗</span>') +
            ' 第 ' + (i + 1) + ' 空：<b>' + esc(a) + '</b>' + (ok ? '' : ' <span class="tiny muted">（你写的是「' + esc(got || '空') + '」）</span>') + '</div>');
        });
        h.push('<div class="reveal">' + rows.join('') + '</div>');
        h.push(btn('coach-next', '继续', 'primary'));
      }
      return h.join('');
    }

    if (c.t === 'recall') {
      h.push('<div class="small muted">合上原文，把这段完整说出来。打字或出声都行。</div>');
      h.push('<textarea data-field="crecall" placeholder="凭记忆写一遍；写不全就写多少算多少">' + esc(cs.input || '') + '</textarea>');
      if (c.cue) h.push('<div class="small faint">提示：' + esc(c.cue) + '</div>');
      if (!cs.verdict) {
        h.push(btn('coach-check-recall', '对答案', 'primary'));
        h.push(btn('coach-said', '我是出声背的，直接对照原文'));
      } else if (cs.said) {
        h.push('<div class="reveal"><b>对照原文</b><br>' + nl2br(c.target) + '</div>');
        h.push(btn('coach-next', '继续', 'primary'));
      } else {
        h.push('<div class="reveal">命中 <b>' + cs.verdict.pct + '%</b>（' + cs.verdict.hit + ' / ' + cs.verdict.total + ' 字）<div class="diff">' + cs.verdict.html + '</div></div>');
        h.push(btn('coach-next', '继续', 'primary'));
      }
      return h.join('');
    }

    if (c.t === 'link') {
      var kn = C.KINDS[c.kind] || C.KINDS.prior;
      h.push('<span class="tag ' + (c.kind === 'subject' ? 'concept' : (c.kind === 'life' ? 'humanities' : 'math')) + '">' + esc(kn) + '</span>');
      h.push('<div class="coach-body mt-s">' + esc(c.text || '') + '</div>');
      if (c.check) h.push('<div class="ask-q">' + esc(c.check) + '</div>');
      if (cs.ok === undefined || cs.ok === null) {
        h.push(btn('coach-link-ok', '这个我说得通', 'primary'));
        h.push(btn('coach-link-bad', '说不通，再讲细一点'));
      } else if (cs.ok) {
        h.push('<div class="note ok">好，这条过了。</div>');
        h.push(btn('coach-next', '继续', 'primary'));
      } else {
        h.push('<div class="reveal">' + nl2br(c.detail || c.text || '') + '</div>');
        if (!cs.blocked) h.push(btn('coach-link-blocker', '还是没懂 → 记成卡点'));
        else h.push('<div class="note warn">已记成卡点，明天带去问老师。</div>');
        h.push(btn('coach-next', '先往下走', 'primary'));
      }
      return h.join('');
    }

    if (c.t === 'summary') {
      h.push('<div class="small muted">' + esc(c.prompt || '') + '</div>');
      h.push('<textarea data-field="csum" placeholder="用你自己的话，允许不严谨">' + esc(cs.input || '') + '</textarea>');
      if (c.ref) {
        if (!cs.revealed) h.push(btn('coach-reveal', '看参考说法'));
        else h.push('<div class="reveal">' + nl2br(c.ref) + '</div>');
      }
      h.push(btn('coach-next', '完成这条', 'primary'));
      return h.join('');
    }

    if (c.t === 'selflink') {
      h.push('<div class="small muted">' + esc(c.hint || '') + '</div>');
      h.push('<textarea data-field="clink" placeholder="例：导数是变化率，物理里的速度就是位移对时间的导数"></textarea>');
      h.push(btn('coach-next', '完成这条', 'primary'));
      return h.join('');
    }

    return btn('coach-next', '继续', 'primary');
  }
  /* ---------------- 引导型步骤（文科等） ---------------- */

  function renderPrompt(st) {
    var h = [];
    h.push('<label class="fld"><span class="lbl">' + esc(st.prompt.label) + '</span>' +
      '<textarea data-field="prompt" data-step="' + esc(st.key) + '" placeholder="' + esc(st.prompt.ph) + '">' + esc(st.data.prompt || '') + '</textarea></label>');
    if (st.revealFrom) {
      if (!st.data.revealed) h.push(btn2('reveal', '先自己写完，再看参考'));
      else {
        var list = st.data.revealList || [];
        h.push('<div class="reveal"><b>参考（不是标准答案）</b><ul class="list-reset mt-s">' +
          (list.length ? list.map(function (x) { return '<li>' + revealItem(x) + '</li>'; }).join('') : '<li class="muted">这张任务单没有给参考条目。</li>') +
          '</ul></div>');
      }
    }
    return h.join('');
  }

  function btn2(act, label) { return '<button class="btn sm mt-s" data-act="' + act + '">' + label + '</button>'; }

  function revealItem(x) {
    if (typeof x === 'string') return esc(x);
    if (x && typeof x === 'object') {
      if (x.term) return '<b>' + esc(x.term) + '</b>' + (x.verbatim ? '：' + esc(x.verbatim) : '');
      if (x.name) return '<b>' + esc(x.name) + '</b>' + (x.statement ? '：' + esc(x.statement) : '');
      if (x.title) return '<b>' + esc(x.title) + '</b>' + (x.approach ? '：' + esc(x.approach) : '');
      if (x.ref) return '<b>' + esc(x.ref) + '</b>' + ((x.points || []).length ? '：' + esc(x.points.join('；')) : '');
      return esc(Object.keys(x).map(function (k) { return k + ' ' + String(x[k]); }).join('；'));
    }
    return esc(String(x));
  }

  /* ---------------- 卡点与收尾 ---------------- */

  function renderBlocker(st) {
    var h = [];
    h.push('<div class="note mb">老师说的「带着问题听课」——这一步把它变成明天能用的清单。</div>');
    var sug = suggestBlockers();
    if (sug.length) {
      h.push('<div class="blk"><div class="blk-t">刚才没答上来的，可以一键记成卡点</div><div class="btn-row">');
      sug.forEach(function (s) {
        h.push('<button class="btn sm" data-act="toblocker" data-ei="' + s.ei + '" data-ci="' + s.ci + '">+ ' + esc(s.title) + '</button>');
      });
      h.push('</div></div>');
    }

    h.push('<div class="blk"><div class="blk-t">这次的卡点（每条要说清「我为什么被卡住」）</div>');
    if (!draft.blockers.length) h.push('<div class="small muted">还没有卡点。写成「我卡在哪个具体位置」才管用。</div>');
    draft.blockers.forEach(function (b) {
      h.push('<div style="border-top:1px solid var(--line);padding-top:10px;margin-top:10px">' +
        '<input type="text" data-field="blockerText" data-bid="' + b.id + '" value="' + esc(b.text) + '">' +
        '<div class="row mt-s"><span class="tiny muted nowrap">我为什么卡：</span>');
      [['newConcept', '全新概念，缺理解基础'], ['priorHole', '前面埋着一个没搞懂的旧知识']].forEach(function (r) {
        h.push('<button class="btn sm ' + (b.reason === r[0] ? 'primary' : '') + '" data-act="reason" data-bid="' + b.id + '" data-val="' + r[0] + '">' + r[1] + '</button>');
      });
      h.push('<button class="btn sm danger" data-act="delblocker" data-bid="' + b.id + '">删掉</button></div></div>');
    });
    h.push('<div class="row mt"><input type="text" data-field="newblocker" placeholder="自己再加一条卡点" style="max-width:400px"><button class="btn sm" data-act="addblocker">+ 加卡点</button></div></div>');

    if (draft.mode === 'repair') {
      h.push('<div class="blk"><div class="blk-t">补断层 · 这个洞的前置依赖</div>' +
        '<label class="fld"><span class="lbl">要补这个洞，得先会什么？</span><input type="text" data-field="repairDep" value="' + esc(draft.repair.dep) + '"></label>' +
        '<label class="fld"><span class="lbl">具体要补哪几条？</span><textarea data-field="repairItems">' + esc(draft.repair.items) + '</textarea></label></div>');
    }

    h.push('<div class="blk"><div class="blk-t">预判：我猜老师会怎么讲</div>');
    draft.predictions.forEach(function (p) {
      h.push('<div class="row mt-s"><input type="text" data-field="predText" data-pid="' + p.id + '" value="' + esc(p.text) + '" style="flex:1;min-width:200px">' +
        '<button class="btn sm danger" data-act="delpred" data-pid="' + p.id + '">删</button></div>');
    });
    h.push('<div class="row mt"><input type="text" data-field="newpred" placeholder="我自己猜：老师一定会强调…" style="max-width:420px"><button class="btn sm" data-act="addpred">+ 加预判</button></div></div>');

    h.push('<div class="blk"><div class="blk-t">明天课堂任务清单</div>');
    h.push('<div class="small"><b>要问 / 要确认</b><ul class="list-reset mt-s">');
    if (!draft.blockers.length) h.push('<li class="muted">（还没有卡点）</li>');
    draft.blockers.forEach(function (b) { h.push('<li><span class="pill">问老师</span> ' + esc(b.text || '（空）') + '</li>'); });
    h.push('</ul></div>');
    h.push('<div class="small mt"><b>重点听</b><ul class="list-reset mt-s">');
    if (!draft.predictions.length) h.push('<li class="muted">（还没有预判）</li>');
    draft.predictions.forEach(function (p) { h.push('<li><span class="pill">重点听</span> ' + esc(p.text || '（空）') + '</li>'); });
    h.push('</ul></div>');
    draft.classTasks.forEach(function (t, i) {
      h.push('<div class="row mt-s"><input type="text" data-field="taskText" data-ti="' + i + '" value="' + esc(t) + '" style="flex:1;min-width:200px"><button class="btn sm danger" data-act="deltask" data-ti="' + i + '">删</button></div>');
    });
    h.push('<div class="row mt"><input type="text" data-field="newtask" placeholder="自己再加一条课堂任务" style="max-width:400px"><button class="btn sm" data-act="addtask">+ 加一条</button></div></div>');
    return h.join('');
  }

  function suggestBlockers() {
    var out = [];
    if (!draft.steps.length) return out;
    draft.steps.forEach(function (s) {
      if (s.kind !== 'items') return;
      (s.data.entries || []).forEach(function (e, ei) {
        var bad = e.cards && e.cards.some(function (c) { return c.t === 'blank' && e.cst[c.key] && e.cst[c.key].checked && !allBlankRight(c, e.cst[c.key]); });
        if (!bad) return;
        var tag = 'auto:' + s.key + ':' + ei;
        if (draft.blockers.some(function (b) { return b.from === tag; })) return;
        out.push({ ei: ei, ci: 0, title: (e.title || '').slice(0, 30), tag: tag });
      });
    });
    return out;
  }

  function allBlankRight(c, cs) {
    if (!cs || !cs.correct) return true;
    return (c.answers || []).every(function (a, i) {
      return C.norm((cs.vals || {})[i + 1] || '') === C.norm(a);
    });
  }
  /* ---------------- 整章呈现 ---------------- */

  function renderRead(st) {
    var r = st.data.reader;
    if (!r) return '<div class="note warn">这一节还没有呈现内容。</div>';
    var meta = st.data.minutes ? '<div class="rd-meta">本节目标 ' + st.data.minutes + ' 分钟 · 只读，不要求作答</div>' : '';
    return meta + '<button class="btn sm rd-toc-btn" data-act="toggle-toc" style="display:none">☰ 本节目录</button>' + window.Reader.render(r) +
      '<div class="rd-foot">读完了？下一步开始背诵——呈现页会收起来，靠记忆写。</div>';
  }

  /* ---------------- 动手清单 ---------------- */

  function renderChecklist(st) {
    var d = st.data;
    var done = Object.keys(d.done || {}).filter(function (k) { return d.done[k]; }).length;
    var h = [];
    h.push('<div class="row between mb-s"><div class="small muted">' + esc(d.title || '动手清单') + '</div>' +
      '<div class="small muted">已完成 ' + done + ' / ' + d.items.length + '</div></div>');
    h.push('<div class="small muted mb">这些在纸上写、在 IDE 里敲。工具只记你做完没有，不判分。</div>');
    h.push('<ul class="ck-list">');
    (d.items || []).forEach(function (x, i) {
      h.push('<li><label class="ck-item"><input type="checkbox" data-field="ck" data-i="' + i + '"' + (d.done[i] ? ' checked' : '') + '> <span>' + esc(x) + '</span></label></li>');
    });
    h.push('</ul>');
    if (d.items.length && done === d.items.length) h.push('<div class="note ok mt">清单全部完成。</div>');
    return h.join('');
  }

  /* ---------------- 背诵 / 复写（同一种交互，比对模式不同） ---------------- */

  function renderMemory(st) {
    var d = st.data;
    if (!d.items || !d.items.length) return '<div class="note">这一步没有条目。</div>';
    var it = d.items[d.i];
    var cs = d.st[d.i] || (d.st[d.i] = {});
    var isRe = st.kind === 'recite';
    var mode = it.mode || d.mode;
    var h = [];
    h.push('<div class="row between mb-s"><div class="small muted">' + (isRe ? '背诵' : '复写') + ' · 第 ' + (d.i + 1) + ' / ' + d.items.length + ' 条</div>' +
      '<div class="small muted">' + (mode === 'char' ? '逐字比对' : (mode === 'code' ? '代码比对' : '关键词命中')) + '</div></div>');
    if (d.instruction) h.push('<div class="small muted mb-s">' + esc(d.instruction) + '</div>');
    h.push('<div class="coach-title">' + esc(it.title || '') + '</div>');
    if (it.prompt) h.push('<div class="quiz-q">' + nl2br(it.prompt) + '</div>');
    if (it.hint) h.push('<div class="small faint">提示：' + esc(it.hint) + '</div>');
    h.push('<textarea data-field="mem" data-i="' + d.i + '" class="mem-input' + (mode === 'code' ? ' mem-code' : '') + '" placeholder="' +
      esc(isRe ? '合上原文，凭记忆写下来' : '默写这里要求的内容') + '">' + esc(cs.input || '') + '</textarea>');
    if (!cs.verdict) {
      h.push(btn('mem-check', '对答案', 'primary'));
    } else {
      var v = cs.verdict;
      h.push('<div class="reveal"><b>命中 ' + v.pct + '%</b>' +
        (mode === 'keyword' ? '（关键词 ' + v.hit + ' / ' + v.total + '）' : '') +
        (v.html ? '<div class="diff">' + v.html + '</div>' : '') +
        (v.missing && v.missing.length ? '<div class="small warn-text mt-s">漏掉：' + v.missing.map(esc).join('、') + '</div>' : '') +
        '<div class="src">原文对照</div><div class="rd-quote mt-s">' + nl2br(it.target || '') + '</div>' +
        '</div>');
      h.push(btn('mem-next', (d.i < d.items.length - 1 ? '下一条' : '完成这一步'), 'primary'));
    }
    return h.join('');
  }

  /* ---------------- 课堂抢答题 ---------------- */

  function renderQuiz(st) {
    var d = st.data;
    if (!d.qs || !d.qs.length) return '<div class="note">这张单子还没有课件题。</div>';
    var q = d.qs[d.qi];
    var cs = d.st[q.n] || (d.st[q.n] = {});
    var h = [];
    h.push('<div class="row between mb-s"><div class="small muted">第 ' + (d.qi + 1) + ' / ' + d.qs.length + ' 题</div>' +
      '<div class="small muted">课件 p' + q.page + ' · ' + esc(q.kind || '') + '</div></div>');
    if (d.hidden > 0) h.push('<div class="tiny faint mb-s">轻档只看前 ' + d.qs.length + ' 题，还有 ' + d.hidden + ' 题。</div>');

    h.push('<div class="quiz-q">' + nl2br(q.q || '') + '</div>');
    if (q.code) h.push('<pre class="quiz-code">' + esc(q.code) + '</pre>');
    if (q.options && q.options.length) {
      h.push('<div class="opts">');
      q.options.forEach(function (o) { h.push('<div class="opt" style="cursor:default">' + esc(o) + '</div>'); });
      h.push('</div>');
    }
    if (q.points) h.push('<div class="tiny faint mt-s">考点：' + esc(q.points) + '</div>');

    h.push('<textarea data-field="qthink" placeholder="先自己想（30 秒），写下你的答案或思路；想不出就写“不会”">' + esc(cs.input || '') + '</textarea>');
    if (draft.level === 'deep') h.push('<textarea data-field="qoral" placeholder="深档：口述一遍完整解法（写关键词即可）">' + esc(cs.oral || '') + '</textarea>');

    if (!cs.revealed) {
      h.push(btn('quiz-reveal', '看答案'));
    } else {
      h.push('<div class="reveal"><b>答案</b><br>' + nl2br(q.answer || '') +
        '<div class="src">' + (q.answerFrom === '课件' ? '出自课件 p' + q.page : '课件未给答案，这条是我补的') + '</div></div>');
      if (q.explain) h.push('<div class="note mt-s">' + nl2br(q.explain) + '</div>');
      if (cs.result === undefined) {
        h.push(btn('quiz-ok', '我答对了', 'primary'));
        h.push(btn('quiz-bad', '没答上来 → 记成卡点'));
      } else if (cs.result === 'bad') {
        h.push('<div class="note warn">已记成卡点，明天课上重点抢这道。</div>');
        h.push(btn('quiz-next', '下一题', 'primary'));
      } else {
        h.push('<div class="note ok">答对了，过。</div>');
        h.push(btn('quiz-next', '下一题', 'primary'));
      }
    }
    return h.join('');
  }

  /* ---------------- 3 分钟自测 ---------------- */

  function renderSelftest(st) {
    var d = st.data;
    var h = [];
    if (!d.qs.length) return '<div class="note">这一节没有可自测的定义。带学做完了，直接点下一步。</div>';

    if (d.submitted) {
      var s = d.score || { right: 0, total: d.qs.length };
      h.push('<div class="row between mb"><div class="small muted">自测结果</div>' +
        '<div style="font-size:22px;font-weight:700">' + s.right + ' / ' + s.total + '</div></div>');
      d.qs.forEach(function (q, i) {
        var ok = !!q._ok;
        h.push('<div class="q"><div class="q-t">' + (ok ? '<span class="tag ok">✓</span>' : '<span class="tag bad">✗</span>') +
          ' <span class="pill">' + esc(q.from || '') + '</span> ' + (ok ? '答对' : '需要回炉') + '</div>');
        if (q.type === 'blank') {
          h.push('<div class="small muted">正确内容：' + esc((q.answers || []).join(' / ')) + '</div>');
        } else {
          h.push('<div class="small muted">正确答案：' + esc(q.correct) + '</div>');
        }
        if (!ok && q.from) h.push('<button class="btn sm mt-s" data-act="requiz" data-term="' + esc(q.from) + '">回炉再带一遍</button>');
        h.push('</div>');
      });
      if (s.right === s.total) h.push('<div class="note ok mt">全对。这条可以放心了。</div>');
      h.push('<button class="btn mt-s" data-act="retest">重新自测</button>');
      return h.join('');
    }

    h.push('<div class="row between mb"><div class="small muted">' + d.qs.length + ' 道题 · 3 分钟内交卷</div>' +
      '<div class="timer' + (d.left < 30 ? ' warn' : '') + '"><b id="st-left">' + mmss(d.left) + '</b></div></div>');
    d.qs.forEach(function (q, i) {
      h.push('<div class="q"><div class="q-t">' + (i + 1) + '. ' + (q.from ? '<span class="pill">' + esc(q.from) + '</span> ' : '') + '</div>');
      if (q.type === 'blank') {
        h.push('<div class="blank-tpl">' + tplHTMLSelftest(q, d.answers[i] || {}, i) + '</div>');
      } else {
        h.push('<div class="small">' + q.q + '</div><div class="opts">');
        (q.options || []).forEach(function (o) {
          var on = d.answers[i] === o;
          h.push('<label class="opt"><input type="radio" name="sq' + i + '" data-field="schoice" data-q="' + i + '" value="' + esc(o) + '"' + (on ? ' checked' : '') + '> ' + esc(o) + '</label>');
        });
        h.push('</div>');
      }
      h.push('</div>');
    });
    h.push('<button class="btn primary lg mt" data-act="submit-selftest">交卷</button>');
    return h.join('');
  }

  function tplHTMLSelftest(q, vals, qi) {
    var parts = String(q.tpl || '').split(/\[\[(\d+)\]\]/g);
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        var n = parts[i];
        out += '<input class="blank-input" type="text" size="6" data-field="sblank" data-q="' + qi + '" data-b="' + n + '" value="' + esc(vals[n] || '') + '" autocomplete="off">';
      } else out += esc(parts[i]);
    }
    return out;
  }

  function submitSelftest() {
    var st = cur();
    var d = st.data;
    if (!d.qs.length || d.submitted) return;
    var right = 0;
    d.qs.forEach(function (q, i) {
      var ok = false;
      if (q.type === 'blank') {
        ok = (q.answers || []).every(function (a, k) {
          return C.norm((d.answers[i] || {})[k + 1] || '') === C.norm(a);
        });
      } else {
        ok = d.answers[i] === q.correct;
      }
      q._ok = ok;
      if (ok) right++;
    });
    d.submitted = true;
    d.score = { right: right, total: d.qs.length };
    S.setDraft(draft);
    paint();
    window.scrollTo(0, 0);
  }

  function requiz(term) {
    var target = null, ei = -1;
    draft.steps.forEach(function (s) {
      if (s.kind !== 'items' || target) return;
      var idx = (s.data.entries || []).map(function (e) { return e.title; }).indexOf(term);
      if (idx >= 0) { target = s; ei = idx; }
    });
    if (!target) { toast('在这张单子里找不到这条，回到对应步骤手动重看吧。'); return; }
    draft.stepIdx = draft.steps.indexOf(target);
    target.data.ei = ei;
    target.data.entries[ei].ci = 0;
    target.data.entries[ei].done = false;
    target.data.entries[ei].cst = {};
    S.setDraft(draft);
    paint();
    window.scrollTo(0, 0);
  }
  /* ---------------- 交互 ---------------- */

  function paint() {
    if (!root) return;
    var A = window.App;
    if (!A || A.route !== 'preview') return;
    root.innerHTML = draft ? renderRun() : renderSetup(A.temp.courseId);
    bindInputs();
  }

  function saveSoon() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { S.setDraft(draft); }, 350);
  }

  function bindInputs() {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-field]'), function (el) {
      if (el.type === 'radio' || el.type === 'checkbox') el.addEventListener('change', function () { onInput(el); });
      else el.addEventListener('input', function () { onInput(el); });
    });
  }

  function cur() { return draft.steps[draft.stepIdx]; }
  function curEntry() { var st = cur(); return st.data && st.data.entries ? st.data.entries[st.data.ei] : null; }
  function curCard() { var e = curEntry(); return e ? e.cards[e.ci] : null; }
  function csOf(e, c) { return e.cst[c.key] || (e.cst[c.key] = {}); }
  function blk(id) { return draft.blockers.filter(function (x) { return x.id === id; })[0]; }

  function onInput(el) {
    var st = cur(), f = el.dataset.field, v = el.value;
    if (f === 'ck') {
      st.data.done = st.data.done || {};
      st.data.done[el.dataset.i] = !!el.checked;
      saveSoon(); paint(); return;
    }
    if (f === 'mem') {
      var mm = st.data, idx = Number(el.dataset.i || 0);
      var mc = mm.st[idx] || (mm.st[idx] = {});
      mc.input = v; saveSoon(); return;
    }
    if (f === 'qthink' || f === 'qoral') {
      var qq = st.data.qs[st.data.qi];
      var cq = st.data.st[qq.n] || (st.data.st[qq.n] = {});
      if (f === 'qthink') cq.input = v; else cq.oral = v;
      saveSoon(); return;
    }
    if (f === 'cask' || f === 'crecall' || f === 'csum' || f === 'clink') {
      var e = curEntry(); if (!e) return;
      csOf(e, e.cards[e.ci]).input = v;
    } else if (f === 'cblank') {
      var e2 = curEntry(); if (!e2) return;
      var cs2 = csOf(e2, e2.cards[e2.ci]);
      cs2.vals = cs2.vals || {}; cs2.vals[el.dataset.b] = v;
    } else if (f === 'sblank') {
      var q = Number(el.dataset.q);
      st.data.answers[q] = st.data.answers[q] || {};
      st.data.answers[q][el.dataset.b] = v;
    } else if (f === 'schoice') {
      st.data.answers[Number(el.dataset.q)] = v;
    } else if (f === 'prompt') st.data.prompt = v;
    else if (f === 'blockerText') { var b = blk(el.dataset.bid); if (b) b.text = v; }
    else if (f === 'predText') { var p = draft.predictions.filter(function (x) { return x.id === el.dataset.pid; })[0]; if (p) p.text = v; }
    else if (f === 'taskText') draft.classTasks[Number(el.dataset.ti)] = v;
    else if (f === 'repairDep') draft.repair.dep = v;
    else if (f === 'repairItems') draft.repair.items = v;
    saveSoon();
  }

  function nextCard() {
    var st = cur();
    if (st.kind !== 'items') return;
    var e = curEntry();
    if (!e) return;
    if (e.ci < e.cards.length - 1) {
      e.ci++;
    } else {
      e.done = true;
      if (st.data.ei < st.data.entries.length - 1) st.data.ei++;
      else {
        st.status = 'done';
        if (draft.stepIdx < draft.steps.length - 1) { draft.stepIdx++; notice = ''; }
      }
    }
    S.setDraft(draft);
    paint();
    window.scrollTo(0, 0);
  }

  function onClick(ev) {
    var t = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!t) return;
    var A = window.App;
    var act = t.dataset.act;
    if (!act) return;

    if (act === 'pick-course') { A.temp.courseId = t.dataset.id; A.temp.taskId = undefined; A.temp.level = null; paint(); return; }
    if (act === 'pick-mode') { A.temp.mode = t.dataset.id; paint(); return; }
    if (act === 'pick-level') { A.temp.level = t.dataset.id; paint(); return; }
    if (act === 'pick-task') { A.temp.taskId = t.dataset.id || ''; paint(); return; }
    if (act === 'home') { A.go('home'); return; }
    if (act === 'begin') { begin(A); return; }

    if (!draft) return;
    var st = cur();

    if (act === 'coach-next') { nextCard(); return; }

    if (act === 'coach-reveal') {
      var e = curEntry(), c = curCard();
      var cs = csOf(e, c);
      if (c.t === 'ask') cs.revealed = true;
      else cs.revealed = true;
      S.setDraft(draft); paint(); return;
    }
    if (act === 'coach-check-blank') {
      var e2 = curEntry(), c2 = curCard(), cs2 = csOf(e2, c2);
      cs2.checked = true;
      S.setDraft(draft); paint(); return;
    }
    if (act === 'coach-check-recall') {
      var e3 = curEntry(), c3 = curCard(), cs3 = csOf(e3, c3);
      cs3.verdict = C.diff(cs3.input || '', c3.target || '');
      cs3.said = false;
      S.setDraft(draft); paint(); return;
    }
    if (act === 'coach-said') {
      var e4 = curEntry(), c4 = curCard(), cs4 = csOf(e4, c4);
      cs4.verdict = { pct: 100, hit: 0, total: 0, html: '' }; cs4.said = true;
      S.setDraft(draft); paint(); return;
    }
    if (act === 'coach-link-ok') {
      var e5 = curEntry(), c5 = curCard(), cs5 = csOf(e5, c5);
      cs5.ok = true; S.setDraft(draft); paint(); return;
    }
    if (act === 'coach-link-bad') {
      var e6 = curEntry(), c6 = curCard(), cs6 = csOf(e6, c6);
      cs6.ok = false; S.setDraft(draft); paint(); return;
    }
    if (act === 'coach-link-blocker') {
      var e7 = curEntry(), c7 = curCard(), cs7 = csOf(e7, c7);
      cs7.blocked = true;
      draft.blockers.push({ id: S.uid('b'), text: (e7.title || '') + '：关联「' + (c7.title || '') + '」没想通', reason: 'newConcept', from: 'link:' + e7.idx, resolved: null });
      S.setDraft(draft); paint(); return;
    }

    if (act === 'reveal') { st.data.revealed = true; S.setDraft(draft); paint(); return; }

    if (act === 'additem') {
      var inp = root.querySelector('[data-field="addinput"]');
      var v = (inp && inp.value || '').trim();
      if (!v) { toast('先写点什么再加'); return; }
      var e8 = { idx: st.data.entries.length, title: v, detail: '', meta: '', needCheck: false, canOverride: false, kind: st.kindOfItem || 'definition', cards: C.plan(st.kindOfItem || 'definition', { term: v, verbatim: '' }, draft.level), ci: 0, cst: {}, done: false, manual: true };
      st.data.entries.push(e8);
      S.setDraft(draft); paint(); return;
    }

    if (act === 'toblocker') {
      var ei = Number(t.dataset.ei);
      var ent = (st.data && st.data.entries) ? st.data.entries[ei === undefined ? st.data.ei : ei] : null;
      var tag = 'auto:' + st.key + ':' + ei;
      if (draft.blockers.some(function (b) { return b.from === tag; })) return;
      draft.blockers.push({ id: S.uid('b'), text: (ent ? ent.title : '') + '：这条没答上来', reason: 'newConcept', from: tag, resolved: null });
      S.setDraft(draft); paint(); return;
    }
    if (act === 'addblocker') {
      var ni = root.querySelector('[data-field="newblocker"]');
      var tv = (ni && ni.value || '').trim();
      if (!tv) { toast('先写一句卡点'); return; }
      draft.blockers.push({ id: S.uid('b'), text: tv, reason: 'newConcept', from: '', resolved: null });
      S.setDraft(draft); paint(); return;
    }
    if (act === 'delblocker') { draft.blockers = draft.blockers.filter(function (b) { return b.id !== t.dataset.bid; }); S.setDraft(draft); paint(); return; }
    if (act === 'reason') { var bb = blk(t.dataset.bid); if (bb) bb.reason = t.dataset.val; S.setDraft(draft); paint(); return; }
    if (act === 'addpred') {
      var np = root.querySelector('[data-field="newpred"]');
      var pv = (np && np.value || '').trim();
      if (!pv) { toast('先写一句预判'); return; }
      draft.predictions.push({ id: S.uid('p'), text: pv, from: 'me', mark: null });
      S.setDraft(draft); paint(); return;
    }
    if (act === 'delpred') { draft.predictions = draft.predictions.filter(function (p) { return p.id !== t.dataset.pid; }); S.setDraft(draft); paint(); return; }
    if (act === 'addtask') {
      var nt = root.querySelector('[data-field="newtask"]');
      var nv = (nt && nt.value || '').trim();
      if (!nv) { toast('先写一条任务'); return; }
      draft.classTasks.push(nv);
      S.setDraft(draft); paint(); return;
    }
    if (act === 'deltask') { draft.classTasks.splice(Number(t.dataset.ti), 1); S.setDraft(draft); paint(); return; }

    if (act === 'toggle-toc') {
      var lay = root.querySelector('.rd-layout');
      if (lay) lay.classList.toggle('toc-open');
      return;
    }
    if (act === 'to-class-tasks') {
      var qb = ((st.data.reader && st.data.reader.blocks) || []).filter(function (b) { return b.type === 'questions'; })[0];
      if (qb) (qb.items || []).forEach(function (x) { if (draft.classTasks.indexOf(x) < 0) draft.classTasks.push(x); });
      S.setDraft(draft);
      toast('已加入课堂任务清单');
      return;
    }
    if (act === 'mem-check') {
      var md = st.data, mi = md.items[md.i], ms = md.st[md.i] || (md.st[md.i] = {});
      ms.verdict = window.Reader.compare(mi.mode || md.mode, ms.input || '', mi.target || '', mi.keywords || []);
      S.setDraft(draft); paint(); return;
    }
    if (act === 'mem-next') {
      if (st.data.i < st.data.items.length - 1) st.data.i++;
      else { st.status = 'done'; if (draft.stepIdx < draft.steps.length - 1) draft.stepIdx++; }
      S.setDraft(draft); paint(); window.scrollTo(0, 0); return;
    }
    if (act === 'quiz-reveal') { var qa = st.data.qs[st.data.qi]; var ca = st.data.st[qa.n] || (st.data.st[qa.n] = {}); ca.revealed = true; S.setDraft(draft); paint(); return; }
    if (act === 'quiz-ok' || act === 'quiz-bad') {
      var qb = st.data.qs[st.data.qi];
      var cb = st.data.st[qb.n] || (st.data.st[qb.n] = {});
      cb.result = (act === 'quiz-ok') ? 'ok' : 'bad';
      if (cb.result === 'bad') {
        draft.blockers.push({ id: S.uid('b'), text: '课件 p' + qb.page + '：' + String(qb.q || '').slice(0, 60), reason: 'newConcept', from: 'quiz:' + qb.n, resolved: null });
      }
      S.setDraft(draft); paint(); return;
    }
    if (act === 'quiz-next') {
      if (st.data.qi < st.data.qs.length - 1) st.data.qi++;
      else { st.status = 'done'; if (draft.stepIdx < draft.steps.length - 1) draft.stepIdx++; }
      S.setDraft(draft); paint(); window.scrollTo(0, 0); return;
    }
    if (act === 'submit-selftest') { submitSelftest(); return; }
    if (act === 'retest') {
      st.data.submitted = false; st.data.answers = {}; st.data.score = null; st.data.left = 180;
      (st.data.qs || []).forEach(function (q) { delete q._ok; });
      S.setDraft(draft); paint(); window.scrollTo(0, 0); return;
    }
    if (act === 'requiz') { requiz(t.dataset.term); return; }

    if (act === 'goto') {
      var to = Number(t.dataset.idx);
      if (to === draft.stepIdx) return;
      if (to > draft.stepIdx && cur().kind !== 'blocker') markDone(cur());
      draft.stepIdx = to; notice = '';
      S.setDraft(draft); paint(); window.scrollTo(0, 0); return;
    }
    if (act === 'next') {
      markDone(st);
      if (draft.stepIdx < draft.steps.length - 1) draft.stepIdx++;
      else notice = '已经是最后一步了。';
      S.setDraft(draft); paint(); window.scrollTo(0, 0); return;
    }
    if (act === 'prev') { draft.stepIdx = Math.max(0, draft.stepIdx - 1); S.setDraft(draft); paint(); return; }
    if (act === 'skip') {
      st.status = 'skipped';
      draft.blockers.push({ id: S.uid('b'), text: st.title + '：这一步没走完', reason: 'newConcept', from: st.title + '·skip', resolved: null });
      if (draft.stepIdx < draft.steps.length - 1) draft.stepIdx++;
      S.setDraft(draft); paint(); return;
    }
    if (act === 'abort') {
      if (window.confirm('放弃这次预习？写的内容会丢掉，也不会打卡。')) {
        stopTimer(); draft = null; S.clearDraft(); A.temp = {}; A.go('home');
      }
      return;
    }
    if (act === 'finish') { finish(); return; }
  }

  function markDone(st) { if (st.status === 'todo') st.status = 'done'; }

  function begin(A) {
    var course = S.course(A.temp.courseId);
    if (!course) { toast('先选一门课'); return; }
    var lvl = A.temp.level || course.level || 'standard';
    if (lvl === 'quick') lvl = 'standard';
    // 没手动选任务单时，用这门课的第一张（否则会开出一张空流程）
    var taskId = A.temp.taskId;
    if (taskId === undefined) {
      var ts = (window.PREVIEW_TASKS || []).filter(function (t) { return t.course === course.name; });
      taskId = ts.length ? ts[0].id : null;
    }
    draft = buildDraft({
      courseId: course.id, courseName: course.name, credits: course.credits,
      track: course.track, level: lvl, mode: A.temp.mode || 'new',
      taskId: taskId
    });
    S.upsertCourse({ id: course.id, level: lvl });
    S.setDraft(draft);
    notice = '';
    startTimer();
    paint();
    window.scrollTo(0, 0);
  }

  function finish() {
    if (!draft.blockers.length && !draft.predictions.length) { toast('至少留下一条：一条卡点，或者一条预判。'); return; }
    var st = cur();
    markDone(st);
    stopTimer();
    var testStep = draft.steps.filter(function (x) { return x.kind === 'selftest'; })[0];
    var s = {
      id: draft.id, v: 2, courseId: draft.courseId, courseName: draft.courseName, credits: draft.credits,
      track: draft.track, trackName: window.TRACKS[draft.track].name, level: draft.level, mode: draft.mode,
      taskId: draft.taskId, taskTitle: draft.taskTitle, taskChapter: draft.taskChapter, textbook: draft.textbook,
      startedAt: draft.startedAt, finishedAt: Date.now(),
      plannedSecs: draft.plannedSecs, elapsedSecs: draft.totalSpent,
      stepSummary: draft.steps.map(function (x) { return { key: x.key, title: x.title, spent: x.spent, status: x.status }; }),
      blockers: draft.blockers, predictions: draft.predictions, classTasks: draft.classTasks,
      repair: draft.repair,
      selftest: (testStep && testStep.data.submitted) ? { right: testStep.data.score.right, total: testStep.data.score.total } : null,
      readerScores: (function () {
        var out = { recite: [], rewrite: [] };
        draft.steps.forEach(function (x) {
          if (x.kind !== 'recite' && x.kind !== 'rewrite') return;
          (x.data.items || []).forEach(function (it, i) {
            var v = (x.data.st[i] || {}).verdict;
            if (v) out[x.kind].push({ title: it.title, pct: v.pct });
          });
        });
        return out;
      })(),
      classQuiz: (function () {
        var qs = draft.steps.filter(function (x) { return x.kind === 'quiz'; })[0];
        return qs ? qs.data.qs.map(function (x) { return { n: x.n, page: x.page, q: x.q, answer: x.answer, options: x.options || [] }; }) : [];
      })(),
      quizMarks: {},
      verify: null, backfill: null
    };
    S.addSession(s);
    S.clearDraft();
    draft = null;
    window.App.temp = {};
    window.App.go('done', { sessionId: s.id });
  }

  /* ---------------- 计时（只在自测里倒计时） ---------------- */

  function startTimer() {
    stopTimer();
    timer = setInterval(function () {
      if (!draft || window.App.route !== 'preview') return;
      draft.totalSpent += 1;
      var st = draft.steps[draft.stepIdx];
      if (st.kind === 'selftest' && !st.data.submitted && st.data.qs && st.data.qs.length) {
        st.data.left = Math.max(0, st.data.left - 1);
        if (st.data.left <= 0) { submitSelftest(); return; }
      }
      updateClock();
      if (draft.totalSpent % 15 === 0) S.setDraft(draft);
    }, 1000);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function updateClock() {
    if (!root) return;
    var u = root.querySelector('#fl-used'); if (u) u.textContent = mmss(draft.totalSpent);
    var b = root.querySelector('#fl-bar');
    if (b) b.style.width = Math.round(100 * (draft.stepIdx / Math.max(1, draft.steps.length - 1))) + '%';
    var sl = root.querySelector('#st-left');
    if (sl) { var st = draft.steps[draft.stepIdx]; if (st.kind === 'selftest') sl.textContent = mmss(st.data.left); }
  }

  function toast(msg) {
    if (window.App && window.App.toast) window.App.toast(msg); else window.alert(msg);
  }

  window.Flow = {
    mount: function (el) {
      root = el;
      if (!draft) draft = S.getDraft();
      if (draft) startTimer();
      paint();
      if (draft) window.scrollTo(0, 0);
    },
    unmount: function () { stopTimer(); if (draft) S.setDraft(draft); },
    click: onClick,
    hasDraft: function () { return !!draft || !!S.getDraft(); },
    resume: function () { if (!draft) draft = S.getDraft(); if (draft) { startTimer(); window.App.go('preview'); } },
    discard: function () { stopTimer(); draft = null; S.clearDraft(); },
    esc: esc, mmss: mmss,
    __draft: function () { return draft; }
  };
})();
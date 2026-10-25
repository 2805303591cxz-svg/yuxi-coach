/* 预习教练 · 完成页 / 课上验证 / 课后回填 */
(function () {
  var S = window.Store, L = window.LEVELS;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function dstr(ts) { return new Date(ts).toLocaleDateString('zh-CN'); }
  function R() { return window.Review; }

  /* ================= 完成页 ================= */

  function viewDone(id) {
    var s = S.session(id);
    if (!s) return '<div class="card"><div class="empty">找不到这次预习记录。</div></div>';
    var over = s.elapsedSecs > s.plannedSecs;
    var h = [];
    h.push('<div class="card"><div class="card-head"><h2>这次预习完成了</h2><span class="sub">' + dstr(s.finishedAt) + '</span></div>');
    h.push('<div class="stats">' +
      '<div class="stat"><div class="v">' + mmss(s.elapsedSecs) + '</div><div class="k">实际用时（计划 ' + mmss(s.plannedSecs) + '）</div></div>' +
      '<div class="stat"><div class="v">' + (s.blockers || []).length + '</div><div class="k">留下卡点</div></div>' +
      '<div class="stat"><div class="v">' + (s.predictions || []).length + '</div><div class="k">预判</div></div>' +
      '<div class="stat"><div class="v">' + (s.stepSummary || []).filter(function (x) { return x.status === 'skipped'; }).length + '</div><div class="k">跳过的步骤</div></div>' +
      '</div>');
    h.push('<div class="note ' + (over ? 'warn' : 'ok') + ' mt-s">' + (over
      ? '超时了。下次直接切到更低的档位——5 分钟走完也算数，连着做比一次做全重要。'
      : '准时收尾，这就是老师说的「刚开始慢就是快」。连着做几天，速度会自己上来。') + '</div>');
    h.push('</div>');

    h.push('<div class="card"><div class="card-head"><h2>明天上课带这张清单</h2><span class="sub">' + esc(s.courseName) + (s.taskTitle ? ' · ' + esc(s.taskTitle) : '') + '</span></div>');
    h.push('<div class="small"><b>要问 / 要确认</b><ul class="list-reset mt-s">');
    if (!(s.blockers || []).length) h.push('<li class="muted">（没有卡点）</li>');
    (s.blockers || []).forEach(function (b) {
      h.push('<li><span class="pill">问老师</span> ' + esc(b.text) + (b.reason ? ' <span class="tiny faint">· ' + (b.reason === 'newConcept' ? '新概念没懂' : '前置有洞') + '</span>' : '') + '</li>');
    });
    h.push('</ul></div>');
    h.push('<div class="small mt"><b>重点听（我猜老师会讲 / 会考）</b><ul class="list-reset mt-s">');
    if (!(s.predictions || []).length) h.push('<li class="muted">（没有预判）</li>');
    (s.predictions || []).forEach(function (p) { h.push('<li><span class="pill">重点听</span> ' + esc(p.text) + '</li>'); });
    h.push('</ul></div>');
    if ((s.classTasks || []).length) {
      h.push('<div class="small mt"><b>我自己加的</b><ul class="list-reset mt-s">');
      s.classTasks.forEach(function (t) { h.push('<li><span class="pill">任务</span> ' + esc(t) + '</li>'); });
      h.push('</ul></div>');
    }
    if (s.mode === 'repair' && s.repair && (s.repair.dep || s.repair.items)) {
      h.push('<div class="small mt"><b>这个洞的前置依赖</b><div>' + esc(s.repair.dep || '—') + '</div>' +
        '<div class="mt-s"><b>要补的几条</b><div>' + esc(s.repair.items || '—').replace(/\n/g, '<br>') + '</div></div></div>');
    }
    h.push('</div>');

    h.push('<div class="card"><div class="card-head"><h2>接下来</h2></div>' +
      '<div class="small muted mb">预习只完成了一半。老师那节课最强调的是：预习时的自主思考要在课堂上被<b>验证</b>——「老师讲的和我猜的一样吗」。上完课回来勾一下，这件事就算闭环。</div>' +
      '<div class="btn-row"><button class="btn primary" data-app="1" data-act="go-verify">现在去课上验证</button>' +
      '<button class="btn" data-app="1" data-act="print">打印 / 存成 PDF</button>' +
      ((s.blockers || []).length ? '<button class="btn" data-app="1" data-act="send-blockers" data-id="' + s.id + '">把这几个卡点送进错题本</button>' : '') +
      '<button class="btn ghost" data-app="1" data-act="nav-home">回首页</button></div>' +
      '<div class="small faint mt-s">送进错题本后，它出现在「收集」里等整理（定位 → 红笔 → 蓝笔），跟拍照的题走同一条流程。前提是错题本的服务开着。</div></div>');
    return h.join('');
  }
  /* ================= 课上验证 ================= */

  function viewVerify() {
    var list = S.pendingVerify();
    var h = [];
    h.push('<div class="page-title">课上验证</div>');
    h.push('<div class="page-sub">拿出预习时写的那份清单，一边听课一边勾：我猜的和老师讲的一样吗？这一勾，预习多出来的那一遍重复才算真的落地。</div>');
    if (!list.length) {
      h.push('<div class="card"><div class="empty">现在没有待验证的预习。<br>先去做一次预习，上完课再回来。</div></div>');
      return h.join('');
    }
    list.forEach(function (s) {
      h.push('<div class="card"><div class="card-head"><h2>' + esc(s.courseName) + '</h2>' +
        '<span class="sub">' + esc(s.taskTitle || s.taskChapter || '') + ' · ' + dstr(s.finishedAt) + ' 预习</span></div>');
      h.push('<div class="small muted mb">逐条勾选。勾完点最下面的「完成验证」，就可以去课后回填了。</div>');

      if (!(s.predictions || []).length && !(s.blockers || []).length) h.push('<div class="note warn">这次预习没有留下预判和卡点，没什么可验证的。</div>');

      (s.predictions || []).forEach(function (p, i) {
        h.push(markRow(s.id, 'p', i, p.text, p.mark, '预判'));
      });
      (s.blockers || []).forEach(function (b, i) {
        h.push(markRow(s.id, 'b', i, b.text, b.verifyMark, '卡点'));
      });
      if ((s.classQuiz || []).length) {
        h.push('<div class="small mt"><b>课件抢答题 · 课上有没有问</b></div><div class="small muted mb">抢答算平时分，勾一下就知道自己哪几道还没底。</div>');
        s.classQuiz.forEach(function (q) {
          var mk = (s.quizMarks || {})[q.n];
          h.push('<div class="mark-row"><div class="txt"><span class="pill">p' + q.page + '</span> ' + esc(String(q.q || '').slice(0, 90)) + '</div><div class="tri">' +
            [['got', '抢到了'], ['bad', '答错了'], ['none', '老师没问']].map(function (o) {
              return '<button class="' + (mk === o[0] ? 'on m1' : '') + '" data-app="1" data-act="quizmark" data-sid="' + s.id + '" data-n="' + q.n + '" data-val="' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div></div>');
        });
      }

      h.push('<div class="row mt"><input type="text" data-field="vnote" data-sid="' + s.id + '" placeholder="随手记一句：老师怎么讲的、我当时哪里想偏了" value="' + esc(s.verifyNote || '') + '" style="flex:1;min-width:240px"></div>');
      h.push('<div class="btn-row mt"><button class="btn primary" data-app="1" data-act="finish-verify" data-id="' + s.id + '">完成验证</button>' +
        '<button class="btn ghost" data-app="1" data-act="skip-verify" data-id="' + s.id + '">这次不验证</button></div>');
      h.push('</div>');
    });
    return h.join('');
  }

  function markRow(sid, kind, i, text, mark, tag) {
    var opts = [['match', '✓ 和我猜的一样', 'm1'], ['missed', '✗ 老师讲了但我没想到', 'm2'], ['notCovered', '— 老师没讲到', 'm3']];
    return '<div class="mark-row"><div class="txt"><span class="pill">' + tag + '</span> ' + esc(text) + '</div><div class="tri">' +
      opts.map(function (o) {
        return '<button class="' + (mark === o[0] ? 'on ' + o[2] : '') + '" data-app="1" data-act="mark" data-sid="' + sid + '" data-kind="' + kind + '" data-i="' + i + '" data-val="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div></div>';
  }

  function finishVerify(id) {
    var s = S.session(id);
    if (!s) return;
    var marks = (s.predictions || []).map(function (p) { return p.mark; })
      .concat((s.blockers || []).map(function (b) { return b.verifyMark; }))
      .concat(Object.keys(s.quizMarks || {}).map(function (k) { return s.quizMarks[k]; }))
      .filter(Boolean);
    if (!marks.length && !confirm('一条都还没勾，确定要完成验证吗？')) return;
    S.updateSession(id, { verify: { at: Date.now(), notes: s.verifyNote || '' } });
    App.toast('验证完成，接着做课后回填（30 秒）');
    App.go('backfill', { sessionId: id });
  }

  /* ================= 课后回填 ================= */

  function viewBackfill(id) {
    var s = id ? S.session(id) : null;
    if (!s) {
      var pend = S.pendingBackfill();
      if (pend.length) s = pend[0];
    }
    var h = [];
    if (!s) {
      h.push('<div class="page-title">课后回填</div><div class="card"><div class="empty">没有待回填的预习。<br>（先完成课上验证，再回来做这一步。）</div></div>');
      return h.join('');
    }
    h.push('<div class="page-title">课后回填 · 30 秒</div>');
    h.push('<div class="page-sub">' + esc(s.courseName) + (s.taskTitle ? ' · ' + esc(s.taskTitle) : '') + ' · ' + dstr(s.finishedAt) + '</div>');
    h.push('<div class="card"><div class="card-head"><h2>这些卡点现在怎么样了</h2></div>');
    if (!(s.blockers || []).length) h.push('<div class="note">这次没有留下卡点。留意一下是不是「没什么可问」——那通常说明预习还没沉下去。</div>');
    (s.blockers || []).forEach(function (b, i) {
      var opts = [['yes', '已解决'], ['no', '还没解决'], ['wrongbook', '变成错题了']];
      h.push('<div class="mark-row"><div class="txt">' + esc(b.text) +
        (b.reason ? '<div class="tiny faint">' + (b.reason === 'newConcept' ? '新概念没懂' : '前置有洞') + '</div>' : '') + '</div><div class="tri">' +
        opts.map(function (o) {
          return '<button class="' + (b.resolved === o[0] ? 'on m1' : '') + '" data-app="1" data-act="resolve" data-sid="' + s.id + '" data-i="' + i + '" data-val="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div></div>');
    });
    h.push('<div class="row mt"><input type="text" data-field="bnote" data-sid="' + s.id + '" placeholder="再记一句：这次预习值不值？下次改什么？" value="' + esc(s.backfillNote || '') + '" style="flex:1;min-width:240px"></div>');
    h.push('<div class="btn-row mt"><button class="btn primary" data-app="1" data-act="finish-backfill" data-id="' + s.id + '">完成回填</button>' +
      '<button class="btn ghost" data-app="1" data-act="nav-home">先这样，回首页</button></div></div>');
    h.push('<div class="card"><div class="card-head"><h2>预习过程中，哪一步最卡</h2></div><div class="small muted mb">看这个可以判断下次该调档位，还是该换流程。</div><ul class="list-reset">');
    (s.stepSummary || []).forEach(function (x) {
      h.push('<li><b>' + esc(x.title) + '</b><span class="small muted">' + mmss(x.spent) + ' / 计划 ' + (x.status === 'skipped' ? '跳过' : '') + '</span></li>');
    });
    h.push('</ul></div>');
    return h.join('');
  }

  /* ================= 交互 ================= */

  function click(ev) {
    var t = ev.target.closest('[data-act]');
    if (!t) return;
    var act = t.dataset.act, id = t.dataset.id, sid = t.dataset.sid;

    if (act === 'mark') {
      var s = S.session(sid); if (!s) return;
      var arr = t.dataset.kind === 'p' ? s.predictions : s.blockers;
      var item = arr[Number(t.dataset.i)];
      if (!item) return;
      if (t.dataset.kind === 'p') item.mark = t.dataset.val; else item.verifyMark = t.dataset.val;
      S.updateSession(sid, t.dataset.kind === 'p' ? { predictions: s.predictions } : { blockers: s.blockers });
      App.render();
      return;
    }
    if (act === 'resolve') {
      var s2 = S.session(sid); if (!s2) return;
      var b = s2.blockers[Number(t.dataset.i)];
      if (!b) return;
      b.resolved = t.dataset.val;
      S.updateSession(sid, { blockers: s2.blockers });
      App.render();
      return;
    }
    if (act === 'quizmark') {
      var sq = S.session(sid); if (!sq) return;
      sq.quizMarks = sq.quizMarks || {};
      sq.quizMarks[t.dataset.n] = t.dataset.val;
      S.updateSession(sid, { quizMarks: sq.quizMarks });
      App.render();
      return;
    }
    if (act === 'finish-verify') { finishVerify(id); return; }
    if (act === 'skip-verify') {
      var s3 = S.session(id);
      var marks = (s3.predictions || []).map(function (p) { return p.mark; }).concat((s3.blockers || []).map(function (b) { return b.verifyMark; })).filter(Boolean);
      if (marks.length && !confirm('已经勾了一部分，确定跳过剩下的吗？')) return;
      S.updateSession(id, { verify: { at: Date.now(), notes: s3.verifyNote || '', skipped: true } });
      App.render();
      App.toast('已标记为「这次不验证」');
      return;
    }
    if (act === 'finish-backfill') {
      var s4 = S.session(id);
      S.updateSession(id, { backfill: { at: Date.now(), notes: s4.backfillNote || '' } });
      App.go('home');
      App.toast('闭环完成：预习 → 课上验证 → 课后回填 ✔');
      return;
    }
    if (act === 'send-blockers') {
      var s5 = S.session(id);
      if (!s5) return;
      App.toast('正在送进错题本…', 1500);
      window.Bridge.sendBlockers(s5).then(function () {
        App.toast('已送进错题本「收集」（课程：' + s5.courseName + '）', 3000);
      }).catch(function () {
        App.toast('错题本服务没开：先双击桌面「错题本」，再回来点一次', 4000);
      });
      return;
    }
    if (act === 'go-verify') { App.go('verify'); return; }
    if (act === 'nav-home') { App.go('home'); return; }
    if (act === 'print') { window.print(); return; }
  }

  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el.dataset || !el.dataset.field || !el.dataset.sid) return;
    var s = S.session(el.dataset.sid);
    if (!s) return;
    if (el.dataset.field === 'vnote') { s.verifyNote = el.value; S.updateSession(s.id, { verifyNote: el.value }); }
    if (el.dataset.field === 'bnote') { s.backfillNote = el.value; S.updateSession(s.id, { backfillNote: el.value }); }
  });

  window.Review = { viewDone: viewDone, viewVerify: viewVerify, viewBackfill: viewBackfill, click: click };
})();